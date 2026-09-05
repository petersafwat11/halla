/**
 * Native Purchase Queue Orchestration Hook (PR5 / F-08).
 *
 * Guarantees:
 *   1. Account-bound persistence before and during purchase.
 *   2. Exactly one item active at any time.
 *   3. Only exact transaction reconciliation advances the queue.
 *   4. Network loss after store success stays reconciling ("Do not purchase again").
 *   5. Safely resumes on same account, never executes for another account.
 *   6. Clears and invalidates caches on completion, routing to validated origin.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import {
  createPurchaseQueue,
  transitionQueueItem,
  normalizePersistedPurchaseQueue,
  QUEUE_STATUS,
  ITEM_STATUS,
} from "@halaa/shared/schemas/purchaseQueue";
import {
  savePurchaseQueue,
  loadPurchaseQueue,
  clearPurchaseQueue,
} from "../../services/billing/purchaseQueueStorage";
import { purchasePackage } from "../../services/purchases";
import { reconcileExact } from "../../services/billingApi";
import {
  mapReconcileState,
  needsSupportAttention,
  isPurchaseCancelled,
} from "../../services/billing/reconcileState";
import { subscriptionsKeys } from "../subscriptions/keys";
import { addonsKeys } from "../addons/keys";
import { eventsKeys } from "../events/keys";
import useAuthStore from "../../stores/authStore";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function usePurchaseQueue({
  pollAttempts = 12,
  pollDelayMs = 2000,
  pollTimeoutMs = 30000,
} = {}) {
  const queryClient = useQueryClient();
  const billingUserId = useAuthStore((state) => state.user?.billingUserId || null);

  const [queue, setQueue] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const inFlightRef = useRef(false);
  const queueRef = useRef(null);

  const setCurrentQueue = useCallback((nextQueue) => {
    queueRef.current = nextQueue;
    setQueue(nextQueue);
  }, []);

  const persistQueue = useCallback(async (nextQueue, { retainOnFailure = false } = {}) => {
    try {
      await savePurchaseQueue(nextQueue.billingUserId, nextQueue);
    } catch (error) {
      // Once the native store has been invoked, retaining the most advanced
      // in-memory state is safer than showing an earlier, purchasable state.
      // Persistence still rejects so the caller can warn the user.
      if (retainOnFailure) setCurrentQueue(nextQueue);
      throw error;
    }
    setCurrentQueue(nextQueue);
    return nextQueue;
  }, [setCurrentQueue]);

  const markBillingCachesStale = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });
    queryClient.invalidateQueries({ queryKey: addonsKeys.all });
    queryClient.invalidateQueries({ queryKey: eventsKeys.all });
    queryClient.invalidateQueries({ queryKey: eventsKeys.subscriptionInfo() });
  }, [queryClient]);

  // Load persisted queue on mount or user change
  useEffect(() => {
    if (!billingUserId) {
      setCurrentQueue(null);
      return;
    }
    let isMounted = true;
    (async () => {
      const persisted = await loadPurchaseQueue(billingUserId);
      if (isMounted && persisted) {
        const resumable = normalizePersistedPurchaseQueue(persisted);
        const wasInterrupted =
          persisted.status === QUEUE_STATUS.IN_PROGRESS &&
          persisted.items[persisted.currentIndex]?.status === ITEM_STATUS.PURCHASING;
        if (wasInterrupted) {
          try {
            await savePurchaseQueue(billingUserId, resumable);
          } catch (error) {
            // Keep the in-memory state safe even when storage is temporarily
            // unavailable. The next launch will normalize it again and will
            // never automatically charge the interrupted item a second time.
            Sentry.captureException(error, {
              tags: { area: "purchase_queue", operation: "resume_persist" },
            });
          }
        }
        if (isMounted) setCurrentQueue(resumable);
      }
    })().catch((error) => {
      Sentry.captureException(error, {
        tags: { area: "purchase_queue", operation: "resume" },
      });
    });
    return () => {
      isMounted = false;
    };
  }, [billingUserId, setCurrentQueue]);

  const pollExactReconcile = useCallback(
    async (args) => {
      let last = { state: "pending", reason: "awaiting_webhook" };
      const deadline = Date.now() + pollTimeoutMs;

      for (let i = 0; i < pollAttempts; i += 1) {
        try {
          last = await reconcileExact(args);
        } catch (error) {
          last = {
            state: "pending",
            reason: "reconcile_unavailable",
            errorCode: error?.code || error?.name || "RECONCILE_REQUEST_FAILED",
            httpStatus: error?.status || null,
          };
        }
        const m = mapReconcileState(last && last.state);
        if (m.terminal) break;
        if (i >= pollAttempts - 1 || Date.now() >= deadline) break;
        await sleep(Math.min(pollDelayMs, Math.max(0, deadline - Date.now())));
      }
      return last;
    },
    [pollAttempts, pollDelayMs, pollTimeoutMs]
  );

  /**
   * Initializes and persists a new purchase queue.
   */
  const startQueue = useCallback(
    async ({ origin, items }) => {
      if (!billingUserId) {
        throw new Error("User must have billingUserId to start purchase queue");
      }
      const newQueue = createPurchaseQueue({
        billingUserId,
        origin,
        items,
      });

      return persistQueue(newQueue);
    },
    [billingUserId, persistQueue]
  );

  /**
   * Purchases the current pending item in the queue.
   */
  const purchaseCurrentItem = useCallback(
    async (pkg, changeInfo = null, { preflight = null, deferred = false } = {}) => {
      const activeQueue = queueRef.current;
      if (inFlightRef.current || !activeQueue || activeQueue.status !== QUEUE_STATUS.IN_PROGRESS) {
        return activeQueue;
      }
      const currentIndex = activeQueue.currentIndex;
      const item = activeQueue.items[currentIndex];
      if (!item || item.status !== ITEM_STATUS.PENDING) {
        return activeQueue;
      }

      inFlightRef.current = true;
      setIsBusy(true);

      let currentQueue = activeQueue;

      try {
        // Eligibility is checked immediately before opening the native store.
        // A failed preflight is terminal for this queue attempt, but no charge
        // has been started and the user may safely begin a fresh attempt.
        if (preflight) {
          let result;
          try {
            result = await preflight();
          } catch {
            result = { eligible: false, reason: "preflight_unavailable" };
          }
          if (!result?.eligible) {
            currentQueue = transitionQueueItem(currentQueue, currentIndex, ITEM_STATUS.FAILED, {
              error: `preflight_${result?.reason || "ineligible"}`,
            });
            await persistQueue(currentQueue);
            return currentQueue;
          }
        }

        // Step 1: Transition item to PURCHASING
        currentQueue = transitionQueueItem(currentQueue, currentIndex, ITEM_STATUS.PURCHASING);
        await persistQueue(currentQueue);

        // Step 2: Native store purchase
        let purchaseResult;
        try {
          purchaseResult = await purchasePackage(pkg, changeInfo || null);
        } catch (err) {
          if (isPurchaseCancelled(err)) {
            currentQueue = transitionQueueItem(currentQueue, currentIndex, ITEM_STATUS.CANCELLED, {
              error: "cancelled_by_user",
            });
            await persistQueue(currentQueue, { retainOnFailure: true });
            return currentQueue;
          }
          currentQueue = transitionQueueItem(currentQueue, currentIndex, ITEM_STATUS.FAILED, {
            error: err?.code || err?.name || "purchase_failed",
          });
          await persistQueue(currentQueue, { retainOnFailure: true });
          return currentQueue;
        }

        const transactionId = purchaseResult.transactionId || null;
        const storeProductId = purchaseResult.storeProductId || null;

        if (!transactionId || !storeProductId) {
          currentQueue = transitionQueueItem(currentQueue, currentIndex, ITEM_STATUS.MANUAL_REVIEW, {
            transactionId,
            storeProductId,
            error: "transaction_identity_missing",
          });
          await persistQueue(currentQueue, { retainOnFailure: true });
          return currentQueue;
        }

        // A deferred subscription downgrade is accepted by the store now but
        // becomes active only at renewal. Do not poll for an entitlement that
        // correctly does not exist yet, and do not describe it as active.
        if (deferred) {
          currentQueue = transitionQueueItem(currentQueue, currentIndex, ITEM_STATUS.SCHEDULED, {
            transactionId,
            storeProductId,
            reconcile: { state: "scheduled", reason: "deferred_change" },
          });
          await persistQueue(currentQueue, { retainOnFailure: true });
          markBillingCachesStale();
          return currentQueue;
        }

        // Step 3: Transition to RECONCILING with exact store transaction identity
        currentQueue = transitionQueueItem(currentQueue, currentIndex, ITEM_STATUS.RECONCILING, {
          transactionId,
          storeProductId,
        });
        await persistQueue(currentQueue, { retainOnFailure: true });

        // Step 4: Reconcile exact transaction
        const reconcileArgs = {
          catalogCode: item.catalogCode,
          transactionId,
          storeProductId,
          operation: item.operation,
        };

        const finalReconcile = await pollExactReconcile(reconcileArgs);
        markBillingCachesStale();

        const mapped = mapReconcileState(finalReconcile?.state);

        if (mapped.success) {
          // Advance to FULFILLED
          currentQueue = transitionQueueItem(currentQueue, currentIndex, ITEM_STATUS.FULFILLED, {
            reconcile: finalReconcile,
          });
          await persistQueue(currentQueue, { retainOnFailure: true });
          return currentQueue;
        }

        if (needsSupportAttention(finalReconcile?.state)) {
          currentQueue = transitionQueueItem(currentQueue, currentIndex, ITEM_STATUS.MANUAL_REVIEW, {
            reconcile: finalReconcile,
          });
          await persistQueue(currentQueue, { retainOnFailure: true });
          return currentQueue;
        }

        if (mapped.terminal) {
          currentQueue = transitionQueueItem(currentQueue, currentIndex, ITEM_STATUS.FAILED, {
            reconcile: finalReconcile,
            error: finalReconcile?.state || "reconcile_failed",
          });
          await persistQueue(currentQueue, { retainOnFailure: true });
          return currentQueue;
        }

        // Still pending or network dropped: stay in RECONCILING
        // Never report false success or advance to next item
        return currentQueue;
      } finally {
        inFlightRef.current = false;
        setIsBusy(false);
      }
    },
    [persistQueue, pollExactReconcile, markBillingCachesStale]
  );

  /**
   * Retries reconciliation of the current item (when in RECONCILING status).
   * Does NOT make a second store purchase.
   */
  const retryReconcileCurrentItem = useCallback(async () => {
    const activeQueue = queueRef.current;
    if (inFlightRef.current || !activeQueue) return activeQueue;
    const currentIndex = activeQueue.currentIndex;
    const item = activeQueue.items[currentIndex];
    if (!item || item.status !== ITEM_STATUS.RECONCILING) return activeQueue;

    inFlightRef.current = true;
    setIsBusy(true);

    try {
      const reconcileArgs = {
        catalogCode: item.catalogCode,
        transactionId: item.transactionId,
        storeProductId: item.storeProductId,
        operation: item.operation,
      };

      const finalReconcile = await pollExactReconcile(reconcileArgs);
      markBillingCachesStale();

      const mapped = mapReconcileState(finalReconcile?.state);
      let updatedQueue = activeQueue;

      if (mapped.success) {
        updatedQueue = transitionQueueItem(updatedQueue, currentIndex, ITEM_STATUS.FULFILLED, {
          reconcile: finalReconcile,
        });
        await persistQueue(updatedQueue, { retainOnFailure: true });
      } else if (needsSupportAttention(finalReconcile?.state)) {
        updatedQueue = transitionQueueItem(updatedQueue, currentIndex, ITEM_STATUS.MANUAL_REVIEW, {
          reconcile: finalReconcile,
        });
        await persistQueue(updatedQueue, { retainOnFailure: true });
      } else if (mapped.terminal) {
        updatedQueue = transitionQueueItem(updatedQueue, currentIndex, ITEM_STATUS.FAILED, {
          reconcile: finalReconcile,
          error: finalReconcile?.state || "reconcile_failed",
        });
        await persistQueue(updatedQueue, { retainOnFailure: true });
      }
      return updatedQueue;
    } finally {
      inFlightRef.current = false;
      setIsBusy(false);
    }
  }, [persistQueue, pollExactReconcile, markBillingCachesStale]);

  /**
   * Explicitly cancel remaining queue.
   */
  const cancelQueue = useCallback(async () => {
    const activeQueue = queueRef.current;
    if (!activeQueue) return;
    const currentIndex = activeQueue.currentIndex;
    const currentItem = activeQueue.items[currentIndex];
    if (currentItem?.status !== ITEM_STATUS.PENDING) {
      setCurrentQueue(null);
      await clearPurchaseQueue(activeQueue.billingUserId);
      return;
    }
    const updated = transitionQueueItem(activeQueue, currentIndex, ITEM_STATUS.CANCELLED, {
      error: "cancelled_by_user",
    });
    await persistQueue(updated);
  }, [persistQueue, setCurrentQueue]);

  const resetQueue = useCallback(async () => {
    setCurrentQueue(null);
    if (billingUserId) {
      await clearPurchaseQueue(billingUserId);
    }
  }, [billingUserId, setCurrentQueue]);

  const currentIndex = queue?.currentIndex ?? 0;
  const currentItem = queue?.items?.[currentIndex] || null;
  const totalItems = queue?.items?.length ?? 0;
  const isQueueMode = Boolean(queue && queue.status === QUEUE_STATUS.IN_PROGRESS);

  return {
    queue,
    currentItem,
    currentIndex,
    totalItems,
    isQueueMode,
    isBusy,
    startQueue,
    purchaseCurrentItem,
    retryReconcileCurrentItem,
    cancelQueue,
    resetQueue,
  };
}

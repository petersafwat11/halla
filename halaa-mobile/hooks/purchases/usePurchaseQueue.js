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
import { mapReconcileState, isPurchaseCancelled } from "../../services/billing/reconcileState";
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

  const markBillingCachesStale = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });
    queryClient.invalidateQueries({ queryKey: addonsKeys.all });
    queryClient.invalidateQueries({ queryKey: eventsKeys.all });
    queryClient.invalidateQueries({ queryKey: eventsKeys.subscriptionInfo() });
  }, [queryClient]);

  // Load persisted queue on mount or user change
  useEffect(() => {
    if (!billingUserId) {
      setQueue(null);
      return;
    }
    let isMounted = true;
    (async () => {
      const persisted = await loadPurchaseQueue(billingUserId);
      if (isMounted && persisted) {
        if (persisted.status === QUEUE_STATUS.IN_PROGRESS) {
          setQueue(persisted);
        } else if (persisted.status === QUEUE_STATUS.COMPLETED || persisted.status === QUEUE_STATUS.CANCELLED) {
          await clearPurchaseQueue(billingUserId);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [billingUserId]);

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

      await savePurchaseQueue(billingUserId, newQueue);
      setQueue(newQueue);
      return newQueue;
    },
    [billingUserId]
  );

  /**
   * Purchases the current pending item in the queue.
   */
  const purchaseCurrentItem = useCallback(
    async (pkg, changeInfo = null) => {
      if (inFlightRef.current || !queue || queue.status !== QUEUE_STATUS.IN_PROGRESS) {
        return queue;
      }
      const currentIndex = queue.currentIndex;
      const item = queue.items[currentIndex];
      if (!item || item.status !== ITEM_STATUS.PENDING) {
        return queue;
      }

      inFlightRef.current = true;
      setIsBusy(true);

      let currentQueue = queue;

      try {
        // Step 1: Transition item to PURCHASING
        currentQueue = transitionQueueItem(currentQueue, currentIndex, ITEM_STATUS.PURCHASING);
        setQueue(currentQueue);
        await savePurchaseQueue(billingUserId, currentQueue);

        // Step 2: Native store purchase
        let purchaseResult;
        try {
          purchaseResult = await purchasePackage(pkg, changeInfo || null);
        } catch (err) {
          if (isPurchaseCancelled(err)) {
            currentQueue = transitionQueueItem(currentQueue, currentIndex, ITEM_STATUS.CANCELLED, {
              error: "cancelled_by_user",
            });
            setQueue(currentQueue);
            await savePurchaseQueue(billingUserId, currentQueue);
            return currentQueue;
          }
          currentQueue = transitionQueueItem(currentQueue, currentIndex, ITEM_STATUS.FAILED, {
            error: err?.message || "purchase_failed",
          });
          setQueue(currentQueue);
          await savePurchaseQueue(billingUserId, currentQueue);
          return currentQueue;
        }

        const transactionId = purchaseResult.transactionId || null;
        const storeProductId = purchaseResult.storeProductId || null;

        // Step 3: Transition to RECONCILING with store transaction ID
        currentQueue = transitionQueueItem(currentQueue, currentIndex, ITEM_STATUS.RECONCILING, {
          transactionId,
          storeProductId,
        });
        setQueue(currentQueue);
        await savePurchaseQueue(billingUserId, currentQueue);

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
          setQueue(currentQueue);

          if (currentQueue.status === QUEUE_STATUS.COMPLETED) {
            await clearPurchaseQueue(billingUserId);
          } else {
            await savePurchaseQueue(billingUserId, currentQueue);
          }
          return currentQueue;
        }

        if (finalReconcile?.state === "manual_review") {
          currentQueue = transitionQueueItem(currentQueue, currentIndex, ITEM_STATUS.MANUAL_REVIEW, {
            reconcile: finalReconcile,
          });
          setQueue(currentQueue);
          await savePurchaseQueue(billingUserId, currentQueue);
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
    [queue, billingUserId, pollExactReconcile, markBillingCachesStale]
  );

  /**
   * Retries reconciliation of the current item (when in RECONCILING status).
   * Does NOT make a second store purchase.
   */
  const retryReconcileCurrentItem = useCallback(async () => {
    if (inFlightRef.current || !queue) return queue;
    const currentIndex = queue.currentIndex;
    const item = queue.items[currentIndex];
    if (!item || item.status !== ITEM_STATUS.RECONCILING) return queue;

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
      let updatedQueue = queue;

      if (mapped.success) {
        updatedQueue = transitionQueueItem(updatedQueue, currentIndex, ITEM_STATUS.FULFILLED, {
          reconcile: finalReconcile,
        });
        setQueue(updatedQueue);

        if (updatedQueue.status === QUEUE_STATUS.COMPLETED) {
          await clearPurchaseQueue(billingUserId);
        } else {
          await savePurchaseQueue(billingUserId, updatedQueue);
        }
      }
      return updatedQueue;
    } finally {
      inFlightRef.current = false;
      setIsBusy(false);
    }
  }, [queue, billingUserId, pollExactReconcile, markBillingCachesStale]);

  /**
   * Explicitly cancel remaining queue.
   */
  const cancelQueue = useCallback(async () => {
    if (!queue) return;
    const currentIndex = queue.currentIndex;
    const updated = transitionQueueItem(queue, currentIndex, ITEM_STATUS.CANCELLED, {
      error: "cancelled_by_user",
    });
    setQueue(updated);
    await clearPurchaseQueue(billingUserId);
  }, [queue, billingUserId]);

  const resetQueue = useCallback(async () => {
    setQueue(null);
    if (billingUserId) {
      await clearPurchaseQueue(billingUserId);
    }
  }, [billingUserId]);

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

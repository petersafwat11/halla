/**
 * Native purchase orchestration (MOB-01 · §2/§3/§4). One place that ties the
 * store purchase to the EXACT backend reconciliation:
 *
 *   guard canPurchase → (optional) preflight → purchasePackage(+change) →
 *   poll reconcile-exact to a deterministic state.
 *
 * Rules enforced here:
 *   - success ONLY when the EXACT attempted item reconciles to
 *     active|fulfilled|consumed (never generic access — P0-02);
 *   - `pending` keeps polling to a bounded cap, then a refreshable pending
 *     state (never false success, never hard-fail);
 *   - a store cancellation is not an error;
 *   - idempotent: duplicate taps while a run is in flight are ignored.
 */

import { useCallback, useRef, useState } from "react";
import * as Sentry from "@sentry/react-native";
import { purchasePackage } from "../../services/purchases";
import { reconcileExact } from "../../services/billingApi";
import { mapReconcileState, isPurchaseCancelled } from "../../services/billing/reconcileState";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BUSY_PHASES = new Set(["preflight", "purchasing", "reconciling"]);
const IDLE = { phase: "idle" };

const addFlowBreadcrumb = (phase, data = {}, level = "info") => {
  try {
    Sentry.addBreadcrumb({
      category: "purchase.flow",
      message: phase,
      level,
      // Deliberately excludes transaction ids, receipts, customer info, and
      // store credentials. These fields are safe operational diagnostics.
      data: {
        phase,
        state: data.state || null,
        reason: data.reason || null,
        attempt: data.attempt || null,
        errorCode: data.errorCode || null,
        httpStatus: data.httpStatus || null,
      },
    });
  } catch (_) {
    // Telemetry must never interfere with a purchase.
  }
};

/**
 * @returns {{
 *   status: object,
 *   isBusy: boolean,
 *   run: (opts: object) => Promise<object>,
 *   refresh: () => Promise<object>,
 *   reset: () => void,
 * }}
 */
export function usePurchaseFlow({
  pollAttempts = 12,
  pollDelayMs = 2000,
  pollTimeoutMs = 30000,
} = {}) {
  const [status, setStatus] = useState(IDLE);
  const inFlight = useRef(false);
  const lastArgs = useRef(null); // { catalogCode, transactionId, storeProductId, operation }

  const pollExact = useCallback(
    async (args, attempts, delayMs) => {
      let last = { state: "pending", reason: "awaiting_webhook" };
      const deadline = Date.now() + pollTimeoutMs;
      for (let i = 0; i < attempts; i += 1) {
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
        const next = { phase: "reconciling", state: last && last.state, reason: last && last.reason, attempt: i + 1, reconcile: last };
        setStatus(next);
        addFlowBreadcrumb("reconciling", {
          ...next,
          errorCode: last?.errorCode,
          httpStatus: last?.httpStatus,
        }, last?.reason === "reconcile_unavailable" ? "warning" : "info");
        if (m.terminal) break;
        if (i >= attempts - 1 || Date.now() >= deadline) break;
        await sleep(Math.min(delayMs, Math.max(0, deadline - Date.now())));
      }
      return last;
    },
    [pollTimeoutMs]
  );

  /**
   * @param {object} opts
   * @param {object} opts.entry     store catalog entry (has internalCode)
   * @param {object} opts.pkg       resolved RevenueCat package
   * @param {string} [opts.operation] purchase|change|addon|restore
   * @param {object} [opts.changeInfo] Android { oldProductIdentifier, replacementMode }
   * @param {Function} [opts.preflight] async () => { eligible, reason, ... }
   * @param {boolean} [opts.deferred] true for a downgrade that takes effect at the
   *   next renewal — the NEW product won't be active now, so we DON'T poll
   *   reconcile-exact (it would pend forever); we report a "scheduled" success.
   */
  const run = useCallback(
    async ({ entry, pkg, operation = "purchase", changeInfo = null, preflight = null, deferred = false }) => {
      if (inFlight.current) return status; // idempotent — ignore duplicate taps
      if (!entry || !pkg) {
        const s = { phase: "error", reason: "unavailable" };
        setStatus(s);
        return s;
      }
      inFlight.current = true;
      try {
        if (preflight) {
          setStatus({ phase: "preflight" });
          let pf;
          try {
            pf = await preflight();
          } catch {
            pf = { eligible: false, reason: "preflight_failed" };
          }
          if (!pf || !pf.eligible) {
            const s = { phase: "blocked", preflight: pf || { eligible: false, reason: "ineligible" } };
            setStatus(s);
            return s;
          }
        }

        setStatus({ phase: "purchasing" });
        addFlowBreadcrumb("purchasing");
        let result;
        try {
          result = await purchasePackage(pkg, changeInfo || null);
        } catch (err) {
          if (isPurchaseCancelled(err)) {
            const s = { phase: "cancelled" };
            setStatus(s);
            return s;
          }
          const s = { phase: "error", reason: (err && err.message) || "purchase_failed" };
          addFlowBreadcrumb("purchase_error", {
            reason: "purchase_failed",
            errorCode: err?.code || err?.name || null,
          }, "error");
          setStatus(s);
          return s;
        }

        // A deferred change (downgrade at renewal) succeeds immediately at the
        // store but the NEW product is not active yet — reconcile-exact would
        // pend until renewal. Report it as scheduled instead of polling.
        if (deferred) {
          const s = { phase: "done", state: "scheduled", deferred: true, result };
          setStatus(s);
          return s;
        }

        const args = {
          catalogCode: entry.internalCode,
          transactionId: result.transactionId || null,
          storeProductId: result.storeProductId || null,
          operation,
        };
        lastArgs.current = args;

        setStatus({ phase: "reconciling", state: "pending", attempt: 0 });
        addFlowBreadcrumb("reconcile_started", { state: "pending" });
        const final = await pollExact(args, pollAttempts, pollDelayMs);
        const s = { phase: "done", state: final && final.state, reason: final && final.reason, reconcile: final, result };
        setStatus(s);
        return s;
      } finally {
        inFlight.current = false;
      }
    },
    [status, pollExact, pollAttempts, pollDelayMs]
  );

  /** User-triggered re-check of the last attempt (moves pending → terminal). */
  const refresh = useCallback(async () => {
    if (inFlight.current || !lastArgs.current) return status;
    inFlight.current = true;
    try {
      setStatus((s) => ({ ...s, phase: "reconciling" }));
      const final = await pollExact(lastArgs.current, Math.min(4, pollAttempts), pollDelayMs);
      const s = { phase: "done", state: final && final.state, reason: final && final.reason, reconcile: final };
      setStatus(s);
      return s;
    } finally {
      inFlight.current = false;
    }
  }, [status, pollExact, pollAttempts, pollDelayMs]);

  const reset = useCallback(() => {
    lastArgs.current = null;
    setStatus(IDLE);
  }, []);

  return { status, isBusy: BUSY_PHASES.has(status.phase), run, refresh, reset };
}

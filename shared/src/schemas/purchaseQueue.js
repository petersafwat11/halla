import { z } from "zod";
import { parseCompletionDestination } from "./completionDestination.js";

/**
 * Account-bound Native Purchase Queue Contract (PR5 / F-08).
 *
 * Enforces:
 *   - Exactly one item may be active (purchasing or reconciling) at any time.
 *   - Only exact reconciliation (fulfilled) advances the queue.
 *   - Stored queue is strictly account-bound (billingUserId).
 *   - No receipt or sensitive PII payload is stored locally.
 */

export const QUEUE_STATUS = Object.freeze({
  IDLE: "idle",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  FAILED: "failed",
  MANUAL_REVIEW: "manual_review",
});

export const ITEM_STATUS = Object.freeze({
  PENDING: "pending",
  PURCHASING: "purchasing",
  RECONCILING: "reconciling",
  FULFILLED: "fulfilled",
  CANCELLED: "cancelled",
  MANUAL_REVIEW: "manual_review",
  FAILED: "failed",
});

const ALLOWED_ITEM_TRANSITIONS = Object.freeze({
  [ITEM_STATUS.PENDING]: [ITEM_STATUS.PURCHASING, ITEM_STATUS.CANCELLED],
  [ITEM_STATUS.PURCHASING]: [ITEM_STATUS.RECONCILING, ITEM_STATUS.CANCELLED, ITEM_STATUS.FAILED],
  [ITEM_STATUS.RECONCILING]: [ITEM_STATUS.FULFILLED, ITEM_STATUS.MANUAL_REVIEW, ITEM_STATUS.FAILED],
  [ITEM_STATUS.FULFILLED]: [],
  [ITEM_STATUS.CANCELLED]: [],
  [ITEM_STATUS.MANUAL_REVIEW]: [],
  [ITEM_STATUS.FAILED]: [ITEM_STATUS.PENDING], // Allow retry from failed if applicable
});

export const queueItemSchema = z.object({
  id: z.string().min(1),
  catalogCode: z.string().min(1),
  kind: z.enum(["plan", "addon"]),
  nameAr: z.string().optional().default(""),
  nameEn: z.string().optional().default(""),
  status: z.enum([
    ITEM_STATUS.PENDING,
    ITEM_STATUS.PURCHASING,
    ITEM_STATUS.RECONCILING,
    ITEM_STATUS.FULFILLED,
    ITEM_STATUS.CANCELLED,
    ITEM_STATUS.MANUAL_REVIEW,
    ITEM_STATUS.FAILED,
  ]),
  priceString: z.string().nullable().optional(),
  transactionId: z.string().nullable().optional(),
  storeProductId: z.string().nullable().optional(),
  operation: z.enum(["purchase", "change", "addon"]).default("purchase"),
  reconcile: z.any().nullable().optional(),
  error: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const purchaseQueueSchema = z.object({
  version: z.literal(1).default(1),
  billingUserId: z.string().min(1),
  origin: z.any(),
  status: z.enum([
    QUEUE_STATUS.IDLE,
    QUEUE_STATUS.IN_PROGRESS,
    QUEUE_STATUS.COMPLETED,
    QUEUE_STATUS.CANCELLED,
    QUEUE_STATUS.FAILED,
    QUEUE_STATUS.MANUAL_REVIEW,
  ]),
  currentIndex: z.number().int().nonnegative().default(0),
  items: z.array(queueItemSchema).min(1),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * Creates a new account-bound purchase queue.
 */
export function createPurchaseQueue({ billingUserId, origin, items = [] }) {
  if (!billingUserId || typeof billingUserId !== "string") {
    throw new Error("billingUserId is required and must be a string");
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Purchase queue must contain at least one item");
  }

  const now = new Date().toISOString();
  const queueItems = items.map((it, idx) => ({
    id: it.id || `item_${idx}_${it.catalogCode || "unknown"}`,
    catalogCode: it.catalogCode || it.code,
    kind: it.kind || (it.catalogType === "addon" ? "addon" : "plan"),
    nameAr: it.nameAr || "",
    nameEn: it.nameEn || "",
    status: ITEM_STATUS.PENDING,
    priceString: it.priceString || null,
    transactionId: null,
    storeProductId: it.storeProductId || null,
    operation: it.operation || (it.kind === "addon" ? "addon" : "purchase"),
    reconcile: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  }));

  const queue = {
    version: 1,
    billingUserId: billingUserId.trim(),
    origin: parseCompletionDestination(origin),
    status: QUEUE_STATUS.IN_PROGRESS,
    currentIndex: 0,
    items: queueItems,
    createdAt: now,
    updatedAt: now,
  };

  return purchaseQueueSchema.parse(queue);
}

/**
 * Transitions a queue item to a new status.
 */
export function transitionQueueItem(queue, itemIndex, nextStatus, patch = {}) {
  if (!queue || !Array.isArray(queue.items) || itemIndex < 0 || itemIndex >= queue.items.length) {
    throw new Error("Invalid queue or itemIndex");
  }

  const currentItem = queue.items[itemIndex];
  const allowed = ALLOWED_ITEM_TRANSITIONS[currentItem.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Cannot transition queue item from '${currentItem.status}' to '${nextStatus}'`);
  }

  // Active check: ensure only one item is active (purchasing or reconciling)
  if (nextStatus === ITEM_STATUS.PURCHASING || nextStatus === ITEM_STATUS.RECONCILING) {
    const anotherActive = queue.items.some(
      (it, idx) => idx !== itemIndex && (it.status === ITEM_STATUS.PURCHASING || it.status === ITEM_STATUS.RECONCILING)
    );
    if (anotherActive) {
      throw new Error("Invariant violated: only one queue item may be active at any time");
    }
  }

  const now = new Date().toISOString();
  const updatedItem = {
    ...currentItem,
    ...patch,
    status: nextStatus,
    updatedAt: now,
  };

  const newItems = [...queue.items];
  newItems[itemIndex] = updatedItem;

  let newQueueStatus = queue.status;
  let newCurrentIndex = queue.currentIndex;

  if (nextStatus === ITEM_STATUS.FULFILLED) {
    if (itemIndex + 1 < newItems.length) {
      newCurrentIndex = itemIndex + 1;
      newQueueStatus = QUEUE_STATUS.IN_PROGRESS;
    } else {
      newQueueStatus = QUEUE_STATUS.COMPLETED;
    }
  } else if (nextStatus === ITEM_STATUS.CANCELLED) {
    newQueueStatus = QUEUE_STATUS.CANCELLED;
  } else if (nextStatus === ITEM_STATUS.FAILED) {
    newQueueStatus = QUEUE_STATUS.FAILED;
  } else if (nextStatus === ITEM_STATUS.MANUAL_REVIEW) {
    newQueueStatus = QUEUE_STATUS.MANUAL_REVIEW;
  }

  const updatedQueue = {
    ...queue,
    items: newItems,
    currentIndex: newCurrentIndex,
    status: newQueueStatus,
    updatedAt: now,
  };

  return purchaseQueueSchema.parse(updatedQueue);
}

/**
 * Sanitizes queue object for local storage:
 * Guarantees no receipt, token, auth payload, or sensitive PII is stored.
 */
export function sanitizeQueueForStorage(queue) {
  if (!queue) return null;
  const parsed = purchaseQueueSchema.parse(queue);

  return {
    version: parsed.version,
    billingUserId: parsed.billingUserId,
    origin: parsed.origin,
    status: parsed.status,
    currentIndex: parsed.currentIndex,
    items: parsed.items.map((it) => ({
      id: it.id,
      catalogCode: it.catalogCode,
      kind: it.kind,
      nameAr: it.nameAr,
      nameEn: it.nameEn,
      status: it.status,
      priceString: it.priceString,
      transactionId: it.transactionId,
      storeProductId: it.storeProductId,
      operation: it.operation,
      reconcile: it.reconcile ? { state: it.reconcile.state, reason: it.reconcile.reason } : null,
      error: it.error ? String(it.error).slice(0, 200) : null,
      createdAt: it.createdAt,
      updatedAt: it.updatedAt,
    })),
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  };
}

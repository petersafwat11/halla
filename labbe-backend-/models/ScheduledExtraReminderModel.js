/**
 * ScheduledExtraReminder
 *
 * One row per "Schedule extra reminder" request made by an event owner (host or
 * whitelabel business) or a platform admin acting on their behalf. The
 * dispatcher cron (scheduledTasks.scheduleExtraReminderDispatcher) polls
 * pending rows whose `scheduledFor` is due and atomically claims them
 * (pending → running) before sending the chosen Taqnyat template to each
 * guest in `guestIds`. Quota is reserved at create time on
 * `Subscription.remindersReserved` and moved to `remindersConsumed` per
 * successful send (failed/rateLimited sends are refunded).
 *
 * Status flow: pending → running → (sent | partial | failed); cancelled
 * is set by a successful cancel() before the dispatcher claims the row.
 */

const mongoose = require('mongoose');

const detailSchema = new mongoose.Schema(
  {
    guestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest', required: true },
    success: { type: Boolean },
    messageId: { type: String },
    error: { type: String },
    rateLimited: { type: Boolean, default: false },
  },
  { _id: false }
);

const scheduledExtraReminderSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true,
      index: true,
    },
    // Event owner (host) — whose quota is consumed.
    eventOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdBy: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      role: { type: String, required: true },
      // True when actor !== eventOwner (super_admin / whitelabel admin acting
      // on a host's behalf). Audit metadata also records ownerHostId.
      onBehalfOfOwner: { type: Boolean, default: false },
    },
    reminderType: {
      type: String,
      enum: ['reminder_confirmed', 'reminder_pending'],
      required: true,
    },
    guestIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    scheduledFor: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'sent', 'partial', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    // = guestIds.length at schedule time. Source of truth for refund maths
    // so we don't double-count if the guest list is mutated later.
    consumedQuota: { type: Number, required: true },
    result: {
      successful: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      rateLimited: { type: Number, default: 0 },
      details: { type: [detailSchema], default: [] },
    },
    lockOwner: { type: String },
    lockedAt: { type: Date },
    startedAt: { type: Date },
    finishedAt: { type: Date },
    attemptCount: { type: Number, default: 0 },
    lastError: { type: String },
  },
  { timestamps: true }
);

scheduledExtraReminderSchema.index({ status: 1, scheduledFor: 1 });

module.exports = mongoose.model('ScheduledExtraReminder', scheduledExtraReminderSchema);

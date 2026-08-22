/**
 * Events Service — Step2 (atomic guest+staff list) sub-module
 * Composed onto EventsService via prototype mixin in events.service.js
 * @module modules/events/events.step2.service
 */

const {
  NotFoundError,
  ValidationError,
  PackageLimitError,
  AppError,
} = require("../../shared/errors");

// Import existing models during migration
const Event = require("../../../models/EventModel");
const Guest = require("../../../models/GuestModel");
const Subscription = require("../../../models/SubscriptionModel");
const subscriptionEventAccess = require('../subscriptions/subscriptionEventAccess.service');

const { normalizePhoneNumber } = require('../../shared/utils/phone');
// Post-review polish — extracted error codes shared between
// updateGuestList and updateEventStep2 so they can't drift.
const { GUEST_LIST_BELOW_CONFIRMED } = require('../../shared/constants/events');

const logger = require('../../shared/utils/logger');

module.exports = {
  /**
   * Atomically replace guest list + staff list.
   *
   * Wraps the same business rules as `updateGuestList` + `updateStaffList`
   * inside a Mongo transaction so a capacity-guard rejection on either
   * side leaves both fields at their pre-call values. On a standalone
   * Mongo topology (no replica set) `session.startTransaction()` throws
   * `MongoServerError: Transaction numbers are only allowed on a replica
   * set member or mongos`; we catch that, fall back to ordered writes,
   * and rollback the guest changes by hand if the staff write fails.
   *
   * Reuses the `GUEST_LIST_BELOW_CONFIRMED` capacity guard so the floor
   * check (no shrink below confirmed/checked-in guests) fires before any
   * writes land.
   *
   * @param {string} eventId
   * @param {{ guestList: Array, staffList: Array }} payload
   * @param {Object} userContext - req.user
   * @returns {Promise<{ event: Object, addedCount: number }>}
   */
  async updateEventStep2(eventId, payload, userContext) {
    const guestList = Array.isArray(payload?.guestList) ? payload.guestList : [];
    const staffList = Array.isArray(payload?.staffList) ? payload.staffList : [];

    const userId =
      typeof userContext === 'object' && userContext !== null
        ? userContext._id?.toString?.() || userContext._id
        : userContext;

    const event = await Event.findOne(this._buildScopedEventQuery(eventId, userContext))
      .populate('guestList', 'name phone status category');
    if (!event) throw new NotFoundError("Event");

    if (['completed', 'cancelled'].includes(event.status)) {
      throw new ValidationError('Cannot modify a completed or cancelled event');
    }

    // List cap (NO consumption): replacing the guest list is a re-list of
    // names, which is free — only sending consumes. The cap is the
    // subscription's total invite capacity (invitePool + compensation), for
    // per-event and pool plans alike. Unlimited plans (invitePool null) have
    // no cap.
    const newCount = guestList.length;
    if (event.subscriptionId) {
      const ownerId = event.host?._id || event.host || userId;
      const capSub = await subscriptionEventAccess.findForEvent(event, ownerId, {
        allowFallback: false,
      });
      if (!capSub) {
        throw new PackageLimitError(
          'subscription',
          0,
          'This event subscription is no longer available'
        );
      }
      if (capSub && capSub.invitePool !== null && capSub.invitePool !== undefined) {
        const capacity = (capSub.invitePool || 0) + (capSub.compensationPool || 0);
        if (newCount > capacity) {
          throw new PackageLimitError("guests", capacity,
            `Guest list (${newCount}) exceeds your plan capacity of ${capacity} invites.`);
        }
      }
    }

    // Floor — never drop below confirmed/checked-in count.
    const confirmedCount = (event.guestList || []).filter((g) =>
      ['confirmed', 'checked_in'].includes(g.status)
    ).length;
    if (confirmedCount > 0 && newCount < confirmedCount) {
      throw new AppError(
        `Cannot reduce guest list below ${confirmedCount} confirmed guests.`,
        400,
        GUEST_LIST_BELOW_CONFIRMED
      );
    }

    // Pre-image — kept for the compensation path and for the response
    // shape on either branch.
    const preImageGuestIds = (event.guestList || []).map((g) => g._id);
    const preImageStaffList = (event.staffList || []).map((s) => ({
      name: s.name,
      phone: s.phone,
    }));

    // Reusable helpers: compute the diff between the existing guests and
    // the incoming list. Defined once so both the transaction branch and
    // the compensation branch see identical behaviour.
    const existingGuests = event.guestList || [];
    const existingByPhone = new Map(
      existingGuests.map((g) => [normalizePhoneNumber(g.phone), g])
    );
    const keptGuestIds = [];
    const toCreate = [];
    const toUpdate = [];
    const incomingPhones = new Set();

    for (const incoming of guestList) {
      const normPhone = normalizePhoneNumber(incoming.phone);
      incomingPhones.add(normPhone);
      const existing = existingByPhone.get(normPhone);
      if (existing) {
        if (existing.name !== incoming.name || (incoming.category !== undefined && existing.category !== incoming.category)) {
          toUpdate.push({
            _id: existing._id,
            name: incoming.name,
            ...(incoming.category !== undefined && { category: incoming.category }),
          });
        }
        keptGuestIds.push(existing._id);
      } else {
        toCreate.push({
          name: incoming.name,
          phone: incoming.phone,
          ...(incoming.category !== undefined && { category: incoming.category }),
          event: eventId,
          status: 'invited',
          addedBy: userId,
        });
      }
    }
    const toDeleteIds = existingGuests
      .filter((g) => !incomingPhones.has(normalizePhoneNumber(g.phone)))
      .map((g) => g._id);

    // EVT-03: Live event invariants — existing guests are immutable, new guests allowed.
    if (event.status === 'live') {
      if (toDeleteIds.length > 0) {
        throw new ValidationError('Cannot remove existing guests from a live event');
      }
      if (toUpdate.length > 0) {
        throw new ValidationError('Cannot modify existing guests on a live event');
      }
    }

    const normalisedStaff = staffList.map((s) => ({
      name: s.name,
      phone: s.phone,
    }));

    let session = null;
    let useTransactions = true;
    try {
      session = await require('mongoose').startSession();
      session.startTransaction();
    } catch (err) {
      // Standalone topology — no transactions. Fall back to compensation.
      useTransactions = false;
      try { if (session) await session.endSession(); } catch (_) { /* ignore */ }
      session = null;
    }

    let addedCount = 0;

    try {
      if (useTransactions) {
        // Happy path — replica-set / sharded cluster.
        if (toDeleteIds.length > 0) {
          // Soft-delete tombstone
          await Guest.updateMany(
            { _id: { $in: toDeleteIds } },
            { $set: { deleted: true, deletedAt: new Date() } },
            { session }
          );
        }
        for (const u of toUpdate) {
          await Guest.findByIdAndUpdate(
            u._id,
            { name: u.name, ...(u.category !== undefined && { category: u.category }) },
            { session }
          );
        }
        const newGuestIds = [];
        if (toCreate.length > 0) {
          // Guest pre-save hook (QR generation) needs `Guest.create`; insertMany skips hooks.
          const created = await Guest.create(toCreate, { session, ordered: true });
          for (const g of created) newGuestIds.push(g._id);
        }
        addedCount = newGuestIds.length;

        event.guestList = [...keptGuestIds, ...newGuestIds];
        event.staffList = normalisedStaff;
        await event.save({ session });

        if (event.subscriptionId && newGuestIds.length > 0) {
          await Subscription.findByIdAndUpdate(
            event.subscriptionId,
            {
              $inc: {
                "usage.guestsUsed": newGuestIds.length,
                "usage.totalGuests": newGuestIds.length,
              },
            },
            { session }
          );
        }

        await session.commitTransaction();

        // Revoke tokens for removed staff. Done AFTER the transaction
        // commits because StaffAccessToken writes are outside the
        // event-doc transaction scope and we don't want a commit
        // blocked on a side-effect collection.
        await this._revokeRemovedStaffTokens(eventId, preImageStaffList.map((s) => s.phone), normalisedStaff);
      } else {
        // Standalone / no-transaction path. Order matters and the delete
        // is DEFERRED until the staff save succeeds — this preserves
        // each existing guest document's `qrcode`, `rsvp`, `checkIn`,
        // and any other fields not loaded into the populated event
        // (only name/phone/status/category are populated above). If we
        // deleted-then-restored on rollback we'd regenerate the QR via
        // GuestModel's pre-save hook, which would invalidate any
        // invitation links already shared.
        //
        // Sequence:
        //   1. Update kept guests in place. Stash pre-image so we can
        //      restore the name/category on rollback (best-effort).
        //   2. Create the brand-new guests.
        //   3. Save the event with guestList = [kept, new] — the
        //      to-delete docs still exist in the Guest collection but
        //      are no longer referenced by the event.
        //   4. Save the event again with the new staffList. On failure
        //      we restore the event guestList + staffList to pre-image
        //      and delete the freshly-created guests; the to-delete
        //      docs are untouched.
        //   5. After step 4 commits, deleteMany the to-delete guests.
        //      If the process crashes between 4 and 5, an orphan Guest
        //      doc is left referenced by no event; the periodic guest-
        //      orphan GC sweep handles that.

        const guestById = new Map(
          existingGuests.map((g) => [g._id.toString(), g])
        );
        const updatePreImages = new Map();
        const newGuestIds = [];

        // Unified rollback handler.
        // The in-place updates (step 1) and the first event.save()
        // (step 3) need rollback — without it, a throw anywhere in
        // steps 1-3 leaves the DB with orphan guests and mutated names,
        // with no compensation. This handler restores every step that
        // had committed by the time the throw happened.
        const runCompensation = async (failedAt) => {
          try {
            // Always: drop the freshly-created guests (whatever step we
            // failed at, anything in newGuestIds is unwanted).
            if (newGuestIds.length > 0) {
              try {
                await Guest.deleteMany({ _id: { $in: newGuestIds } });
              } catch (_) { /* best-effort */ }
            }

            // Always: restore the in-place updates (best-effort — they
            // commit one-at-a-time, so partial restoration is possible).
            for (const [guestId, pre] of updatePreImages.entries()) {
              try {
                await Guest.findByIdAndUpdate(guestId, {
                  name: pre.name,
                  ...(pre.category !== undefined && { category: pre.category }),
                });
              } catch (_) { /* best-effort */ }
            }

            // Only when we'd advanced past step 3 (event.save with
            // new guestList): restore the event doc. If we failed AT
            // step 3, the event save threw and the document is still
            // pre-image in the DB — no restore needed.
            if (failedAt === 'staff-save') {
              const restoreEvent = await Event.findById(eventId);
              if (restoreEvent) {
                restoreEvent.guestList = preImageGuestIds;
                restoreEvent.staffList = preImageStaffList;
                await restoreEvent.save();
              }
            }
            // NOTE: we never delete the to-delete guests in compensation
            // paths — that's the whole point of the deferred-delete
            // sequencing (preserves QR codes / RSVP / checkIn).
          } catch (rollbackErr) {
            logger.error(
              `[updateEventStep2] compensation rollback (failedAt=${failedAt}) failed`,
              { err: rollbackErr?.message }
            );
          }
        };

        // Step 1: in-place updates (with pre-image stash).
        try {
          for (const u of toUpdate) {
            const existing = guestById.get(u._id.toString());
            if (existing) {
              updatePreImages.set(existing._id.toString(), {
                name: existing.name,
                category: existing.category,
              });
            }
            await Guest.findByIdAndUpdate(
              u._id,
              { name: u.name, ...(u.category !== undefined && { category: u.category }) }
            );
          }
        } catch (updateErr) {
          await runCompensation('inplace-update');
          throw updateErr;
        }

        // Step 2: create the brand-new guests.
        try {
          if (toCreate.length > 0) {
            const created = await Guest.create(toCreate);
            for (const g of created) newGuestIds.push(g._id);
          }
        } catch (createErr) {
          await runCompensation('guest-create');
          throw createErr;
        }
        addedCount = newGuestIds.length;

        // Step 3: event.guestList = [kept, new] (excludes toDeleteIds).
        try {
          event.guestList = [...keptGuestIds, ...newGuestIds];
          await event.save();
        } catch (firstSaveErr) {
          await runCompensation('first-event-save');
          throw firstSaveErr;
        }

        // Step 4: event.staffList = newStaff. Roll back on failure
        // through the same handler (which now knows to restore the
        // event doc since step 3 committed).
        try {
          event.staffList = normalisedStaff;
          await event.save();
        } catch (staffErr) {
          await runCompensation('staff-save');
          throw staffErr;
        }

        // Step 5: soft-delete the removed guests (tombstone, preserves QR/RSVP/checkIn).
        if (toDeleteIds.length > 0) {
          try {
            await Guest.updateMany(
              { _id: { $in: toDeleteIds } },
              { $set: { deleted: true, deletedAt: new Date() } }
            );
          } catch (deleteErr) {
            logger.warn('[updateEventStep2] post-commit guest soft-delete failed', { err: deleteErr?.message });
          }
        }

        // Revoke tokens for removed staff. Reaches here only after
        // step 4 (staff save) committed.
        await this._revokeRemovedStaffTokens(eventId, preImageStaffList.map((s) => s.phone), normalisedStaff);

        if (event.subscriptionId && newGuestIds.length > 0) {
          try {
            await Subscription.findByIdAndUpdate(event.subscriptionId, {
              $inc: {
                "usage.guestsUsed": newGuestIds.length,
                "usage.totalGuests": newGuestIds.length,
              },
            });
          } catch (e) {
            logger.warn('[updateEventStep2] Failed to track guest addition', { err: e?.message });
          }
        }
      }
    } catch (err) {
      if (useTransactions && session) {
        try { await session.abortTransaction(); } catch (_) { /* ignore */ }
      }
      throw err;
    } finally {
      if (session) {
        try { await session.endSession(); } catch (_) { /* ignore */ }
      }
    }

    const updated = await Event.findById(eventId).populate(
      "guestList",
      "name phone status category"
    );
    return { event: updated, addedCount };
  },
};

// Audience definitions + gating for the consolidated "Send messages" actions
// on the single-event page. Shared by SendMessagesMenu (gating) and
// SendActionPopup (table + send) so the two can never drift.
//
// The backend re-enforces each audience, so these client filters are for UX
// only (which rows to show, how many, enable/disable) — never authorization.

// Resend targets guests already sent an invite who haven't responded.
// Extra reminder targets confirmed (or checked-in) guests.
export const RESEND_STATUSES = ["invited", "pending"];
export const REMINDER_STATUSES = ["confirmed", "checked_in"];

const TERMINAL_STATUSES = ["completed", "cancelled", "deleted", "archived"];

// Action keys, in menu order.
export const SEND_ACTIONS = ["newGuests", "resend", "extraReminder"];

/**
 * Has the initial bulk send started? "New guests" / "resend" only make sense
 * once a launch has gone out. Mirrors the backend's view (bulkSendStarted, or
 * a status that implies a send already happened).
 */
export function hasSendStarted(event) {
  return (
    event?.messagingStatus?.bulkSendStarted === true ||
    ["live", "published", "completed"].includes(event?.status)
  );
}

export function isTerminalEvent(event) {
  return TERMINAL_STATUSES.includes(event?.status);
}

/**
 * Split the guest list into the three send audiences.
 * @param {Array} guests - guests from `useEventGuests` (have status / invitation.sent / rsvp.response)
 * @returns {{ newGuests: Array, resend: Array, extraReminder: Array }}
 */
export function computeSendAudiences(guests = []) {
  const list = Array.isArray(guests) ? guests : [];
  const newGuests = list.filter(
    (g) => g?.invitation?.sent !== true && !g?.deleted
  );
  const resend = list.filter(
    (g) =>
      g?.invitation?.sent === true &&
      RESEND_STATUSES.includes(g?.status || "invited")
  );
  const extraReminder = list.filter(
    (g) =>
      REMINDER_STATUSES.includes(g?.status) || g?.rsvp?.response === "confirmed"
  );
  return { newGuests, resend, extraReminder };
}

/**
 * Per-action menu state: { audience, enabled, reasonKey }. `reasonKey` is an
 * i18n suffix under `singleEvent.sendActions.disabled.*` explaining why an
 * action is disabled (empty audience, or no send yet).
 */
export function buildSendActionStates(event, audiences) {
  const started = hasSendStarted(event);
  const a = audiences || { newGuests: [], resend: [], extraReminder: [] };

  const gate = (audience, blockReason, emptyReason) => {
    const reasonKey = blockReason || (audience.length ? null : emptyReason);
    return { audience, enabled: !reasonKey, reasonKey };
  };

  return {
    newGuests: gate(a.newGuests, started ? null : "sendFirst", "noNewGuests"),
    resend: gate(a.resend, started ? null : "sendFirst", "noResend"),
    // Confirmed guests can only exist after a send, so no "send first" gate.
    extraReminder: gate(a.extraReminder, null, "noConfirmed"),
  };
}

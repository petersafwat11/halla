// Audience definitions + gating for the consolidated "Send messages" actions
// on the single-event screen. Mirror of the web helper
// (halaa-web/components/event-detail/sendActions/sendAudiences.js) — keep the two
// in sync. The backend re-enforces each audience, so these client filters are
// for UX only (which rows to show, counts, enable/disable) — never authz.

export const RESEND_STATUSES = ["invited", "pending"];
export const REMINDER_STATUSES = ["confirmed", "checked_in"];

const TERMINAL_STATUSES = ["completed", "cancelled", "deleted", "archived"];

// Action keys, in sheet order.
export const SEND_ACTIONS = ["newGuests", "resend", "extraReminder"];

// Mobile guest docs carry the id under any of these keys.
export const guestKey = (g) => String(g?._id || g?.guestId || g?.id);

export function hasSendStarted(event) {
  return (
    event?.messagingStatus?.bulkSendStarted === true ||
    ["live", "published", "completed"].includes(event?.status)
  );
}

export function isTerminalEvent(event) {
  return TERMINAL_STATUSES.includes(event?.status);
}

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

// Per-action sheet state: { audience, enabled, reasonKey }. `reasonKey` maps to
// `events:sendActions.disabled.*`.
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
    extraReminder: gate(a.extraReminder, null, "noConfirmed"),
  };
}

/**
 * Merge incoming guests (from the reuse guest-book or native contacts) into
 * the current Step-2 list: dedupe by phone, respect the remaining list
 * capacity (free at list time — no invite consumed), and report a skipped
 * count. Mirrors the web `mergeIncomingGuests` in StepTwo.js.
 *
 * @param {Array<{name,phone?,mobile?,category?}>} incoming
 * @param {Array} currentList
 * @param {{ isUnlimited?: boolean, guestLimit?: number }} caps
 * @returns {{ list: Array, added: number, skipped: number }}
 */
export const mergeIncomingGuests = (incoming, currentList = [], caps = {}) => {
  const { isUnlimited = false, guestLimit = 0 } = caps;
  const existing = new Set((currentList || []).map((g) => g.phone || g.mobile));
  const fresh = [];

  (incoming || []).forEach((c, i) => {
    const phone = (c.phone || c.mobile || "").trim();
    if (!phone || existing.has(phone)) return;
    existing.add(phone);
    fresh.push({
      id: Date.now() + i,
      name: (c.name || "").trim(),
      phone,
      category: (c.category || "").trim(),
    });
  });

  const remaining = isUnlimited
    ? Infinity
    : Math.max(0, (guestLimit || 0) - (currentList || []).length);
  const toAdd = fresh.slice(0, remaining);
  const skipped = fresh.length - toAdd.length;

  return {
    list: [...(currentList || []), ...toAdd],
    added: toAdd.length,
    skipped,
  };
};

export default mergeIncomingGuests;

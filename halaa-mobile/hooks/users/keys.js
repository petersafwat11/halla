// Mobile-side users keys. Naming intentionally mirrors web's `usersKeys`
// even though mobile uses singular `["user", ...]` prefixes — the
// in-memory shape stays the same on both platforms; the literal prefix
// is preserved here for byte-identity with prior code.
export const usersKeys = {
  all: ["user"],
  profile: () => [...usersKeys.all, "profile"],
  notificationSettings: () => [...usersKeys.all, "notification-settings"],
};

// Subscription-info read lives on a separate top-level key.
export const subscriptionInfoKeys = {
  all: ["subscription"],
  eventInfo: () => [...subscriptionInfoKeys.all, "event-info"],
};

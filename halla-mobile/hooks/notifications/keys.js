export const notificationsKeys = {
  all: ["notifications"],
  list: ({ limit }) => [...notificationsKeys.all, { limit }],
  unreadCount: () => [...notificationsKeys.all, "unread-count"],
};

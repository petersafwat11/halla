export const notificationsKeys = {
  all: ["notifications"],
  list: (params) => [...notificationsKeys.all, params],
  unreadCount: () => [...notificationsKeys.all, "unread-count"],
  detail: (notificationId) => [...notificationsKeys.all, notificationId],
  dropdown: (limit) => [...notificationsKeys.all, "dropdown", limit],
};

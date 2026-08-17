export const usersKeys = {
  all: ["users"],
  myProfile: () => [...usersKeys.all, "my-profile"],
  notificationPreferences: () => [...usersKeys.all, "notification-preferences"],
};

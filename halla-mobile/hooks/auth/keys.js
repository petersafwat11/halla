// Auth currently exposes signup mutations on mobile (login/logout sit on
// the auth store) plus a small set of read queries (`useMe`, `useSession`)
// for revalidating the session before privileged actions.
export const authKeys = {
  all: ["auth"],
  me: () => [...authKeys.all, "me"],
};

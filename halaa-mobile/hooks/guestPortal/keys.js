// Guest portal queries reuse the guests namespace (the backend route is
// `/guests/invitation/:code`). Cross-domain import — see hooks/guests/keys.js.
import { guestsKeys } from "../guests/keys";

export const guestPortalKeys = {
  byInvitation: (code) => guestsKeys.byInvitation(code),
};

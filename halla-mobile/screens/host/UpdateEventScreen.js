/**
 * Phase 4d W1-MOBILE-UPDATE — re-export shim.
 *
 * The unified update wizard now lives at
 * `halla-mobile/screens/update-event/UpdateEventScreen.js` per D2 +
 * D4d-4 (one screen for every role, no per-role component tree). This
 * file is preserved as a thin re-export so any external import path
 * still resolves.
 */
export { default } from "../update-event/UpdateEventScreen";

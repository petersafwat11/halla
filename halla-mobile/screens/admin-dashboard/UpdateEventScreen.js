/**
 * Phase 4d W1-MOBILE-UPDATE — re-export shim.
 *
 * Admin-dashboard navigation entry now points at the unified update
 * wizard (D2: single update-event page used by all roles). The previous
 * admin-only form-based screen is removed in favour of the role-aware
 * step-based wizard at `screens/update-event/UpdateEventScreen.js`.
 *
 * Phase 5 hand-off: once it's clear no caller still imports the legacy
 * admin path, this shim can be deleted alongside the host shim.
 */
export { default } from "../update-event/UpdateEventScreen";

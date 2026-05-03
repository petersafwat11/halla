"use client";
/**
 * Host update-event route. Phase 4b W1-UNIFY thinned this page down to a
 * shared wizard wrapper; the implementation lives in
 * `_components/UpdateEventWizard.jsx` and is re-used by the admin-dash
 * (and future whitelabel) routes per D11. Role-aware behavior lives
 * inside the wizard as branches; there is no per-role component tree.
 */
import UpdateEventWizard from "./_components/UpdateEventWizard";

export default function HostUpdateEventPage() {
  return <UpdateEventWizard returnPath="host" />;
}

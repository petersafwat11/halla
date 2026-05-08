"use client";
/**
 * Host update-event route. Implementation lives in
 * `_components/UpdateEventWizard.jsx` and is reused by admin-dash (and
 * future whitelabel) routes; role-aware behaviour lives inside the
 * wizard as branches rather than a per-role component tree.
 */
import UpdateEventWizard from "./_components/UpdateEventWizard";

export default function HostUpdateEventPage() {
  return <UpdateEventWizard returnPath="host" />;
}

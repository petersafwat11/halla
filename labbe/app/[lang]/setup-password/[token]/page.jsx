/**
 * Phase 4b W1-WL-EMAIL — `/setup-password/[token]` route.
 *
 * Lands the whitelabel admin from the approval email (the link
 * `${frontend.url}/${lang}/setup-password/<token>` is built server-side
 * by `admin.service.updateWhitelabelStatus`). The actual form lives in
 * `ui/auth/setup-password/SetupPassword.js` so the route handler stays
 * trivial. Phase 4 final report flagged the missing FE page; this
 * commit closes that hand-off.
 */

import SetupPassword from "@/ui/auth/setup-password/SetupPassword";

export default async function SetupPasswordPage({ params }) {
  const { token } = await params;
  return <SetupPassword token={token} />;
}

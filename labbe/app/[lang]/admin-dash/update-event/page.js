import { requirePageAccess } from "@/services/serverAuth";
import UpdateEventWizard from "../../host/update-event/_components/UpdateEventWizard";
import styles from "./page.module.css";

/**
 * Admin update-event route. Phase 4b W1-UNIFY: this page used to ship a
 * 392-line duplicate (`_components/UpdateEventContent.jsx`). The
 * duplicate has been deleted; this route now thin-wraps the unified
 * `UpdateEventWizard` exported from the host route per D2 / D11. Same
 * wizard, same per-step PATCH dispatch, role-aware branches inside.
 *
 * The whitelabel-admin / whitelabel-moderator users currently navigate
 * here too (their admin surface lives under `/admin-dash/`); when their
 * own route space ships, that page can re-use the same wrapper.
 */
export default async function AdminUpdateEventPage({ params }) {
  const { lang } = await params;
  await requirePageAccess("events", lang);

  return (
    <div className={styles.container}>
      <UpdateEventWizard returnPath="admin-dash/events" />
    </div>
  );
}

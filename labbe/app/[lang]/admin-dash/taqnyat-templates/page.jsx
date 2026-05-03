/**
 * Admin Taqnyat Templates — Phase 4c W1-TAQNYAT-ADMIN
 *
 * Server-guarded; renders the table + Sync button + Assign dialog.
 */

import { requirePageAccess } from "@/services/serverAuth";
import TaqnyatTemplatesTable from "./_components/TaqnyatTemplatesTable";

export default async function Page({ params }) {
  const { lang } = await params;
  await requirePageAccess("taqnyat_templates", lang);
  return <TaqnyatTemplatesTable lang={lang} />;
}

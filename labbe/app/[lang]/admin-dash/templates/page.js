/**
 * Admin Templates List — Phase 4c W1-VISUAL
 *
 * Server-side guard via `requirePageAccess('templates', lang)` (v4.1
 * §A-1). Renders the client-side list page that lets admins search,
 * filter by category, and pick a template to edit.
 */

import { requirePageAccess } from "@/services/serverAuth";
import TemplatesPageContent from "./_components/TemplatesPageContent";

export default async function TemplatesPage({ params }) {
  const { lang } = await params;
  await requirePageAccess("templates", lang);
  return <TemplatesPageContent lang={lang} />;
}

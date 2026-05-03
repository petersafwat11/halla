/**
 * Admin Template Editor — Phase 4c W1-VISUAL
 *
 * Server-guarded; the actual editor is the client component below.
 * Path param `id` is either an ObjectId or the literal "new".
 */

import { requirePageAccess } from "@/services/serverAuth";
import TemplateEditorPage from "../_components/TemplateEditorPage";

export default async function Page({ params }) {
  const { lang, id } = await params;
  await requirePageAccess("templates", lang);
  return <TemplateEditorPage id={id} lang={lang} />;
}

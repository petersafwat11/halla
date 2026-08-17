/**
 * Admin template editor route. The client-side editor lives in
 * `_components/TemplateEditorPage`. The `id` param is either an
 * ObjectId or the literal "new" for creation.
 */

import { requirePageAccess } from "@/services/serverAuth";
import TemplateEditorPage from "../_components/TemplateEditorPage";

export default async function Page({ params }) {
  const { lang, id } = await params;
  await requirePageAccess("templates", lang);
  return <TemplateEditorPage id={id} lang={lang} />;
}

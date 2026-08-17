/**
 * Admin templates list page. The client component handles search,
 * category filter, and selection.
 */

import { requirePageAccess } from "@/services/serverAuth";
import TemplatesPageContent from "./_components/TemplatesPageContent";

export default async function TemplatesPage({ params }) {
  const { lang } = await params;
  await requirePageAccess("templates", lang);
  return <TemplatesPageContent lang={lang} />;
}

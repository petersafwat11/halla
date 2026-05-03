/**
 * Admin Template Categories — Phase 4c W1-VISUAL
 */

import { requirePageAccess } from "@/services/serverAuth";
import CategoryManager from "../_components/CategoryManager";

export default async function Page({ params }) {
  const { lang } = await params;
  await requirePageAccess("template_categories", lang);
  return <CategoryManager lang={lang} />;
}

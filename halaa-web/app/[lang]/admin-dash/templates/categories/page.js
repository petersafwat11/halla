import { requirePageAccess } from "@/services/serverAuth";
import CategoriesPageContent from "../_components/CategoriesPageContent";

export default async function Page({ params }) {
  const { lang } = await params;
  await requirePageAccess("template_categories", lang);
  return <CategoriesPageContent lang={lang} />;
}

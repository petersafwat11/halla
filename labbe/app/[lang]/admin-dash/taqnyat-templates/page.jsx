import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { requirePageAccess } from "@/services/serverAuth";
import TaqnyatTemplatesPageContent from "./_components/TaqnyatTemplatesPageContent";

export default async function Page({ params }) {
  const { lang } = await params;
  await requirePageAccess("taqnyat_templates", lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const queryClient = createServerQueryClient();

  if (token) {
    await prefetchServerData({
      queryClient,
      queryKey: ["taqnyat-templates", "admin"],
      path: API_PATHS.taqnyatTemplates.adminList,
      token,
    });
  }

  return (
    <QueryClientServerProvider queryClient={queryClient}>
      <TaqnyatTemplatesPageContent lang={lang} />
    </QueryClientServerProvider>
  );
}

import { cookies } from "next/headers";
import { createServerQueryClient, prefetchServerData, QueryClientServerProvider } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { requirePageAccess } from "@/services/serverAuth";
import { taqnyatTemplatesKeys } from "@/hooks/taqnyatTemplates/keys";
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
      queryKey: taqnyatTemplatesKeys.adminList(),
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

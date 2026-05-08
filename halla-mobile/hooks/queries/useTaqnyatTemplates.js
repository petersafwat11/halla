import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { taqnyatTemplatesService } from "../../services/taqnyatTemplatesService";

/**
 * Query-key registry for the host-facing Taqnyat templates cache.
 *
 * Identical shape to the web hook so cross-platform cache testing is
 * meaningful: `["taqnyat-templates", "host", category || "all"]`.
 */
export const TAQNYAT_TEMPLATES_QK = {
  hostList: (category) => ["taqnyat-templates", "host", category || "all"],
};

/**
 * Fetch the host-facing Taqnyat templates filtered by category.
 *
 * Endpoint: GET /taqnyat-templates?category={category}
 * Returns the raw response envelope; consumers read `data?.data` for the
 * template array.
 */
export function useHostTaqnyatTemplates({ category } = {}, opts = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: TAQNYAT_TEMPLATES_QK.hostList(category),
    queryFn: () => taqnyatTemplatesService.getTemplates({ category }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    ...opts,
  });
}

export default useHostTaqnyatTemplates;

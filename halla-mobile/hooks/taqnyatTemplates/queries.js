import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { taqnyatTemplatesService } from "../../services/taqnyatTemplatesService";
import { taqnyatTemplatesKeys } from "./keys";

/**
 * Fetch the host-facing Taqnyat templates filtered by (category, type).
 *
 * Endpoint: GET /taqnyat-templates?category={category}&type={type}
 * `type` defaults to no filter on the backend; the create-event wizard
 * passes `type: 'invite'` so the host only sees invitation templates.
 */
export function useHostTaqnyatTemplates({ category, type } = {}, opts = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: taqnyatTemplatesKeys.hostList({ category, type }),
    queryFn: () => taqnyatTemplatesService.getTemplates({ category, type }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    ...opts,
  });
}

export default useHostTaqnyatTemplates;

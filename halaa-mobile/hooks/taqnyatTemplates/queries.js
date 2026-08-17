import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { useAuthStore } from "../../stores/authStore";
import { taqnyatTemplatesKeys } from "./keys";

const buildQuery = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== ""
    )
  ).toString();
  return qs ? `?${qs}` : "";
};

/**
 * Fetch the host-facing Taqnyat templates filtered by (category, type).
 *
 * Endpoint: GET /taqnyat-templates?category={category}&type={type}
 * `type` defaults to no filter on the backend; the create-event wizard
 * passes `type: 'invite'` so the host only sees invitation templates.
 */
export function useHostTaqnyatTemplates({ category, type, invitationMode } = {}, opts = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: taqnyatTemplatesKeys.hostList({ category, type, invitationMode }),
    queryFn: async () => {
      const res = await apiFetch(
        `${ENDPOINTS.TAQNYAT_TEMPLATES.LIST}${buildQuery({ category, type, invitationMode })}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Request failed");
      return data;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    ...opts,
  });
}

export default useHostTaqnyatTemplates;

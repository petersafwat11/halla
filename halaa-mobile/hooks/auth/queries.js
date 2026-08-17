import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { useAuthStore } from "../../stores/authStore";
import { authKeys } from "./keys";

/**
 * Fetch the currently authenticated user from /auth/me.
 *
 * Used to revalidate the in-memory session against the server before
 * privileged actions and to hydrate UI when the cached store is missing
 * the latest profile.
 */
export function useMe(opts = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      const res = await apiFetch(ENDPOINTS.AUTH.ME, { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load profile");
      return data.data?.user ?? data.data ?? data;
    },
    enabled: !!token,
    staleTime: 60 * 1000,
    ...opts,
  });
}

/**
 * Session view: the currently authenticated user + a boolean session
 * flag. Mirrors `useMe` but exposes whether a token is present without
 * requiring callers to read the auth store separately.
 */
export function useSession(opts = {}) {
  const token = useAuthStore((state) => state.token);
  const meQuery = useMe(opts);
  return {
    ...meQuery,
    isAuthenticated: !!token,
  };
}

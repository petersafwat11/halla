import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import addonsService from "../../services/addonsService";
import { addonsKeys } from "./keys";

export const useAvailableAddons = (options = {}) => {
  return useQuery({
    queryKey: addonsKeys.catalog(),
    queryFn: () => addonsService.getCatalog(),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    ...options,
  });
};

export const useMyAddons = (params = {}, options = {}) => {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: addonsKeys.my(params),
    queryFn: () => addonsService.getMyAddons(params),
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
    ...options,
  });
};

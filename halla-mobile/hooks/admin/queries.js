import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import adminDashboardService from "../../services/adminDashboardService";
import { getAdminDashboard } from "../../services/dashboardService";
import { adminKeys } from "./keys";

export function useAdminStats(period = "month") {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.stats(period),
    queryFn: () => getAdminDashboard(period),
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}

export function useAdminHosts(params = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.hosts(params),
    queryFn: async () => {
      const response = await adminDashboardService.hosts.getAll(token, params);
      return response.data;
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminHostById(id) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.hostDetail(id),
    queryFn: async () => {
      const response = await adminDashboardService.hosts.getById(token, id);
      return response.data;
    },
    enabled: !!token && !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminVendors(params = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.vendors(params),
    queryFn: async () => {
      const response = await adminDashboardService.vendors.getAll(token, params);
      return response.data;
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminVendorById(id) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.vendorDetail(id),
    queryFn: async () => {
      const response = await adminDashboardService.vendors.getById(token, id);
      return response.data;
    },
    enabled: !!token && !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminModerators(params = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.moderators(params),
    queryFn: async () => {
      const response = await adminDashboardService.moderators.getAll(token, params);
      return response.data;
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminEvents(params = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.events(params),
    queryFn: async () => {
      const response = await adminDashboardService.events.getAll(token, params);
      return response.data;
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminTickets(params = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.tickets(params),
    queryFn: async () => {
      const response = await adminDashboardService.tickets.getAll(token, params);
      return response.data;
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminTicketById(id) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.ticketDetail(id),
    queryFn: async () => {
      const response = await adminDashboardService.tickets.getById(token, id);
      return response.data;
    },
    enabled: !!token && !!id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * @param {Object} [params] - server filter params
 * @param {Object} [opts]
 * @param {boolean} [opts.enabled=true] - mirror of react-query's `enabled`
 *   so callers can gate the request on role. Without this, every
 *   non-super-admin opening a screen that imports the hook fires
 *   `GET /admin/whitelabels` and the backend responds 403/401.
 */
export function useAdminWhitelabels(params = {}, opts = {}) {
  const token = useAuthStore((state) => state.token);
  const callerEnabled = opts.enabled !== false;
  return useQuery({
    queryKey: adminKeys.whitelabels(params),
    queryFn: async () => {
      const response = await adminDashboardService.whitelabels.getAll(token, params);
      return response.data;
    },
    enabled: !!token && callerEnabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminWhitelabelById(id) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.whitelabelDetail(id),
    queryFn: async () => {
      const response = await adminDashboardService.whitelabels.getById(token, id);
      return response.data;
    },
    enabled: !!token && !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminPlans(filters = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.plans(filters),
    queryFn: async () => {
      const response = await adminDashboardService.plans.getAllForAdmin(token, filters);
      return response.data;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminHostPlans() {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.hostPlans(),
    queryFn: async () => {
      const response = await adminDashboardService.plans.getHostPlans(token);
      return response.data;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminEventById(id) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.eventDetail(id),
    queryFn: async () => {
      const response = await adminDashboardService.events.getById(token, id);
      return response.data;
    },
    enabled: !!token && !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminPaymentById(paymentId) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.paymentDetail(paymentId),
    queryFn: async () => {
      const response = await adminDashboardService.payments.getById(token, paymentId);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: !!token && !!paymentId,
    staleTime: 30 * 1000,
  });
}

export function useAdminWhitelabelFeatures(whitelabelId) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.whitelabelFeatures(whitelabelId),
    queryFn: async () => {
      const response = await adminDashboardService.whitelabels.getFeatures(token, whitelabelId);
      return response.data;
    },
    enabled: !!token && !!whitelabelId,
    staleTime: 5 * 60 * 1000,
  });
}

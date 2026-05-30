import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { useAuthStore } from "../../stores/authStore";
import { adminQs, adminRequest } from "./_request";
import { adminKeys } from "./keys";

export function useAdminStats(period = "month") {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.stats(period),
    queryFn: async () => {
      const qs = period ? `?period=${period}` : "";
      const res = await apiFetch(`${ENDPOINTS.DASHBOARD.ADMIN}${qs}`, {
        method: "GET",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch admin dashboard");
      }
      return data.data;
    },
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}

export function useAdminHosts(params = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: adminKeys.hosts(params),
    queryFn: async () => {
      const response = await adminRequest(
        `${ENDPOINTS.ADMIN.HOSTS.BASE}${adminQs(params)}`,
      );
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
      const response = await adminRequest(ENDPOINTS.ADMIN.HOSTS.BY_ID(id));
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
      const response = await adminRequest(
        `${ENDPOINTS.ADMIN.VENDORS.BASE}${adminQs(params)}`,
      );
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
      const response = await adminRequest(ENDPOINTS.ADMIN.VENDORS.BY_ID(id));
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
      const response = await adminRequest(
        `${ENDPOINTS.ADMIN.MODERATORS.BASE}${adminQs(params)}`,
      );
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
      const response = await adminRequest(
        `${ENDPOINTS.ADMIN.EVENTS.ADMIN_ALL}${adminQs(params)}`,
      );
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
      const response = await adminRequest(
        `${ENDPOINTS.ADMIN.TICKETS.BASE}${adminQs(params)}`,
      );
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
      const response = await adminRequest(ENDPOINTS.ADMIN.TICKETS.BY_ID(id));
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
      const response = await adminRequest(
        `${ENDPOINTS.ADMIN.WHITELABELS.BASE}${adminQs(params)}`,
      );
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
      const response = await adminRequest(
        ENDPOINTS.ADMIN.WHITELABELS.BY_ID(id),
      );
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
      const response = await adminRequest(
        ENDPOINTS.ADMIN.PLANS.ALL,
        "GET",
        null,
        { params: filters },
      );
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
      const response = await adminRequest(ENDPOINTS.PLANS.HOST_PLANS);
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
      const response = await adminRequest(ENDPOINTS.ADMIN.EVENTS.BY_ID(id));
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
      const response = await adminRequest(
        ENDPOINTS.ADMIN.PAYMENTS.BY_ID(paymentId),
      );
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
      const response = await adminRequest(
        ENDPOINTS.ADMIN.WHITELABELS.FEATURES(whitelabelId),
      );
      return response.data;
    },
    enabled: !!token && !!whitelabelId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hosts + whitelabels listing used by the admin "create event for host"
 * flow's HostSelectorStep. Backend: GET /admin/event-targets?type=host|whitelabel
 */
export function useAdminEventTargets(type) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: [...adminKeys.all, "event-targets", type || "all"],
    queryFn: async () => {
      const endpoint = `${ENDPOINTS.ADMIN.EVENT_TARGETS}${type ? `?type=${type}` : ""}`;
      const response = await adminRequest(endpoint);
      return response.data;
    },
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import adminDashboardService from '../../services/adminDashboardService';
import { getAdminDashboard } from '../../services/dashboardService';

export function useAdminStats(period = 'month') {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ['admin', 'stats', period],
    queryFn: () => getAdminDashboard(period),
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}

export function useAdminHosts(params = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ['admin', 'hosts', params],
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
    queryKey: ['admin', 'hosts', id],
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
    queryKey: ['admin', 'vendors', params],
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
    queryKey: ['admin', 'vendors', id],
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
    queryKey: ['admin', 'moderators', params],
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
    queryKey: ['admin', 'events', params],
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
    queryKey: ['admin', 'tickets', params],
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
    queryKey: ['admin', 'tickets', id],
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
  const callerEnabled = opts.enabled !== false; // default true for back-compat
  return useQuery({
    queryKey: ['admin', 'whitelabels', params],
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
    queryKey: ['admin', 'whitelabels', id],
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
    queryKey: ['admin', 'plans', filters],
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
    queryKey: ['admin', 'plans', 'host'],
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
    queryKey: ['admin', 'events', id],
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
    queryKey: ['admin', 'payments', paymentId],
    queryFn: async () => {
      const response = await adminDashboardService.payments.getById(token, paymentId);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: !!token && !!paymentId,
    staleTime: 30 * 1000,
  });
}

// Refund / capture / void all hit the canonical /payments/:id/* mounts.
// Idempotency-Key is minted once per modal session by the caller and
// passed in so retries on a flaky network land on the same operation.
export function useAdminPaymentRefund() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ id, amount, reason, idempotencyKey }) => {
      const response = await adminDashboardService.payments.refund(
        token,
        id,
        { amount, reason },
        idempotencyKey,
      );
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'payments', variables.id] });
      }
    },
  });
}

export function useAdminPaymentCapture() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ id, amount, idempotencyKey }) => {
      const response = await adminDashboardService.payments.capture(
        token,
        id,
        { amount },
        idempotencyKey,
      );
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'payments', variables.id] });
      }
    },
  });
}

export function useAdminPaymentVoid() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ id, idempotencyKey }) => {
      const response = await adminDashboardService.payments.void(token, id, idempotencyKey);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'payments', variables.id] });
      }
    },
  });
}

export function useAdminWhitelabelFeatures(whitelabelId) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ['admin', 'whitelabels', whitelabelId, 'features'],
    queryFn: async () => {
      const response = await adminDashboardService.whitelabels.getFeatures(token, whitelabelId);
      return response.data;
    },
    enabled: !!token && !!whitelabelId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateAdminWhitelabelFeatureMutation(whitelabelId) {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ feature, enabled }) => {
      const response = await adminDashboardService.whitelabels.updateFeature(token, whitelabelId, feature, enabled);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'whitelabels', whitelabelId, 'features'] });
    },
  });
}

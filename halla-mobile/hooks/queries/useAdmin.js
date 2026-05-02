import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import adminDashboardService from '../../services/adminDashboardService';

export function useAdminStats(period = 'month') {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ['admin', 'stats', period],
    queryFn: async () => {
      const response = await adminDashboardService.dashboard.getStats(token, period);
      // adminDashboardService wraps the backend response: { success, data: backendEnvelope, error }
      // backendEnvelope = { success, status, data: { statsCards, charts, recentActivity, ... } }
      return response.data?.data || response.data;
    },
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

export function useAdminPayments(params = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ['admin', 'payments', params],
    queryFn: async () => {
      const response = await adminDashboardService.payments.getAll(token, params);
      return response.data;
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminWhitelabels(params = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ['admin', 'whitelabels', params],
    queryFn: async () => {
      const response = await adminDashboardService.whitelabels.getAll(token, params);
      return response.data;
    },
    enabled: !!token,
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

export function useAdminPlans() {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: async () => {
      const response = await adminDashboardService.plans.getAll(token);
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

export function useAdminEnterprisePlans() {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ['admin', 'plans', 'enterprise'],
    queryFn: async () => {
      const response = await adminDashboardService.plans.getEnterprisePlans(token);
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

export function useAdminDiscounts(params = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ['admin', 'discounts', params],
    queryFn: async () => {
      const response = await adminDashboardService.discounts.getAll(token, params);
      return response.data;
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminPaymentSummary(params = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ['admin', 'payments', 'summary', params],
    queryFn: async () => {
      const response = await adminDashboardService.payments.getSummary(token, params);
      return response.data;
    },
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}

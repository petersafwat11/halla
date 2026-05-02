import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import adminDashboardService from '../../services/adminDashboardService';

/** Throw a normalised error when the service returns success:false. */
const assertOk = (response) => {
  if (!response.success) {
    throw new Error(response.error || 'Operation failed');
  }
  return response.data;
};

export function useUpdateHostStatus() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ hostId, status }) => {
      const response = await adminDashboardService.hosts.updateStatus(token, hostId, status);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'hosts'] });
    },
  });
}

export function useUpdateHostSubscription() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ hostId, subscriptionData }) => {
      const response = await adminDashboardService.hosts.updateSubscription(token, hostId, subscriptionData);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'hosts'] });
    },
  });
}

export function useDeleteHost() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (hostId) => {
      const response = await adminDashboardService.hosts.delete(token, hostId);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'hosts'] });
    },
  });
}

export function useBulkDeleteHosts() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (hostIds) => {
      const response = await adminDashboardService.hosts.bulkDelete(token, hostIds);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'hosts'] });
    },
  });
}

export function useCreateHost() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (hostData) => {
      const response = await adminDashboardService.hosts.create(token, hostData);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'hosts'] });
    },
  });
}

export function useUpdateVendorStatus() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ vendorId, status }) => {
      const response = await adminDashboardService.vendors.updateStatus(token, vendorId, status);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (vendorId) => {
      const response = await adminDashboardService.vendors.delete(token, vendorId);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
    },
  });
}

export function useBulkDeleteVendors() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (vendorIds) => {
      const response = await adminDashboardService.vendors.bulkDelete(token, vendorIds);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
    },
  });
}

export function useGiveVendorRating() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ vendorId, ratingData }) => {
      const response = await adminDashboardService.vendors.giveRating(token, vendorId, ratingData);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
    },
  });
}

export function useCreateModerator() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (moderatorData) => {
      const response = await adminDashboardService.moderators.create(token, moderatorData);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'moderators'] });
    },
  });
}

export function useUpdateModerator() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ moderatorId, moderatorData }) => {
      const response = await adminDashboardService.moderators.update(token, moderatorId, moderatorData);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'moderators'] });
    },
  });
}

export function useDeleteModerator() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (moderatorId) => {
      const response = await adminDashboardService.moderators.delete(token, moderatorId);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'moderators'] });
    },
  });
}

export function useUpdateAdminEventStatus() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ eventId, status }) => {
      const response = await adminDashboardService.events.updateStatus(token, eventId, status);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
    },
  });
}

export function useDeleteAdminEvent() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (eventId) => {
      const response = await adminDashboardService.events.delete(token, eventId);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
    },
  });
}

export function useBulkDeleteEvents() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (eventIds) => {
      const response = await adminDashboardService.events.bulkDelete(token, eventIds);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
    },
  });
}

export function useBulkSuspendEvents() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (eventIds) => {
      const response = await adminDashboardService.events.bulkSuspend(token, eventIds);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
    },
  });
}

export function useUpdateAdminEvent() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ eventId, eventData }) => {
      const response = await adminDashboardService.events.update(token, eventId, eventData);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
    },
  });
}

export function useCreateEventForHost() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (eventData) => {
      const response = await adminDashboardService.events.createForHost(token, eventData);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
    },
  });
}

export function useAssignTicket() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ ticketId, assigneeId }) => {
      const response = await adminDashboardService.tickets.assignTo(token, ticketId, assigneeId);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
    },
  });
}

export function useResolveTicket() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ ticketId, resolution }) => {
      const response = await adminDashboardService.tickets.resolve(token, ticketId, resolution);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
    },
  });
}

export function useReopenTicket() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (ticketId) => {
      const response = await adminDashboardService.tickets.reopen(token, ticketId);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
    },
  });
}

export function useDeleteAdminTicket() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (ticketId) => {
      const response = await adminDashboardService.tickets.delete(token, ticketId);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
    },
  });
}

export function useUpdateWhitelabelStatus() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ whitelabelId, status }) => {
      const response = await adminDashboardService.whitelabels.updateStatus(token, whitelabelId, status);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'whitelabels'] });
    },
  });
}

export function useDeleteWhitelabel() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (whitelabelId) => {
      const response = await adminDashboardService.whitelabels.delete(token, whitelabelId);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'whitelabels'] });
    },
  });
}

export function useUpdateModeratorStatus() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ moderatorId, status }) => {
      const response = await adminDashboardService.moderators.updateStatus(token, moderatorId, status);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'moderators'] });
    },
  });
}

export function useUpdateWhitelabelSubscription() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ whitelabelId, subscriptionData }) => {
      const response = await adminDashboardService.whitelabels.updateSubscription(token, whitelabelId, subscriptionData);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'whitelabels'] });
    },
  });
}

export function useRespondToTicket() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ ticketId, message }) => {
      const response = await adminDashboardService.tickets.respond(token, ticketId, message);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
    },
  });
}

export function useSendHostNotification() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ hostId, notificationData }) => {
      const response = await adminDashboardService.hosts.sendNotification(token, hostId, notificationData);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'hosts'] });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ code, data }) => {
      const response = await adminDashboardService.plans.updatePlan(token, code, data);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
    },
  });
}

export function useBulkDeleteModerators() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (moderatorIds) => {
      const response = await adminDashboardService.moderators.bulkDelete(token, moderatorIds);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'moderators'] });
    },
  });
}

export function useBulkSuspendModerators() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (moderatorIds) => {
      const response = await adminDashboardService.moderators.bulkSuspend(token, moderatorIds);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'moderators'] });
    },
  });
}

export function useBulkDeleteWhitelabels() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (whitelabelIds) => {
      const response = await adminDashboardService.whitelabels.bulkDelete(token, whitelabelIds);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'whitelabels'] });
    },
  });
}

export function useBulkSuspendWhitelabels() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (whitelabelIds) => {
      const response = await adminDashboardService.whitelabels.bulkSuspend(token, whitelabelIds);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'whitelabels'] });
    },
  });
}

export function useBulkDeleteTickets() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (ticketIds) => {
      const results = await Promise.all(
        ticketIds.map((id) => adminDashboardService.tickets.delete(token, id)),
      );
      results.forEach(assertOk);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
    },
  });
}

export function useBulkResolveTickets() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (ticketIds) => {
      const results = await Promise.all(
        ticketIds.map((id) => adminDashboardService.tickets.resolve(token, id, "")),
      );
      results.forEach(assertOk);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
    },
  });
}

export function useBulkApproveVendors() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (vendorIds) => {
      const response = await adminDashboardService.vendors.bulkApprove(token, vendorIds);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
    },
  });
}

export function useCreateDiscount() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (data) => {
      const response = await adminDashboardService.discounts.create(token, data);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'discounts'] });
    },
  });
}

export function useUpdateDiscount() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await adminDashboardService.discounts.update(token, id, data);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'discounts'] });
    },
  });
}

export function useDeleteDiscount() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (id) => {
      const response = await adminDashboardService.discounts.delete(token, id);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'discounts'] });
    },
  });
}

export function useToggleDiscount() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (id) => {
      const response = await adminDashboardService.discounts.toggleStatus(token, id);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'discounts'] });
    },
  });
}

export function useBulkSuspendVendors() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (vendorIds) => {
      const response = await adminDashboardService.vendors.bulkSuspend(token, vendorIds);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'vendors'] });
    },
  });
}

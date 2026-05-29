import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import adminDashboardService from "../../services/adminDashboardService";
import { adminKeys } from "./keys";
import { ticketsKeys } from "../tickets/keys";

/** Throw a normalised error when the service returns success:false. */
const assertOk = (response) => {
  if (!response.success) {
    throw new Error(response.error || "Operation failed");
  }
  return response.data;
};

// ============================================
// HOSTS
// ============================================

export function useUpdateHostStatus() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ hostId, status }) => {
      const response = await adminDashboardService.hosts.updateStatus(token, hostId, status);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
    },
  });
}

export function useUpdateHostSubscription() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ hostId, planCode, status }) => {
      const body = { planCode };
      if (status !== undefined) body.status = status;
      const response = await adminDashboardService.hosts.updateSubscription(token, hostId, body);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
    },
  });
}

// ============================================
// VENDORS
// ============================================

export function useUpdateVendorStatus() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ vendorId, status }) => {
      const response = await adminDashboardService.vendors.updateStatus(token, vendorId, status);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
    },
  });
}

// ============================================
// MODERATORS
// ============================================

export function useCreateModerator() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (moderatorData) => {
      const response = await adminDashboardService.moderators.create(token, moderatorData);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.moderatorsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.moderatorsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.moderatorsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.moderatorsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.moderatorsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.moderatorsAll() });
    },
  });
}

// ============================================
// EVENTS (admin)
// ============================================

export function useUpdateAdminEventStatus() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ eventId, status }) => {
      const response = await adminDashboardService.events.updateStatus(token, eventId, status);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.eventsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.eventsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.eventsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.eventsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.eventsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.eventsAll() });
    },
  });
}

// ============================================
// TICKETS (admin)
// ============================================

export function useAssignTicket() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ ticketId, assigneeId }) => {
      const response = await adminDashboardService.tickets.assignTo(token, ticketId, assigneeId);
      return assertOk(response);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.ticketsAll() }),
        queryClient.invalidateQueries({ queryKey: ticketsKeys.all }),
      ]);
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.ticketsAll() }),
        queryClient.invalidateQueries({ queryKey: ticketsKeys.all }),
      ]);
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.ticketsAll() }),
        queryClient.invalidateQueries({ queryKey: ticketsKeys.all }),
      ]);
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.ticketsAll() }),
        queryClient.invalidateQueries({ queryKey: ticketsKeys.all }),
      ]);
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.ticketsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.ticketsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.ticketsAll() });
    },
  });
}

// ============================================
// WHITELABELS
// ============================================

export function useUpdateWhitelabelStatus() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ whitelabelId, status, dispatchSetupEmail }) => {
      const extras = dispatchSetupEmail !== undefined ? { dispatchSetupEmail } : {};
      const response = await adminDashboardService.whitelabels.updateStatus(token, whitelabelId, status, extras);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.whitelabelsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.whitelabelsAll() });
    },
  });
}

export function useUpdateWhitelabelSubscription() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ whitelabelId, planCode, status }) => {
      const body = { planCode };
      if (status !== undefined) body.status = status;
      const response = await adminDashboardService.whitelabels.updateSubscription(token, whitelabelId, body);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.whitelabelsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.whitelabelsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.whitelabelsAll() });
    },
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
      queryClient.invalidateQueries({
        queryKey: adminKeys.whitelabelFeatures(whitelabelId),
      });
    },
  });
}

// ============================================
// MISC
// ============================================

export function useSendHostNotification() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ hostId, notificationData }) => {
      const response = await adminDashboardService.hosts.sendNotification(token, hostId, notificationData);
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
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
      await queryClient.invalidateQueries({ queryKey: adminKeys.plansAll() });
    },
  });
}

// ============================================
// PAYMENTS (admin)
// ============================================
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
      queryClient.invalidateQueries({ queryKey: adminKeys.paymentsAll() });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: adminKeys.paymentDetail(variables.id) });
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
      queryClient.invalidateQueries({ queryKey: adminKeys.paymentsAll() });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: adminKeys.paymentDetail(variables.id) });
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
      queryClient.invalidateQueries({ queryKey: adminKeys.paymentsAll() });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: adminKeys.paymentDetail(variables.id) });
      }
    },
  });
}

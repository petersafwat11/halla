import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { useAuthStore } from "../../stores/authStore";
import { ticketsKeys } from "../tickets/keys";
import { adminExport, adminRequest } from "./_request";
import { adminKeys } from "./keys";

/** Throw a normalised error when the request returns success:false. */
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
  return useMutation({
    mutationFn: async ({ hostId, status }) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.HOSTS.STATUS(hostId),
        "PATCH",
        { status },
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
    },
  });
}

export function useUpdateHostSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ hostId, planCode, status }) => {
      const body = { planCode };
      if (status !== undefined) body.status = status;
      const response = await adminRequest(
        ENDPOINTS.ADMIN.HOSTS.SUBSCRIPTION(hostId),
        "PATCH",
        body,
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
    },
  });
}

export function useDeleteHost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (hostId) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.HOSTS.BY_ID(hostId),
        "DELETE",
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
    },
  });
}

export function useBulkDeleteHosts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (hostIds) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.HOSTS.BULK_DELETE,
        "POST",
        { ids: hostIds },
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
    },
  });
}

export function useCreateHost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (hostData) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.HOSTS.BASE,
        "POST",
        hostData,
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
    },
  });
}

export function useExportHosts() {
  return useMutation({
    mutationFn: async (filters = {}) =>
      adminExport(ENDPOINTS.ADMIN.HOSTS.EXPORT, filters),
  });
}

/**
 * Phone-lookup mutation used by HostSelectorStep's debounced verify.
 * Triggered imperatively by the consumer; we wrap it as a mutation
 * (rather than a query) so the call shape is request/response without
 * cache coupling.
 */
export function useVerifyHostPhone() {
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (phoneNumber) => {
      if (!token) throw new Error("Not authenticated");
      const response = await adminRequest(
        `${ENDPOINTS.ADMIN.HOSTS.VERIFY_PHONE}?phoneNumber=${encodeURIComponent(phoneNumber)}`,
      );
      return assertOk(response);
    },
  });
}

// ============================================
// VENDORS
// ============================================

export function useUpdateVendorStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ vendorId, status }) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.VENDORS.STATUS(vendorId),
        "PATCH",
        { status },
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vendorId) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.VENDORS.BY_ID(vendorId),
        "DELETE",
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
    },
  });
}

export function useBulkDeleteVendors() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vendorIds) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.VENDORS.BULK_DELETE,
        "POST",
        { ids: vendorIds },
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
    },
  });
}

export function useGiveVendorRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ vendorId, ratingData }) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.VENDORS.RATING(vendorId),
        "PATCH",
        ratingData,
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
    },
  });
}

export function useBulkApproveVendors() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vendorIds) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.VENDORS.BULK_STATUS,
        "POST",
        { ids: vendorIds, status: "approved" },
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
    },
  });
}

export function useBulkSuspendVendors() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vendorIds) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.VENDORS.BULK_STATUS,
        "POST",
        { ids: vendorIds, status: "suspended" },
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
    },
  });
}

export function useExportVendors() {
  return useMutation({
    mutationFn: async (filters = {}) =>
      adminExport(ENDPOINTS.ADMIN.VENDORS.EXPORT, filters),
  });
}

// ============================================
// MODERATORS
// ============================================

export function useCreateModerator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (moderatorData) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.MODERATORS.BASE,
        "POST",
        moderatorData,
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminKeys.moderatorsAll(),
      });
    },
  });
}

export function useUpdateModerator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ moderatorId, moderatorData }) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.MODERATORS.BY_ID(moderatorId),
        "PATCH",
        moderatorData,
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminKeys.moderatorsAll(),
      });
    },
  });
}

export function useDeleteModerator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (moderatorId) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.MODERATORS.BY_ID(moderatorId),
        "DELETE",
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminKeys.moderatorsAll(),
      });
    },
  });
}

export function useUpdateModeratorStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ moderatorId, status }) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.MODERATORS.STATUS(moderatorId),
        "PATCH",
        { status },
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminKeys.moderatorsAll(),
      });
    },
  });
}

export function useBulkDeleteModerators() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (moderatorIds) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.MODERATORS.BULK_DELETE,
        "POST",
        { ids: moderatorIds },
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminKeys.moderatorsAll(),
      });
    },
  });
}

export function useBulkSuspendModerators() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (moderatorIds) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.MODERATORS.BULK_STATUS,
        "POST",
        { ids: moderatorIds, status: "inactive" },
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminKeys.moderatorsAll(),
      });
    },
  });
}

export function useExportModerators() {
  return useMutation({
    mutationFn: async (filters = {}) =>
      adminExport(ENDPOINTS.ADMIN.MODERATORS.EXPORT, filters),
  });
}

// ============================================
// EVENTS (admin)
// ============================================

export function useUpdateAdminEventStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, status }) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.EVENTS.STATUS(eventId),
        "PATCH",
        { status },
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.eventsAll() });
    },
  });
}

export function useDeleteAdminEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.EVENTS.BY_ID(eventId),
        "DELETE",
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.eventsAll() });
    },
  });
}

export function useBulkDeleteEvents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventIds) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.EVENTS.BULK_DELETE,
        "POST",
        { ids: eventIds },
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.eventsAll() });
    },
  });
}

export function useBulkSuspendEvents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventIds) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.EVENTS.BULK_STATUS,
        "POST",
        { ids: eventIds, status: "suspended" },
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.eventsAll() });
    },
  });
}

export function useUpdateAdminEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, eventData }) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.EVENTS.BY_ID(eventId),
        "PATCH",
        eventData,
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.eventsAll() });
    },
  });
}

export function useCreateEventForHost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventData) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.EVENTS.CREATE_FOR_HOST,
        "POST",
        eventData,
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.eventsAll() });
    },
  });
}

export function useExportAdminEvents() {
  return useMutation({
    mutationFn: async (filters = {}) =>
      adminExport(ENDPOINTS.ADMIN.EVENTS.EXPORT, filters),
  });
}

// ============================================
// TICKETS (admin)
// ============================================

// Tickets re-use the host-facing /tickets endpoints (with admin RBAC). The
// previous adminDashboardService.tickets layer was a `_envelope` wrapper
// around ticketsService.js exports. The new mutations call ticketsService
// directly and apply `assertOk` against an envelope they synthesise so the
// existing hook bodies don't need restructuring.

import { ticketsApi } from "../tickets/queries";

const _envelopeOf = async (promise) => {
  try {
    return { success: true, data: await promise, error: null };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err?.message || "An unexpected error occurred",
    };
  }
};

export function useAssignTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, assigneeId }) => {
      const response = await _envelopeOf(ticketsApi.assignTicket(ticketId, assigneeId));
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
  return useMutation({
    mutationFn: async ({ ticketId, resolution }) => {
      const response = await _envelopeOf(
        ticketsApi.updateTicketStatus(ticketId, { status: "resolved", resolution }),
      );
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
  return useMutation({
    mutationFn: async (ticketId) => {
      const response = await _envelopeOf(
        ticketsApi.updateTicketStatus(ticketId, { status: "in_progress" }),
      );
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
  return useMutation({
    mutationFn: async (ticketId) => {
      const response = await _envelopeOf(ticketsApi.deleteTicket(ticketId));
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
  return useMutation({
    mutationFn: async ({ ticketId, message }) => {
      const response = await _envelopeOf(ticketsApi.updateTicket(ticketId, { message }));
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.ticketsAll() });
    },
  });
}

export function useBulkDeleteTickets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticketIds) => {
      const results = await Promise.all(
        ticketIds.map((id) => _envelopeOf(ticketsApi.deleteTicket(id))),
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
  return useMutation({
    mutationFn: async (ticketIds) => {
      const results = await Promise.all(
        ticketIds.map((id) =>
          _envelopeOf(ticketsApi.updateTicketStatus(id, { status: "resolved" })),
        ),
      );
      results.forEach(assertOk);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.ticketsAll() });
    },
  });
}

export function useExportAdminTickets() {
  return useMutation({
    mutationFn: async (filters = {}) => {
      // Use admin tickets export endpoint if defined; otherwise the tickets
      // endpoint via the shared `ticketsApi.exportTickets` helper (handles
      // blob fetch + native share sheet under one path).
      const path = ENDPOINTS.ADMIN.TICKETS?.EXPORT;
      if (path) return adminExport(path, filters);
      return ticketsApi.exportTickets(filters);
    },
  });
}

// ============================================
// WHITELABELS
// ============================================

export function useUpdateWhitelabelStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ whitelabelId, status, dispatchSetupEmail }) => {
      const body = { status };
      if (dispatchSetupEmail !== undefined) body.dispatchSetupEmail = dispatchSetupEmail;
      const response = await adminRequest(
        ENDPOINTS.ADMIN.WHITELABELS.STATUS(whitelabelId),
        "PATCH",
        body,
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminKeys.whitelabelsAll(),
      });
    },
  });
}

export function useDeleteWhitelabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (whitelabelId) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.WHITELABELS.BY_ID(whitelabelId),
        "DELETE",
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminKeys.whitelabelsAll(),
      });
    },
  });
}

export function useUpdateWhitelabelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ whitelabelId, planCode, status }) => {
      const body = { planCode };
      if (status !== undefined) body.status = status;
      const response = await adminRequest(
        ENDPOINTS.ADMIN.WHITELABELS.SUBSCRIPTION(whitelabelId),
        "PATCH",
        body,
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminKeys.whitelabelsAll(),
      });
    },
  });
}

export function useBulkDeleteWhitelabels() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (whitelabelIds) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.WHITELABELS.BULK_DELETE,
        "POST",
        { ids: whitelabelIds },
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminKeys.whitelabelsAll(),
      });
    },
  });
}

export function useBulkSuspendWhitelabels() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (whitelabelIds) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.WHITELABELS.BULK_STATUS,
        "POST",
        { ids: whitelabelIds, status: "suspended" },
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminKeys.whitelabelsAll(),
      });
    },
  });
}

export function useUpdateAdminWhitelabelFeatureMutation(whitelabelId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ feature, enabled }) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.WHITELABELS.FEATURES(whitelabelId),
        "PATCH",
        { feature, enabled },
      );
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

export function useExportWhitelabels() {
  return useMutation({
    mutationFn: async (filters = {}) =>
      adminExport(ENDPOINTS.ADMIN.WHITELABELS.EXPORT, filters),
  });
}

// ============================================
// MISC
// ============================================

export function useSendHostNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ hostId, notificationData }) => {
      const response = await adminRequest(
        ENDPOINTS.NOTIFICATIONS.SEND,
        "POST",
        { userIds: [hostId], ...notificationData },
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, data }) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.PLANS.BY_CODE(code),
        "PATCH",
        data,
      );
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
  return useMutation({
    mutationFn: async ({ id, amount, reason, deductInvites, idempotencyKey }) => {
      const headers = idempotencyKey
        ? { "Idempotency-Key": idempotencyKey }
        : null;
      const body = { amount, reason };
      // Only thread deductInvites when the admin set it on a partial refund —
      // it claws back invites from the host's pool alongside the refund.
      if (deductInvites != null) body.deductInvites = deductInvites;
      const response = await adminRequest(
        ENDPOINTS.PAYMENTS.REFUND(id),
        "POST",
        body,
        headers,
      );
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.paymentsAll() });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: adminKeys.paymentDetail(variables.id),
        });
      }
    },
  });
}

export function useAdminPaymentCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount, idempotencyKey }) => {
      const headers = idempotencyKey
        ? { "Idempotency-Key": idempotencyKey }
        : null;
      const response = await adminRequest(
        ENDPOINTS.PAYMENTS.CAPTURE(id),
        "POST",
        { amount },
        headers,
      );
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.paymentsAll() });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: adminKeys.paymentDetail(variables.id),
        });
      }
    },
  });
}

export function useAdminPaymentVoid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, idempotencyKey }) => {
      const headers = idempotencyKey
        ? { "Idempotency-Key": idempotencyKey }
        : null;
      const response = await adminRequest(
        ENDPOINTS.PAYMENTS.VOID(id),
        "POST",
        null,
        headers,
      );
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.paymentsAll() });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: adminKeys.paymentDetail(variables.id),
        });
      }
    },
  });
}

export function useExportAdminPayments() {
  return useMutation({
    mutationFn: async (filters = {}) =>
      adminExport(ENDPOINTS.ADMIN.PAYMENTS.EXPORT, filters),
  });
}

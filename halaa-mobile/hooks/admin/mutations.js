import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toBulkIdsPayload } from "@halaa/shared/utils/adapters";
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
    mutationFn: async ({ hostId, planCode, status, reason }) => {
      const body = { planCode };
      if (status !== undefined) body.status = status;
      if (reason) body.reason = reason;
      const response = await adminRequest(
        ENDPOINTS.ADMIN.HOSTS.SUBSCRIPTION(hostId),
        "PATCH",
        body,
      );
      return assertOk(response);
    },
    onSuccess: async (_data, { hostId }) => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
      if (hostId) {
        await queryClient.invalidateQueries({ queryKey: adminKeys.hostDetail(hostId) });
      }
    },
  });
}

/**
 * Admin grant of extra invites to a host (no charge). Mirrors self-service
 * add-ons: increments the subscription invite pool and writes an audit row.
 * Backend: POST /admin/hosts/:id/subscription/extra-invites { quantity, reason }
 */
export function useGrantHostExtraInvites() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ hostId, quantity, reason }) => {
      const body = { quantity };
      if (reason) body.reason = reason;
      const response = await adminRequest(
        ENDPOINTS.ADMIN.HOSTS.GRANT_EXTRA_INVITES(hostId),
        "POST",
        body,
      );
      return assertOk(response);
    },
    onSuccess: async (_data, { hostId }) => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
      if (hostId) {
        await queryClient.invalidateQueries({ queryKey: adminKeys.hostDetail(hostId) });
      }
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
        toBulkIdsPayload(hostIds),
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
// BUSINESSES
// ============================================

/** Invalidate the business list + a specific detail after a write. */
const _invalidateBusiness = async (queryClient, businessId) => {
  await queryClient.invalidateQueries({ queryKey: adminKeys.businessesAll() });
  if (businessId) {
    await queryClient.invalidateQueries({
      queryKey: adminKeys.businessDetail(businessId),
    });
  }
};

/**
 * Assign / change a business plan. mode 'grant' activates immediately
 * (setup fee waived); mode 'checkout' returns a payment link in
 * `result.data.link`. Mirrors web's useAdminBusinessMutation("assignPlan").
 */
export function useAssignBusinessPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ businessId, mode, planCode, discountCode, grantReason }) => {
      const body = { mode, planCode };
      if (discountCode) body.discountCode = discountCode;
      if (grantReason) body.grantReason = grantReason;
      const response = await adminRequest(
        ENDPOINTS.ADMIN.BUSINESSES.ASSIGN_PLAN(businessId),
        "POST",
        body,
      );
      return assertOk(response);
    },
    onSuccess: async (_data, { businessId }) =>
      _invalidateBusiness(queryClient, businessId),
  });
}

/** Admin grant of extra invites to a business (no charge). */
export function useGrantBusinessExtraInvites() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ businessId, quantity, reason }) => {
      const body = { quantity };
      if (reason) body.reason = reason;
      const response = await adminRequest(
        ENDPOINTS.ADMIN.BUSINESSES.GRANT_EXTRA_INVITES(businessId),
        "POST",
        body,
      );
      return assertOk(response);
    },
    onSuccess: async (_data, { businessId }) =>
      _invalidateBusiness(queryClient, businessId),
  });
}

export function useRevokeBusinessAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId }) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.BUSINESSES.REVOKE_ASSIGNMENT(assignmentId),
        "POST",
      );
      return assertOk(response);
    },
    onSuccess: async (_data, { businessId }) =>
      _invalidateBusiness(queryClient, businessId),
  });
}

export function useRegenerateBusinessAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId }) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.BUSINESSES.REGENERATE_ASSIGNMENT(assignmentId),
        "POST",
      );
      return assertOk(response);
    },
    onSuccess: async (_data, { businessId }) =>
      _invalidateBusiness(queryClient, businessId),
  });
}

/**
 * Suspend / activate a business. Unlike hosts (single /status endpoint),
 * businesses use separate /suspend and /activate routes.
 */
export function useUpdateBusinessStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ businessId, status }) => {
      const endpoint =
        status === "suspended"
          ? ENDPOINTS.ADMIN.BUSINESSES.SUSPEND(businessId)
          : ENDPOINTS.ADMIN.BUSINESSES.ACTIVATE(businessId);
      const response = await adminRequest(endpoint, "PATCH");
      return assertOk(response);
    },
    onSuccess: async (_data, { businessId }) =>
      _invalidateBusiness(queryClient, businessId),
  });
}

export function useDeleteBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (businessId) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.BUSINESSES.DELETE(businessId),
        "DELETE",
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.businessesAll() });
    },
  });
}

/**
 * Create a business account. `data` is FormData
 * (name, phoneNumber, email, password, description, optional logo).
 * Mirrors web's useAdminBusinessMutation("create").
 */
export function useCreateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.BUSINESSES.CREATE,
        "POST",
        data,
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.businessesAll() });
    },
  });
}

/**
 * Replace a business logo. `data` is FormData with a single `logo` field.
 * Mirrors web's useAdminBusinessMutation("updateLogo").
 */
export function useUpdateBusinessLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ businessId, data }) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.BUSINESSES.UPDATE_LOGO(businessId),
        "PATCH",
        data,
      );
      return assertOk(response);
    },
    onSuccess: async (_data, { businessId }) =>
      _invalidateBusiness(queryClient, businessId),
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
        toBulkIdsPayload(vendorIds),
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
        { ...toBulkIdsPayload(vendorIds), status: "approved" },
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
        { ...toBulkIdsPayload(vendorIds), status: "suspended" },
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
        toBulkIdsPayload(moderatorIds),
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
        { ...toBulkIdsPayload(moderatorIds), status: "inactive" },
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
        toBulkIdsPayload(eventIds),
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.eventsAll() });
    },
  });
}

export function useBulkCancelEvents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventIds) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.EVENTS.BULK_STATUS,
        "POST",
        { ...toBulkIdsPayload(eventIds), status: "cancelled" },
      );
      return assertOk(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.eventsAll() });
    },
  });
}

export const useBulkSuspendEvents = useBulkCancelEvents;

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
    mutationFn: async ({ ticketId, assigneeId, notes }) => {
      const response = await _envelopeOf(
        ticketsApi.assignTicket(ticketId, assigneeId, notes),
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
      const response = await adminRequest(
        ENDPOINTS.ADMIN.TICKETS.BULK_DELETE || "/tickets/bulk-delete",
        "POST",
        toBulkIdsPayload(ticketIds),
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

export function useBulkResolveTickets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticketIds) => {
      const response = await adminRequest(
        ENDPOINTS.ADMIN.TICKETS.BULK_STATUS || "/tickets/bulk-status",
        "POST",
        {
          ...toBulkIdsPayload(ticketIds),
          status: "resolved",
        },
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

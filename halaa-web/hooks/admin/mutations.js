"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { adminKeys } from "./keys";
import { eventsKeys } from "@/hooks/events/keys";
import { plansKeys } from "@/hooks/plans/keys";

const dashboardAll = () => [...adminKeys.all, "dashboard"];

export const useAdminHostMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    create: {
      mutationFn: (data) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.admin.hosts.create,
          data,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
        queryClient.invalidateQueries({ queryKey: dashboardAll() });
      },
    },
    findOrCreate: {
      mutationFn: (data) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.admin.hosts.findOrCreate,
          data,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
      },
    },
    updateStatus: {
      mutationFn: ({ hostId, status }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.admin.hosts.updateStatus(hostId),
          data: { status },
        }),
      onSuccess: (_, { hostId }) => {
        queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
        queryClient.invalidateQueries({ queryKey: adminKeys.hostDetail(hostId) });
      },
    },
    updateSubscription: {
      mutationFn: ({ hostId, planCode, status, reason }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.admin.hosts.updateSubscription(hostId),
          data: { planCode, status, reason },
        }),
      onSuccess: (_, { hostId }) => {
        queryClient.invalidateQueries({ queryKey: adminKeys.hostDetail(hostId) });
        queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
      },
    },
    grantExtraInvites: {
      mutationFn: ({ hostId, quantity, reason }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.admin.hosts.grantExtraInvites(hostId),
          data: { quantity, reason },
        }),
      onSuccess: (_, { hostId }) => {
        queryClient.invalidateQueries({ queryKey: adminKeys.hostDetail(hostId) });
        queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
      },
    },
    delete: {
      mutationFn: (hostId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.admin.hosts.delete(hostId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
        queryClient.invalidateQueries({ queryKey: dashboardAll() });
      },
    },
    bulkDelete: {
      mutationFn: (hostIds) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.admin.hosts.bulkDelete,
          data: { hostIds },
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.hostsAll() });
        queryClient.invalidateQueries({ queryKey: dashboardAll() });
      },
    },
  };

  return useMutation(mutations[action]);
};

export const useAdminBusinessMutation = (action) => {
  const queryClient = useQueryClient();

  const invalidateAll = (businessId) => {
    queryClient.invalidateQueries({ queryKey: adminKeys.businessesAll() });
    queryClient.invalidateQueries({ queryKey: dashboardAll() });
    if (businessId) {
      queryClient.invalidateQueries({ queryKey: adminKeys.businessDetail(businessId) });
    }
  };

  const mutations = {
    // `data` is FormData (name, phoneNumber, email, password, description, logo).
    create: {
      mutationFn: (data) =>
        apiRequest({ method: "POST", path: API_PATHS.admin.businesses.create, data }),
      onSuccess: () => invalidateAll(),
    },
    update: {
      mutationFn: ({ businessId, ...data }) =>
        apiRequest({ method: "PATCH", path: API_PATHS.admin.businesses.update(businessId), data }),
      onSuccess: (_r, { businessId }) => invalidateAll(businessId),
    },
    // `data` is FormData with a single `logo` field.
    updateLogo: {
      mutationFn: ({ businessId, data }) =>
        apiRequest({ method: "PATCH", path: API_PATHS.admin.businesses.updateLogo(businessId), data }),
      onSuccess: (_r, { businessId }) => invalidateAll(businessId),
    },
    assignPlan: {
      mutationFn: ({ businessId, mode, planCode, discountCode, grantReason }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.admin.businesses.assignPlan(businessId),
          data: { mode, planCode, discountCode, grantReason },
        }),
      onSuccess: (_r, { businessId }) => invalidateAll(businessId),
    },
    grantExtraInvites: {
      mutationFn: ({ businessId, quantity, reason }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.admin.businesses.grantExtraInvites(businessId),
          data: { quantity, reason },
        }),
      onSuccess: (_r, { businessId }) => invalidateAll(businessId),
    },
    revokeAssignment: {
      mutationFn: ({ businessId, assignmentId }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.admin.businesses.revokeAssignment(assignmentId),
        }),
      onSuccess: (_r, { businessId }) => invalidateAll(businessId),
    },
    regenerateAssignment: {
      mutationFn: ({ businessId, assignmentId }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.admin.businesses.regenerateAssignment(assignmentId),
        }),
      onSuccess: (_r, { businessId }) => invalidateAll(businessId),
    },
    suspend: {
      mutationFn: (businessId) =>
        apiRequest({ method: "PATCH", path: API_PATHS.admin.businesses.suspend(businessId) }),
      onSuccess: (_r, businessId) => invalidateAll(businessId),
    },
    activate: {
      mutationFn: (businessId) =>
        apiRequest({ method: "PATCH", path: API_PATHS.admin.businesses.activate(businessId) }),
      onSuccess: (_r, businessId) => invalidateAll(businessId),
    },
    delete: {
      mutationFn: (businessId) =>
        apiRequest({ method: "DELETE", path: API_PATHS.admin.businesses.delete(businessId) }),
      onSuccess: () => invalidateAll(),
    },
  };

  return useMutation(mutations[action]);
};

export const useAdminVendorMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    updateStatus: {
      mutationFn: ({ vendorId, status }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.admin.vendors.updateStatus(vendorId),
          data: { status },
        }),
      onSuccess: (_, { vendorId }) => {
        queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
        queryClient.invalidateQueries({ queryKey: adminKeys.vendorDetail(vendorId) });
      },
    },
    updateRating: {
      mutationFn: ({ vendorId, rating }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.admin.vendors.updateRating(vendorId),
          data: { rating },
        }),
      onSuccess: (_, { vendorId }) => {
        queryClient.invalidateQueries({ queryKey: adminKeys.vendorDetail(vendorId) });
        queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
      },
    },
    delete: {
      mutationFn: (vendorId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.admin.vendors.delete(vendorId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
        queryClient.invalidateQueries({ queryKey: dashboardAll() });
      },
    },
    bulkDelete: {
      mutationFn: (vendorIds) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.admin.vendors.bulkDelete,
          data: { vendorIds },
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
        queryClient.invalidateQueries({ queryKey: dashboardAll() });
      },
    },
    bulkStatus: {
      mutationFn: ({ vendorIds, status }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.admin.vendors.bulkStatus,
          data: { vendorIds, status },
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.vendorsAll() });
      },
    },
  };

  return useMutation(mutations[action]);
};

export const useAdminModeratorMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    create: {
      mutationFn: (data) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.admin.moderators.create,
          data,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.moderatorsAll() });
        queryClient.invalidateQueries({ queryKey: dashboardAll() });
      },
    },
    update: {
      mutationFn: ({ moderatorId, data }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.admin.moderators.update(moderatorId),
          data,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.moderatorsAll() });
      },
    },
    updateStatus: {
      mutationFn: ({ moderatorId, status }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.admin.moderators.updateStatus(moderatorId),
          data: { status },
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.moderatorsAll() });
      },
    },
    delete: {
      mutationFn: (moderatorId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.admin.moderators.delete(moderatorId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.moderatorsAll() });
        queryClient.invalidateQueries({ queryKey: dashboardAll() });
      },
    },
    bulkDelete: {
      mutationFn: (moderatorIds) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.admin.moderators.bulkDelete,
          data: { moderatorIds },
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.moderatorsAll() });
        queryClient.invalidateQueries({ queryKey: dashboardAll() });
      },
    },
  };

  return useMutation(mutations[action]);
};

export const useAdminEventMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    createForHost: {
      // Accepts a FormData (admin event-creation wizard, multipart with
      // templateImage) or a plain JSON object — apiRequest/axios pick the
      // correct content type from the body.
      mutationFn: (data) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.admin.events.createForHost,
          data,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: eventsKeys.all });
        queryClient.invalidateQueries({ queryKey: dashboardAll() });
      },
    },
    update: {
      mutationFn: ({ eventId, data }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.admin.events.update(eventId),
          data,
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: eventsKeys.all });
        queryClient.invalidateQueries({ queryKey: adminKeys.eventDetail(eventId) });
      },
    },
    updateStatus: {
      mutationFn: ({ eventId, status }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.admin.events.updateStatus(eventId),
          data: { status },
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: eventsKeys.all });
        // The single-event detail page renders from useEvent + useSingleEventStats,
        // both under the `["events", eventId]` prefix — invalidate it so the status
        // badge and status-gated actions update immediately after the change.
        if (eventId) {
          queryClient.invalidateQueries({ queryKey: ["events", eventId] });
        }
      },
    },
    delete: {
      mutationFn: (eventId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.admin.events.delete(eventId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: eventsKeys.all });
        queryClient.invalidateQueries({ queryKey: dashboardAll() });
      },
    },
    bulkDelete: {
      mutationFn: (eventIds) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.admin.events.bulkDelete,
          data: { eventIds },
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: eventsKeys.all });
        queryClient.invalidateQueries({ queryKey: dashboardAll() });
      },
    },
  };

  return useMutation(mutations[action]);
};

/**
 * Generic admin export mutation factory.
 * `path` is the API_PATHS export endpoint; `prefix` becomes the filename
 * stem (`prefix_export_YYYY-MM-DD.xlsx`). Filters are forwarded as query
 * params and the resulting blob is downloaded via a synthetic anchor.
 */
const buildExportMutation = (path, prefix) => ({
  mutationFn: async (filters = {}) => {
    const blob = await apiRequest({
      method: "GET",
      path,
      params: filters,
      isExport: true,
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prefix}_export_${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return { ok: true };
  },
});

export const useAdminHostsExport = () =>
  useMutation(buildExportMutation(API_PATHS.admin.hosts.export, "hosts"));

export const useAdminVendorsExport = () =>
  useMutation(buildExportMutation(API_PATHS.admin.vendors.export, "vendors"));

export const useAdminModeratorsExport = () =>
  useMutation(
    buildExportMutation(API_PATHS.admin.moderators.export, "moderators"),
  );

export const useAdminEventsExport = () =>
  useMutation(buildExportMutation(API_PATHS.admin.events.export, "events"));

/**
 * Imperative one-shot host phone verification (used by admin create-event
 * wizard + CreateEventPopup). The declarative version `useVerifyHostPhone`
 * stays for live "type and watch" UIs.
 */
export const useVerifyHostPhoneMutation = () =>
  useMutation({
    mutationFn: (phoneNumber) =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.hosts.verifyPhone,
        params: { phoneNumber },
      }),
  });

export const useAdminPlanMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.plans.adminUpdate(code),
        data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.plansAll() });
      queryClient.invalidateQueries({ queryKey: plansKeys.all });
    },
  });
};

export const useAdminPaymentRefund = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, reason, deductInvites, idempotencyKey }) => {
      const data = { amount, reason };
      // Only send deductInvites when set (partial refunds) so a full refund
      // never accidentally carries a pool deduction.
      if (deductInvites != null && Number(deductInvites) > 0) {
        data.deductInvites = Number(deductInvites);
      }
      return apiRequest({
        method: "POST",
        path: API_PATHS.payments.refund(id),
        data,
        config: { headers: { "Idempotency-Key": idempotencyKey } },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.paymentsAll() });
    },
  });
};

export const useAdminPaymentCapture = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, idempotencyKey }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.payments.capture(id),
        data: { amount },
        config: { headers: { "Idempotency-Key": idempotencyKey } },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.paymentsAll() });
    },
  });
};

export const useAdminPaymentVoid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, idempotencyKey }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.payments.void(id),
        config: { headers: { "Idempotency-Key": idempotencyKey } },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.paymentsAll() });
    },
  });
};

/**
 * Trigger an Excel export of admin payments. The blob is fetched via
 * apiRequest({ isExport: true }) and a download is triggered in the
 * browser; the mutation resolves once the download URL is revoked.
 */
export const useAdminPaymentsExport = () => {
  return useMutation({
    mutationFn: async (filters = {}) => {
      const blob = await apiRequest({
        method: "GET",
        path: API_PATHS.payments.export,
        params: filters,
        isExport: true,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments_export_${new Date()
        .toISOString()
        .split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return { ok: true };
    },
  });
};

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
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
      mutationFn: ({ hostId, planCode, status }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.admin.hosts.updateSubscription(hostId),
          data: { planCode, status },
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

export const useAdminWhitelabelMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    updateStatus: {
      mutationFn: ({ whitelabelId, status, dispatchSetupEmail }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.admin.whitelabels.updateStatus(whitelabelId),
          data: {
            status,
            ...(dispatchSetupEmail !== undefined && { dispatchSetupEmail }),
          },
        }),
      onSuccess: (_, { whitelabelId }) => {
        queryClient.invalidateQueries({ queryKey: adminKeys.whitelabelsAll() });
        queryClient.invalidateQueries({ queryKey: adminKeys.whitelabelDetail(whitelabelId) });
      },
    },
    updateSubscription: {
      mutationFn: ({ whitelabelId, planCode, status }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.admin.whitelabels.updateSubscription(whitelabelId),
          data: { planCode, status },
        }),
      onSuccess: (_, { whitelabelId }) => {
        queryClient.invalidateQueries({ queryKey: adminKeys.whitelabelDetail(whitelabelId) });
        queryClient.invalidateQueries({ queryKey: adminKeys.whitelabelsAll() });
      },
    },
    delete: {
      mutationFn: (whitelabelId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.admin.whitelabels.delete(whitelabelId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.whitelabelsAll() });
        queryClient.invalidateQueries({ queryKey: dashboardAll() });
      },
    },
    bulkDelete: {
      mutationFn: (whitelabelIds) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.admin.whitelabels.bulkDelete,
          data: { whitelabelIds },
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.whitelabelsAll() });
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
      mutationFn: ({ hostId, eventData }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.admin.events.createForHost,
          data: { hostId, ...eventData },
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: eventsKeys.all });
        queryClient.invalidateQueries({ queryKey: dashboardAll() });
      },
    },
    updateStatus: {
      mutationFn: ({ eventId, status }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.admin.events.updateStatus(eventId),
          data: { status },
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: eventsKeys.all });
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
    mutationFn: ({ id, amount, reason, idempotencyKey }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.payments.refund(id),
        data: { amount, reason },
        config: { headers: { "Idempotency-Key": idempotencyKey } },
      }),
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

export const useAdminWhitelabelFeatureMutation = (whitelabelId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ feature, enabled }) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.admin.whitelabels.features(whitelabelId),
        data: { feature, enabled },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminKeys.whitelabelFeatures(whitelabelId),
      });
    },
  });
};

/**
 * React Query Hooks for Admin Operations
 * Provides hooks for managing hosts, vendors, moderators, whitelabels, events, tickets, and payments
 * @module hooks/reactQueryHooks/useAdmin
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

// ============================================
// DASHBOARD QUERIES
// ============================================

/**
 * Get admin dashboard stats
 * @param {Object} options - React Query options
 * @returns {Object} Query result with dashboard stats
 */
export const useAdminDashboard = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ["admin", "dashboard", filters],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.dashboard.getAdminDashboard,
        params: filters,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

// ============================================
// HOST QUERIES
// ============================================

/**
 * Get all hosts with filters and pagination
 * @param {Object} filters - Filter parameters
 * @param {number} filters.page - Page number
 * @param {number} filters.limit - Items per page
 * @param {string} filters.search - Search query
 * @param {string} filters.status - Filter by status
 * @param {string} filters.from - Date from
 * @param {string} filters.to - Date to
 * @param {Object} options - React Query options
 * @returns {Object} Query result with hosts list
 */
export const useAdminHosts = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ["admin", "hosts", filters],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.hosts.getAll,
        params: filters,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Get single host by ID
 * @param {string} hostId - Host ID
 * @param {Object} options - React Query options
 * @returns {Object} Query result with host details
 */
export const useAdminHost = (hostId, options = {}) => {
  return useQuery({
    queryKey: ["admin", "hosts", hostId],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.hosts.getById(hostId),
      }),
    enabled: !!hostId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Verify host by phone number
 * @param {string} phoneNumber - Phone number to verify
 * @param {Object} options - React Query options
 * @returns {Object} Query result with verification status
 */
export const useVerifyHostPhone = (phoneNumber, options = {}) => {
  return useQuery({
    queryKey: ["admin", "hosts", "verify-phone", phoneNumber],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.hosts.verifyPhone,
        params: { phoneNumber },
      }),
    enabled: !!phoneNumber && phoneNumber.length >= 10,
    staleTime: 0, // Always fresh
    ...options,
  });
};

// ============================================
// HOST MUTATIONS
// ============================================

/**
 * Host mutation hook factory
 * @param {string} action - Mutation action type
 * @returns {Object} Mutation hook
 */
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
        queryClient.invalidateQueries({ queryKey: ["admin", "hosts"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
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
        queryClient.invalidateQueries({ queryKey: ["admin", "hosts"] });
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
        queryClient.invalidateQueries({ queryKey: ["admin", "hosts"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "hosts", hostId] });
      },
    },
    updateSubscription: {
      mutationFn: ({ hostId, planCode, status, billingCycle }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.admin.hosts.updateSubscription(hostId),
          data: { planCode, status, ...(billingCycle && { billingCycle }) },
        }),
      onSuccess: (_, { hostId }) => {
        queryClient.invalidateQueries({ queryKey: ["admin", "hosts", hostId] });
        queryClient.invalidateQueries({ queryKey: ["admin", "hosts"] });
      },
    },
    delete: {
      mutationFn: (hostId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.admin.hosts.delete(hostId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "hosts"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
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
        queryClient.invalidateQueries({ queryKey: ["admin", "hosts"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      },
    },
  };

  return useMutation(mutations[action]);
};

// ============================================
// VENDOR QUERIES
// ============================================

/**
 * Get all vendors with filters and pagination
 * @param {Object} filters - Filter parameters
 * @param {Object} options - React Query options
 * @returns {Object} Query result with vendors list
 */
export const useAdminVendors = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ["admin", "vendors", filters],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.vendors.getAll,
        params: filters,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Get single vendor by ID
 * @param {string} vendorId - Vendor ID
 * @param {Object} options - React Query options
 * @returns {Object} Query result with vendor details
 */
export const useAdminVendor = (vendorId, options = {}) => {
  return useQuery({
    queryKey: ["admin", "vendors", vendorId],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.vendors.getById(vendorId),
      }),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// ============================================
// VENDOR MUTATIONS
// ============================================

/**
 * Vendor mutation hook factory
 * @param {string} action - Mutation action type
 * @returns {Object} Mutation hook
 */
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
        queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "vendors", vendorId] });
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
        queryClient.invalidateQueries({ queryKey: ["admin", "vendors", vendorId] });
        queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
      },
    },
    delete: {
      mutationFn: (vendorId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.admin.vendors.delete(vendorId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
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
        queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
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
        queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
      },
    },
  };

  return useMutation(mutations[action]);
};

// ============================================
// MODERATOR QUERIES
// ============================================

/**
 * Get all moderators with filters and pagination
 * @param {Object} filters - Filter parameters
 * @param {Object} options - React Query options
 * @returns {Object} Query result with moderators list
 */
export const useAdminModerators = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ["admin", "moderators", filters],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.moderators.getAll,
        params: filters,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// ============================================
// MODERATOR MUTATIONS
// ============================================

/**
 * Moderator mutation hook factory
 * @param {string} action - Mutation action type
 * @returns {Object} Mutation hook
 */
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
        queryClient.invalidateQueries({ queryKey: ["admin", "moderators"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
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
        queryClient.invalidateQueries({ queryKey: ["admin", "moderators"] });
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
        queryClient.invalidateQueries({ queryKey: ["admin", "moderators"] });
      },
    },
    delete: {
      mutationFn: (moderatorId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.admin.moderators.delete(moderatorId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "moderators"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
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
        queryClient.invalidateQueries({ queryKey: ["admin", "moderators"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      },
    },
  };

  return useMutation(mutations[action]);
};

// ============================================
// WHITELABEL QUERIES
// ============================================

/**
 * Get all whitelabels with filters and pagination
 * @param {Object} filters - Filter parameters
 * @param {Object} options - React Query options
 * @returns {Object} Query result with whitelabels list
 */
export const useAdminWhitelabels = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ["admin", "whitelabels", filters],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.whitelabels.getAll,
        params: filters,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Get single whitelabel by ID
 * @param {string} whitelabelId - Whitelabel ID
 * @param {Object} options - React Query options
 * @returns {Object} Query result with whitelabel details
 */
export const useAdminWhitelabel = (whitelabelId, options = {}) => {
  return useQuery({
    queryKey: ["admin", "whitelabels", whitelabelId],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.whitelabels.getById(whitelabelId),
      }),
    enabled: !!whitelabelId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// ============================================
// WHITELABEL MUTATIONS
// ============================================

/**
 * Whitelabel mutation hook factory
 * @param {string} action - Mutation action type
 * @returns {Object} Mutation hook
 */
export const useAdminWhitelabelMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    updateStatus: {
      // Phase 4b W1-WL-EMAIL: callers can pass `dispatchSetupEmail: true`
      // alongside `status: 'active'` so the backend mints a fresh
      // password-setup token and emails the link in the same request
      // (D5 — atomic confirm-popup approval). Existing callers that
      // omit the flag keep the previous status-only behavior.
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
        queryClient.invalidateQueries({ queryKey: ["admin", "whitelabels"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "whitelabels", whitelabelId] });
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
        queryClient.invalidateQueries({ queryKey: ["admin", "whitelabels", whitelabelId] });
        queryClient.invalidateQueries({ queryKey: ["admin", "whitelabels"] });
      },
    },
    delete: {
      mutationFn: (whitelabelId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.admin.whitelabels.delete(whitelabelId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "whitelabels"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
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
        queryClient.invalidateQueries({ queryKey: ["admin", "whitelabels"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      },
    },
  };

  return useMutation(mutations[action]);
};

// ============================================
// ADMIN EVENT MUTATIONS
// ============================================

/**
 * Admin event mutation hook factory
 * @param {string} action - Mutation action type
 * @returns {Object} Mutation hook
 */
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
        queryClient.invalidateQueries({ queryKey: ["events"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
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
        queryClient.invalidateQueries({ queryKey: ["events"] });
      },
    },
    delete: {
      mutationFn: (eventId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.admin.events.delete(eventId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["events"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
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
        queryClient.invalidateQueries({ queryKey: ["events"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      },
    },
  };

  return useMutation(mutations[action]);
};

// ============================================
// ADMIN PLANS QUERIES & MUTATIONS
// ============================================

export const useAdminPlans = (options = {}) => {
  return useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.plans.adminGetAll,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
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
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
  });
};

// ============================================
// ADMIN PAYMENTS QUERIES
// ============================================

export const useAdminPayments = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ["admin", "payments", filters],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.payments.getAll,
        params: filters,
      }),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

// ============================================
// HOST PLANS QUERY
// ============================================

export const useHostPlans = (options = {}) => {
  return useQuery({
    queryKey: ["plans", "host"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.plans.getHostPlans,
      }),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
};

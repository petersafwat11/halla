"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

// ============================================
// USERS QUERIES
// ============================================

/**
 * Hook to fetch my profile
 * @returns {UseQueryResult}
 */
export const useMyProfile = (options = {}) => {
  return useQuery({
    queryKey: ["users", "my-profile"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.users.getMyProfile,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch notification preferences
 * @returns {UseQueryResult}
 */
export const useNotificationPreferences = (options = {}) => {
  return useQuery({
    queryKey: ["users", "notification-preferences"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.users.getNotificationPreferences,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch hosts (admin)
 * @param {Object} params - Query parameters
 * @returns {UseQueryResult}
 */
export const useHosts = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ["users", "hosts", params],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.users.getHosts,
        params,
      }),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch single host (admin)
 * @param {string} hostId
 * @returns {UseQueryResult}
 */
export const useHost = (hostId, options = {}) => {
  return useQuery({
    queryKey: ["users", "hosts", hostId],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.users.getHostById(hostId),
      }),
    enabled: !!hostId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch vendors (admin)
 * @param {Object} params - Query parameters
 * @returns {UseQueryResult}
 */
export const useVendors = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ["users", "vendors", params],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.users.getVendors,
        params,
      }),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch single vendor (admin)
 * @param {string} vendorId
 * @returns {UseQueryResult}
 */
export const useVendor = (vendorId, options = {}) => {
  return useQuery({
    queryKey: ["users", "vendors", vendorId],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.users.getVendorById(vendorId),
      }),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch moderators (admin)
 * @returns {UseQueryResult}
 */
export const useModerators = (options = {}) => {
  return useQuery({
    queryKey: ["users", "moderators"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.users.getModerators,
      }),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

// ============================================
// USERS MUTATIONS
// ============================================

/**
 * Unified Users Mutation Hook
 * @param {string} action - The user action to perform
 * @returns {UseMutationResult}
 */
export const useUserMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    // Update My Profile
    updateProfile: {
      mutationFn: (profileData) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.users.updateMyProfile,
          data: profileData,
          config: profileData instanceof FormData
            ? { headers: { "Content-Type": "multipart/form-data" } }
            : undefined,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users", "my-profile"] });
      },
    },

    // Update Profile Section
    updateProfileSection: {
      mutationFn: ({ section, data }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.users.updateMyProfileSection(section),
          data,
          config: data instanceof FormData
            ? { headers: { "Content-Type": "multipart/form-data" } }
            : undefined,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users", "my-profile"] });
      },
    },

    // Update Password
    updatePassword: {
      mutationFn: (passwordData) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.users.updateMyPassword,
          data: passwordData,
        }),
    },

    // Update Notification Preferences
    updateNotificationPreferences: {
      mutationFn: (preferences) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.users.updateNotificationPreferences,
          data: preferences,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users", "notification-preferences"] });
      },
    },

    // Send Email Verification Code
    sendVerificationCode: {
      mutationFn: () =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.sendVerificationCode,
        }),
    },

    // Verify Email
    verifyEmail: {
      mutationFn: (code) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.verifyEmail,
          data: { code },
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users", "my-profile"] });
      },
    },

    // Create Host (admin)
    createHost: {
      mutationFn: (hostData) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.users.createHost,
          data: hostData,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users", "hosts"] });
      },
    },

    // Delete Host (admin)
    deleteHost: {
      mutationFn: (hostId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.users.deleteHost(hostId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users", "hosts"] });
      },
    },

    // Update Host Status (admin)
    updateHostStatus: {
      mutationFn: ({ hostId, status }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.users.updateHostStatus(hostId),
          data: { status },
        }),
      onSuccess: (_, { hostId }) => {
        queryClient.invalidateQueries({ queryKey: ["users", "hosts", hostId] });
        queryClient.invalidateQueries({ queryKey: ["users", "hosts"] });
      },
    },

    // Update Vendor Status (admin)
    updateVendorStatus: {
      mutationFn: ({ vendorId, status, vendorStatus, rejectionReason }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.users.updateVendorStatus(vendorId),
          data: { status, vendorStatus, rejectionReason },
        }),
      onSuccess: (_, { vendorId }) => {
        queryClient.invalidateQueries({ queryKey: ["users", "vendors", vendorId] });
        queryClient.invalidateQueries({ queryKey: ["users", "vendors"] });
      },
    },

    // Create Moderator (admin)
    createModerator: {
      mutationFn: (moderatorData) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.users.createModerator,
          data: moderatorData,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users", "moderators"] });
      },
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown user action: ${action}`);
  }

  return useMutation({
    ...mutationConfig,
    onError: (error) => {
      console.error(`User mutation error (${action}):`, error);
    },
  });
};

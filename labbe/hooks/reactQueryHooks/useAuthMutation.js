"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import useAuthStore from "@/stores/authStore";

// ============================================
// COOKIE HELPERS
// ============================================
//
// B-1 fix: the access token is now exclusively delivered via the backend's
// HttpOnly `access_token` cookie (set by /auth/login, /auth/refresh, etc.).
// The previous JS-readable `token` cookie defeated the entire HttpOnly
// design — XSS could read it and forge `Authorization: Bearer …` against
// the API. We no longer write or read it from the JS layer.
//
// `userType` and `profileCompleted` remain JS-readable for client-side
// routing convenience (e.g. middleware deciding host-vs-vendor first paint).
// DO NOT use these as a trust signal — they are user-modifiable. The server
// is authoritative; every protected route re-derives role from the JWT.

const setAuthRoutingCookies = (userRole, profileCompleted = true) => {
  // userType / profileCompleted: client-side routing hints only. Server is
  // authoritative — never trust these for authorization decisions.
  Cookies.set("userType", userRole || "host", { expires: 7, sameSite: "lax" });
  Cookies.set("profileCompleted", profileCompleted ? "true" : "false", {
    expires: 7,
    sameSite: "lax",
  });
};

const clearAuthCookies = () => {
  // Clear legacy JS token cookie if any old session left it behind.
  Cookies.remove("token");
  Cookies.remove("userType");
  Cookies.remove("profileCompleted");
};

// ============================================
// AUTH MUTATIONS - ONBOARDING ONLY
// Only includes mutations needed for signup/onboarding flow
// ============================================

/**
 * Unified Auth Mutation Hook for Onboarding
 * @param {string} action - The auth action to perform
 * @returns {UseMutationResult}
 */
export const useAuthMutation = (action) => {
  const queryClient = useQueryClient();
  const { setAuth, logout, setOTPSent, setResetTokenSent, clearOTPState, setError } = useAuthStore();

  const mutations = {
    // Login - Email/Password
    login: {
      mutationFn: (credentials) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.login,
          data: credentials,
        }),
      onSuccess: (response) => {
        const { token, data } = response;
        const user = data?.user;
        const subscription = data?.subscription;
        const profileCompleted = user?.roleData?.profileCompleted ?? true;
        // The HttpOnly access_token / refresh_token cookies are set by the
        // backend response — we do NOT mirror them into a JS cookie.
        setAuthRoutingCookies(user?.role, profileCompleted);
        setAuth(user, token, subscription);

        return { user, profileCompleted };
      },
    },

    // Login - Send OTP
    sendLoginOTP: {
      mutationFn: (phoneNumber) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.sendLoginOTP,
          data: { phoneNumber },
        }),
      onSuccess: (response, phoneNumber) => {
        setOTPSent(phoneNumber, "login");
        return response.data;
      },
    },

    // Login - Verify OTP
    verifyLoginOTP: {
      mutationFn: ({ phoneNumber, otp }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.verifyLoginOTP,
          data: { phoneNumber, otp },
        }),
      onSuccess: (response) => {
        const { token, data } = response;
        const user = data?.user;
        const subscription = data?.subscription;
        const profileCompleted = data?.profileCompleted ?? true;

        setAuthRoutingCookies(user?.role, profileCompleted);
        setAuth(user, token, subscription);
        clearOTPState();

        return { user, isNewUser: false, profileCompleted };
      },
    },

    // Password Reset - Forgot Password
    forgotPassword: {
      mutationFn: (email) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.forgotPassword,
          data: { email },
        }),
      onSuccess: (response, email) => {
        setResetTokenSent(email);
        return response;
      },
    },

    // Password Reset - Reset Password
    resetPassword: {
      mutationFn: ({ token, password, passwordConfirm }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.auth.resetPassword(token),
          data: { password, passwordConfirm },
        }),
      onSuccess: (response) => {
        // Backend returns { status, token, refreshToken, data: { user } } —
        // we used to read response.data and treat it as the user, which left
        // role undefined and stored the wrapper object as the user.
        const newToken = response.token;
        const user = response.data?.user;
        setAuthRoutingCookies(user?.role, true);
        setAuth(user, newToken, null);
        useAuthStore.getState().clearResetState();
        return { user };
      },
    },

    // Host Signup - Step 1: Send OTP
    sendSignupOTP: {
      mutationFn: (phoneNumber) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.sendSignupOTP,
          data: { phoneNumber },
        }),
      onSuccess: (response, phoneNumber) => {
        setOTPSent(phoneNumber, "signup");
        return response.data;
      },
    },

    // Host Signup - Step 2: Verify OTP (creates account)
    verifySignupOTP: {
      mutationFn: ({ phoneNumber, otp }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.verifySignupOTP,
          data: { phoneNumber, otp },
        }),
      onSuccess: (response) => {
        const { token, data } = response;
        const user = data?.user;
        const subscription = data?.subscription;
        const profileCompleted = data?.profileCompleted ?? true;

        setAuthRoutingCookies(user?.role, profileCompleted);
        setAuth(user, token, subscription);
        clearOTPState();

        return { user, isNewUser: true, profileCompleted };
      },
    },

    // Vendor Signup (multi-step form with files)
    signupVendor: {
      mutationFn: (formData) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.vendorSignup,
          data: formData,
          config: {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        }),
    },

    // WhiteLabel Signup (multi-step form with files)
    signupWhiteLabel: {
      mutationFn: (formData) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.whitelabelSignup,
          data: formData,
          config: {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        }),
    },

    // Complete Host Profile (after OTP signup)
    completeProfile: {
      mutationFn: (profileData) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.auth.completeHostProfile,
          data: profileData,
        }),
      onSuccess: (response) => {
        const user = response.data?.user;
        // routing hint only (server is authoritative)
        Cookies.set("profileCompleted", "true", { expires: 7, sameSite: "lax" });
        useAuthStore.getState().updateUser(user);
        return { user };
      },
    },

    // Logout
    logout: {
      mutationFn: () =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.logout,
        }),
      onSuccess: () => {
        clearAuthCookies();
        logout();
        queryClient.clear();
      },
      onError: () => {
        clearAuthCookies();
        logout();
        queryClient.clear();
      },
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown auth action: ${action}`);
  }

  return useMutation({
    ...mutationConfig,
    onError: (error) => {
      const parsed = error.parsedError || {};
      setError({
        message: parsed.message || error.message || "An unexpected error occurred",
        code: parsed.code || null,
        field: parsed.field || null,
        status: parsed.status || null,
      });
    },
  });
};

// ============================================
// PLANS QUERIES - For WhiteLabel Plan Selection
// ============================================

/**
 * Hook to fetch all plans for WhiteLabel signup step 4
 * @returns {UseQueryResult}
 */
export const usePlans = (options = {}) => {
  return useQuery({
    queryKey: ["plans"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.plans.getPlans,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

/**
 * Hook to fetch enterprise plans for WhiteLabel
 * @returns {UseQueryResult}
 */
export const useEnterprisePlans = (options = {}) => {
  return useQuery({
    queryKey: ["plans", "enterprise"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.plans.getEnterprisePlans,
      }),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    ...options,
  });
};

export default useAuthMutation;

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import useAuthStore from "@/stores/authStore";
import { usersKeys } from "@/hooks/users/keys";

// Routing hints only — server is authoritative. Access/refresh tokens live in
// HttpOnly cookies set by the backend; JS must never read them.
const setAuthRoutingCookies = (
  userRole,
  profileCompleted = true,
  mustChangePassword = false
) => {
  Cookies.set("userType", userRole || "host", { expires: 7, sameSite: "lax" });
  Cookies.set("profileCompleted", profileCompleted ? "true" : "false", {
    expires: 7,
    sameSite: "lax",
  });
  // Routing hint for the middleware/host guard. Business accounts provisioned
  // by an admin may be flagged `mustChangePassword`; the server also enforces
  // this (403 PASSWORD_CHANGE_REQUIRED) — this cookie only drives UI routing.
  Cookies.remove("mustChangePassword");
};

const clearAuthCookies = () => {
  Cookies.remove("token");
  Cookies.remove("userType");
  Cookies.remove("profileCompleted");
  Cookies.remove("mustChangePassword");
};

export const useAuthMutation = (action) => {
  const queryClient = useQueryClient();
  const { setAuth, logout, setOTPSent, setResetTokenSent, clearOTPState, setError } = useAuthStore();

  const mutations = {
    login: {
      mutationFn: (credentials) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.login,
          data: credentials,
        }),
      onSuccess: (response) => {
        const { data } = response;
        const user = data?.user;
        const subscription = data?.subscription;
        const profileCompleted = user?.roleData?.profileCompleted ?? true;
        setAuthRoutingCookies(user?.role, profileCompleted, user?.mustChangePassword === true);
        setAuth(user, subscription);
        return { user, profileCompleted };
      },
    },

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

    verifyLoginOTP: {
      mutationFn: ({ phoneNumber, otp }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.verifyLoginOTP,
          data: { phoneNumber, otp },
        }),
      onSuccess: (response) => {
        const { data } = response;
        const user = data?.user;
        const subscription = data?.subscription;
        const profileCompleted = data?.profileCompleted ?? true;
        setAuthRoutingCookies(user?.role, profileCompleted, user?.mustChangePassword === true);
        setAuth(user, subscription);
        clearOTPState();
        return { user, isNewUser: false, profileCompleted };
      },
    },

    resendOTP: {
      mutationFn: ({ phoneNumber, type }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.resendOTP,
          data: { phoneNumber, type },
        }),
    },

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

    resetPassword: {
      mutationFn: ({ token, password, passwordConfirm }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.auth.resetPassword(token),
          data: { password, passwordConfirm },
        }),
      onSuccess: (response) => {
        const user = response.data?.user;
        setAuthRoutingCookies(user?.role, true);
        setAuth(user, null);
        useAuthStore.getState().clearResetState();
        return { user };
      },
    },

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

    verifySignupOTP: {
      mutationFn: ({ phoneNumber, otp }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.verifySignupOTP,
          data: { phoneNumber, otp },
        }),
      onSuccess: (response) => {
        const { data } = response;
        const user = data?.user;
        const subscription = data?.subscription;
        const profileCompleted = data?.profileCompleted ?? true;
        setAuthRoutingCookies(user?.role, profileCompleted, user?.mustChangePassword === true);
        setAuth(user, subscription);
        clearOTPState();
        return { user, isNewUser: true, profileCompleted };
      },
    },

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

    completeProfile: {
      mutationFn: (profileData) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.auth.completeHostProfile,
          data: profileData,
        }),
      onSuccess: (response) => {
        const user = response.data?.user;
        Cookies.set("profileCompleted", "true", { expires: 7, sameSite: "lax" });
        useAuthStore.getState().updateUser(user);
        return { user };
      },
    },

    sendVerificationCode: {
      mutationFn: () =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.sendVerificationCode,
        }),
    },

    verifyEmail: {
      mutationFn: (code) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.auth.verifyEmail,
          data: { code },
        }),
      onSuccess: (response) => {
        // Sync the persisted user snapshot immediately so every surface
        // reading the auth store sees `emailVerified: true` without
        // waiting for the profile refetch below.
        const verifiedUser = response?.data?.user;
        useAuthStore.getState().updateUser({
          ...(verifiedUser || {}),
          emailVerified: true,
        });
        queryClient.invalidateQueries({ queryKey: usersKeys.myProfile() });
      },
    },

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

export default useAuthMutation;

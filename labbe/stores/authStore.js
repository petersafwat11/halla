"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ============================================
// USER ROLES (matching backend constants)
// ============================================

export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MODERATOR: "moderator",
  HOST: "host",
  VENDOR: "vendor",
};

export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
  SUSPENDED: "suspended",
  REJECTED: "rejected",
};

// ============================================
// AUTH STORE - STATE ONLY
// All API logic moved to hooks/auth/mutations.js
//
// Tokens live in HttpOnly cookies (`access_token`, `refresh_token`).
// JS never reads them — the store therefore holds no `token` field
// (Phase 6 alignment with mobile, which uses secure-store for refresh
// and keeps access in-memory).
//
// `status` is the canonical 4-state machine shared with mobile:
//   checking → loading → authenticated | unauthenticated
// On the web side the localStorage rehydration is synchronous, so
// `checking` is effectively a single frame on initial mount; we still
// expose the same vocabulary so cross-app components can read one
// shape (`@halla/shared/schemas/auth` → `authStoreSnapshotSchema`).
// ============================================

const useAuthStore = create(
  persist(
    (set, get) => ({
      // ============ STATE ============
      user: null,
      subscription: null,
      // 'checking' | 'loading' | 'authenticated' | 'unauthenticated'
      status: "checking",
      error: null,

      // OTP State
      otpSent: false,
      otpPhone: null,
      otpType: null, // "signup" or "login"

      // Password Reset State
      resetTokenSent: false,
      resetEmail: null,

      // ============ COMPUTED GETTERS ============
      getUserRole: () => get().user?.role || null,

      isAdmin: () => {
        const role = get().user?.role;
        return [
          USER_ROLES.SUPER_ADMIN,
          USER_ROLES.ADMIN,
          USER_ROLES.MODERATOR,
        ].includes(role);
      },

      isHost: () => get().user?.role === USER_ROLES.HOST,

      isVendor: () => get().user?.role === USER_ROLES.VENDOR,

      getSubscription: () => get().subscription,

      isProfileComplete: () => get().user?.roleData?.profileCompleted ?? true,

      // ============ STATE SETTERS ============
      setUser: (user) => set({ user }),

      setSubscription: (subscription) => set({ subscription }),

      setStatus: (status) => set({ status }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // OTP State Setters
      setOTPSent: (phoneNumber, type) =>
        set({ otpSent: true, otpPhone: phoneNumber, otpType: type }),

      clearOTPState: () =>
        set({ otpSent: false, otpPhone: null, otpType: null }),

      // Reset State Setters
      setResetTokenSent: (email) =>
        set({ resetTokenSent: true, resetEmail: email }),

      clearResetState: () =>
        set({ resetTokenSent: false, resetEmail: null }),

      // ============ AUTH STATE ACTIONS ============

      /**
       * Set authenticated user after successful login/signup.
       * The access token is no longer tracked client-side — it lives in
       * the HttpOnly `access_token` cookie set by the backend.
       */
      setAuth: (user, subscription = null) => {
        set({
          user,
          subscription,
          status: "authenticated",
          error: null,
        });
      },

      /**
       * Update user data
       */
      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : userData,
        }));
      },

      /**
       * Logout - revoke server-side refresh token and clear local state.
       *
       * Calls /auth/logout (best-effort, non-throwing) so the backend
       * revokes the refresh row and clears HttpOnly cookies, THEN clears
       * local state regardless of network outcome. Without the backend
       * call a stolen cookie could keep refreshing access tokens until
       * the 30-day TTL.
       */
      logout: async () => {
        if (typeof window !== "undefined") {
          try {
            // Lazy-load to avoid a circular import between the store and
            // the API client (which already imports the store indirectly).
            const { apiRequest } = await import("@/services/http");
            const { API_PATHS } = await import("@halla/shared/api/paths");
            await apiRequest({ method: "POST", path: API_PATHS.auth.logout });
          } catch (err) {
            // Network/other failure: still clear local state. Server-side
            // revocation will eventually catch up on next /auth/refresh
            // (replay detection) or on TTL expiry.
            // eslint-disable-next-line no-console
            console.warn("[authStore.logout] backend revoke failed:", err?.message);
          }
        }

        set({
          user: null,
          subscription: null,
          status: "unauthenticated",
          error: null,
          otpSent: false,
          otpPhone: null,
          otpType: null,
          resetTokenSent: false,
          resetEmail: null,
        });

        if (typeof window !== "undefined") {
          const { cookieUtils } = await import("@/utils/cookieUtils");
          cookieUtils.clearAuthCookies();
          const { clearQueryCache } = await import("@/providers/ReactQueryProvider");
          clearQueryCache();
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // Persist only the durable slice. `status` is derived on rehydrate
      // so a returning visitor with a cached `user` is immediately
      // "authenticated" without an extra round-trip; a cleared cache
      // lands in "unauthenticated". Tokens are never persisted (cookies).
      partialize: (state) => ({
        user: state.user,
        subscription: state.subscription,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.status = state.user ? "authenticated" : "unauthenticated";
      },
    },
  ),
);

export default useAuthStore;

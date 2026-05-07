import { create } from "zustand";
import {
  loginWithEmailAPI,
  sendOTPAPI,
  verifyOTPAPI,
  resendOTPAPI,
  signupWithPhoneAPI,
  verifySignupOTPAPI,
  signupVendorAPI,
  completeProfileAPI,
  forgotPasswordAPI,
  logoutAPI,
  refreshTokenAPI,
} from "../services/authService";
import {
  saveRefreshToken,
  loadRefreshToken,
  clearRefreshToken,
  saveUserShadow,
  loadUserShadow,
  clearUserShadow,
} from "../services/secureStorage";

/**
 * Phase 1a auth store (mobile).
 *
 * - Refresh token: expo-secure-store (FLOW-01-F03).
 * - Access token: in-memory only (`token` field below). Never written to
 *   AsyncStorage.
 * - User shadow: a thin copy of the last known user object is mirrored to
 *   secure storage so cold-launch UX shows "Welcome back" without waiting on
 *   the network round-trip. The shadow is always reconciled by `/auth/me`
 *   before any privileged action.
 * - Role: derived strictly from the server response. The previous
 *   `user.role || "vendor"` / `|| "host"` fallbacks (FLOW-05-F02) are gone —
 *   a missing role surfaces as an authentication error.
 */

const initialState = {
  user: null,
  token: null,
  refreshToken: null,
  role: null,
  // 'checking' | 'loading' | 'authenticated' | 'unauthenticated'
  status: "checking",
  error: null,
  tempMobile: null,
};

const requireRole = (user) => {
  const role = user?.role;
  if (!role) {
    throw new Error("Server response is missing user.role");
  }
  return role;
};

export const useAuthStore = create((set, get) => ({
  ...initialState,

  /**
   * Cold-launch session restore.
   *
   * Reads the refresh token from secure storage, asks the backend to rotate
   * it (which also returns the latest `user` snapshot). On any failure we
   * land in `unauthenticated` — there is no fallback to a stale local copy,
   * by design: if the server says we're out, we're out.
   */
  restoreSession: async () => {
    try {
      const refreshToken = await loadRefreshToken();
      if (!refreshToken) {
        set({ status: "unauthenticated" });
        return;
      }

      const fresh = await refreshTokenAPI(refreshToken);
      const role = requireRole(fresh.user);

      // Persist the rotated refresh token immediately.
      await saveRefreshToken(fresh.refreshToken);
      await saveUserShadow(fresh.user);

      set({
        user: fresh.user,
        token: fresh.accessToken,
        refreshToken: fresh.refreshToken,
        role,
        status: "authenticated",
        error: null,
      });
    } catch (error) {
      console.error("[AUTH] restoreSession failed:", error?.message);
      await clearRefreshToken();
      await clearUserShadow();
      set({
        ...initialState,
        status: "unauthenticated",
        error: error?.message || null,
      });
    }
  },

  /**
   * Persist the post-login token pair.
   * Refresh → secure storage. Access → memory only.
   */
  _persistAuth: async ({ user, accessToken, refreshToken, role }) => {
    if (refreshToken) await saveRefreshToken(refreshToken);
    if (user) await saveUserShadow(user);
    set({
      user,
      token: accessToken,
      refreshToken,
      role,
      status: "authenticated",
      error: null,
    });
  },

  loginWithEmail: async ({ email, password }) => {
    set({ status: "loading", error: null });
    try {
      const { token, refreshToken, user } = await loginWithEmailAPI({ email, password });
      const role = requireRole(user);
      await get()._persistAuth({ user, accessToken: token, refreshToken, role });
      return { success: true };
    } catch (error) {
      set({ status: "unauthenticated", error: error.message || "Login failed" });
      return { success: false, error: error.message };
    }
  },

  sendOTP: async ({ mobile, type = "login" }) => {
    set({ status: "loading", error: null, tempMobile: mobile });
    try {
      await sendOTPAPI({ mobile, type });
      set({ status: "unauthenticated", error: null });
      return { success: true };
    } catch (error) {
      set({ status: "unauthenticated", error: error.message || "Failed to send OTP" });
      return { success: false, error: error.message };
    }
  },

  resendOTP: async ({ type = "login" } = {}) => {
    const { tempMobile } = get();
    if (!tempMobile) return { success: false, error: "Mobile number not found" };
    try {
      await resendOTPAPI({ mobile: tempMobile, type });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || "Failed to resend OTP" };
    }
  },

  verifyOTP: async ({ otp }) => {
    const { tempMobile } = get();
    if (!tempMobile) return { success: false, error: "Mobile number not found" };

    set({ status: "loading", error: null });
    try {
      const { token, refreshToken, user } = await verifyOTPAPI({ mobile: tempMobile, otp });
      const role = requireRole(user);
      await get()._persistAuth({ user, accessToken: token, refreshToken, role });
      set({ tempMobile: null });
      return { success: true };
    } catch (error) {
      set({ status: "unauthenticated", error: error.message || "Invalid OTP" });
      return { success: false, error: error.message };
    }
  },

  signupWithPhone: async ({ mobile }) => {
    set({ status: "loading", error: null, tempMobile: mobile });
    try {
      await signupWithPhoneAPI({ mobile });
      set({ status: "unauthenticated", error: null });
      return { success: true };
    } catch (error) {
      set({ status: "unauthenticated", error: error.message || "Signup failed", tempMobile: null });
      return { success: false, error: error.message };
    }
  },

  verifySignupOTP: async ({ otp }) => {
    const { tempMobile } = get();
    if (!tempMobile) return { success: false, error: "Mobile number not found" };

    set({ status: "loading", error: null });
    try {
      const { token, refreshToken, user } = await verifySignupOTPAPI({
        mobile: tempMobile,
        otp,
      });
      // H-4 fix: persist the refresh token to secure-store IMMEDIATELY.
      //
      // The previous "hold in memory until completeProfile" approach
      // orphaned the server-side refresh row whenever the user backgrounded
      // the app between OTP verification and profile completion: the
      // backend already issued a 30-day refresh token, but mobile threw
      // away its only copy on cold-launch.
      //
      // The user is now in an "authenticated but profile-incomplete"
      // state. Downstream guards (`requireRole`, profile-completion gate)
      // are responsible for routing such users back to the
      // complete-profile screen — we do NOT use the absence of a stored
      // refresh token as that signal anymore.
      const role = requireRole(user);
      await get()._persistAuth({
        user,
        accessToken: token,
        refreshToken,
        role,
      });
      return { success: true };
    } catch (error) {
      set({ status: "unauthenticated", error: error.message || "Invalid OTP" });
      return { success: false, error: error.message };
    }
  },

  completeProfile: async ({ fullName, email, password }) => {
    const { token } = get();
    if (!token) return { success: false, error: "No signup token found" };

    set({ status: "loading", error: null });
    try {
      const result = await completeProfileAPI({
        username: fullName,
        email,
        password,
        token,
      });
      const role = requireRole(result.user);
      await get()._persistAuth({
        user: result.user,
        accessToken: result.token,
        refreshToken: result.refreshToken,
        role,
      });
      set({ tempMobile: null });
      return { success: true };
    } catch (error) {
      set({ status: "unauthenticated", error: error.message || "Failed to complete profile" });
      return { success: false, error: error.message };
    }
  },

  signupVendor: async (vendorData) => {
    set({ status: "loading", error: null });
    try {
      const { token, refreshToken, user } = await signupVendorAPI(vendorData);
      // Vendors are pending approval until an admin acts; backend returns
      // null tokens. If a token does come back (admin auto-approve) persist;
      // otherwise the vendor stays unauthenticated.
      if (token && refreshToken) {
        const role = requireRole(user);
        await get()._persistAuth({ user, accessToken: token, refreshToken, role });
      } else {
        set({
          user,
          status: "unauthenticated",
          error: null,
        });
      }
      return { success: true };
    } catch (error) {
      set({ status: "unauthenticated", error: error.message || "Vendor signup failed" });
      return { success: false, error: error.message };
    }
  },

  forgotPassword: async ({ email }) => {
    set({ status: "loading", error: null });
    try {
      await forgotPasswordAPI({ email });
      set({ status: "unauthenticated", error: null });
      return { success: true };
    } catch (error) {
      set({
        status: "unauthenticated",
        error: error.message || "Failed to send reset email",
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Rotate tokens explicitly. Used by the API layer on 401 retry.
   * Returns the new access token (or null on failure).
   */
  refreshTokens: async () => {
    try {
      const stored = get().refreshToken || (await loadRefreshToken());
      if (!stored) {
        await get().logout();
        return null;
      }
      const fresh = await refreshTokenAPI(stored);
      const role = requireRole(fresh.user);
      await saveRefreshToken(fresh.refreshToken);
      await saveUserShadow(fresh.user);
      set({
        user: fresh.user,
        token: fresh.accessToken,
        refreshToken: fresh.refreshToken,
        role,
        status: "authenticated",
      });
      return fresh.accessToken;
    } catch (error) {
      console.error("[AUTH] refreshTokens failed:", error?.message);
      await get().logout();
      return null;
    }
  },

  logout: async () => {
    const { token, refreshToken } = get();
    try {
      await logoutAPI({ accessToken: token, refreshToken });
    } catch (e) {
      // already swallowed in service; defensive.
    }
    await clearRefreshToken();
    await clearUserShadow();
    set({
      ...initialState,
      status: "unauthenticated",
    });
  },

  setUser: async (updatedUser) => {
    set({ user: updatedUser });
    if (updatedUser) await saveUserShadow(updatedUser);
  },

  clearError: () => set({ error: null }),

  getTempMobile: () => get().tempMobile,

  /**
   * Role-based getters. Returns `false` (not undefined) when role is unset.
   */
  isHost: () => get().role === "host",
  isVendor: () => get().role === "vendor",
  isAdmin: () => ["super_admin", "admin", "moderator"].includes(get().role),
  isWhitelabel: () => ["whitelabel_admin", "whitelabel_moderator"].includes(get().role),
  isAdminDashboardRole: () =>
    ["super_admin", "admin", "moderator", "whitelabel_admin", "whitelabel_moderator"].includes(
      get().role,
    ),
  getRole: () => get().role,
}));

// Optional helper for legacy code paths that previewed the cached user before
// `restoreSession` resolved. Kept exported so tests can read it without
// importing the secure-storage module directly.
export const _peekUserShadow = loadUserShadow;

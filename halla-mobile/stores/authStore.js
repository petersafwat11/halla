import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  loginWithEmailAPI,
  sendOTPAPI,
  verifyOTPAPI,
  signupWithPhoneAPI,
  verifySignupOTPAPI,
  signupVendorAPI,
  completeProfileAPI,
  forgotPasswordAPI,
  logoutAPI,
  refreshTokenAPI,
} from "../services/authService";

const AUTH_STORAGE_KEY = "@auth_state";

// Initial state
const initialState = {
  user: null,
  token: null,
  role: null, // 'host' | 'vendor' | 'super_admin' | 'admin' | 'moderator' | 'whitelabel_admin' | 'whitelabel_moderator'
  // 'checking' | 'loading' | 'authenticated' | 'unauthenticated'
  // 'checking' is used only while restoring session on app start
  status: "checking",
  error: null,
  // Temporary storage for multi-step flows
  tempMobile: null,
};

export const useAuthStore = create((set, get) => ({
  ...initialState,

  /**
   * Restore session from AsyncStorage on app start
   */
  restoreSession: async () => {
    try {
      const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        const { user, token, role } = JSON.parse(storedAuth);
        set({
          user,
          token,
          role,
          status: "authenticated",
          error: null,
        });
        console.log("Session restored:", user, "Role:", role);
      } else {
        set({ status: "unauthenticated" });
      }
    } catch (error) {
      console.error("Failed to restore session:", error);
      set({ status: "unauthenticated", error: error.message });
    }
  },

  /**
   * Persist auth state to AsyncStorage
   */
  persistAuth: async (user, token, role) => {
    try {
      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ user, token, role }),
      );
    } catch (error) {
      console.error("Failed to persist auth:", error);
    }
  },

  /**
   * Login with email and password (Vendors/Admins)
   */
  loginWithEmail: async ({ email, password }) => {
    set({ status: "loading", error: null });
    try {
      const { token, user } = await loginWithEmailAPI({ email, password });
      const role = user.role || "vendor"; // Default to vendor if not specified
      await get().persistAuth(user, token, role);
      set({
        user,
        token,
        role,
        status: "authenticated",
        error: null,
      });
      return { success: true };
    } catch (error) {
      set({
        status: "unauthenticated",
        error: error.message || "Login failed",
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Send OTP to mobile number (for host login)
   */
  sendOTP: async ({ mobile, type = "login" }) => {
    set({ status: "loading", error: null, tempMobile: mobile });
    try {
      await sendOTPAPI({ mobile, type });
      set({ status: "unauthenticated", error: null });
      return { success: true };
    } catch (error) {
      set({
        status: "unauthenticated",
        error: error.message || "Failed to send OTP",
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Verify OTP and login (Host)
   */
  verifyOTP: async ({ otp }) => {
    const { tempMobile } = get();
    if (!tempMobile) {
      return { success: false, error: "Mobile number not found" };
    }

    set({ status: "loading", error: null });
    try {
      const { token, user } = await verifyOTPAPI({ mobile: tempMobile, otp });
      const role = user.role || "host"; // Default to host for OTP login
      await get().persistAuth(user, token, role);
      set({
        user,
        token,
        role,
        status: "authenticated",
        error: null,
        tempMobile: null,
      });
      return { success: true };
    } catch (error) {
      set({
        status: "unauthenticated",
        error: error.message || "Invalid OTP",
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Step 1: Signup with phone number only (Host)
   */
  signupWithPhone: async ({ mobile }) => {
    console.log("[AUTH STORE] Sending OTP for signup");
    set({ status: "loading", error: null, tempMobile: mobile });
    try {
      await signupWithPhoneAPI({ mobile });
      console.log("[AUTH STORE] OTP sent for signup");
      set({
        status: "unauthenticated",
        error: null,
      });
      return { success: true };
    } catch (error) {
      console.log("[AUTH STORE] Signup failed:", error.message);
      set({
        status: "unauthenticated",
        error: error.message || "Signup failed",
        tempMobile: null,
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Step 2: Verify OTP for signup (Host)
   */
  verifySignupOTP: async ({ otp }) => {
    const { tempMobile } = get();
    if (!tempMobile) {
      return { success: false, error: "Mobile number not found" };
    }

    set({ status: "loading", error: null });
    try {
      const { token, user } = await verifySignupOTPAPI({
        mobile: tempMobile,
        otp,
      });
      // Store token temporarily for completing profile
      set({
        token,
        user,
        status: "unauthenticated",
        error: null,
      });
      return { success: true };
    } catch (error) {
      set({
        status: "unauthenticated",
        error: error.message || "Invalid OTP",
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Step 3: Complete profile with email, fullName, password (Host)
   */
  completeProfile: async ({ fullName, email, password }) => {
    const { token } = get();
    if (!token) {
      return { success: false, error: "No signup token found" };
    }

    set({ status: "loading", error: null });
    try {
      const { token: newToken, user } = await completeProfileAPI({
        username: fullName,
        email,
        password,
        token,
      });
      const role = user.role || "host";
      await get().persistAuth(user, newToken, role);
      set({
        user,
        token: newToken,
        role,
        status: "authenticated",
        error: null,
        tempMobile: null,
      });
      return { success: true };
    } catch (error) {
      set({
        status: "unauthenticated",
        error: error.message || "Failed to complete profile",
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Vendor signup with email and password
   */
  signupVendor: async (vendorData) => {
    set({ status: "loading", error: null });
    try {
      const { token, user } = await signupVendorAPI(vendorData);
      const role = user.role || "vendor";
      await get().persistAuth(user, token, role);
      set({
        user,
        token,
        role,
        status: "authenticated",
        error: null,
      });
      return { success: true };
    } catch (error) {
      set({
        status: "unauthenticated",
        error: error.message || "Vendor signup failed",
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Request password reset
   */
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
   * Refresh token
   */
  refreshToken: async () => {
    const { token } = get();
    if (!token) {
      return { success: false, error: "No token found" };
    }

    try {
      const { token: newToken, user } = await refreshTokenAPI(token);
      const role = user.role || get().role;
      await get().persistAuth(user, newToken, role);
      set({
        user,
        token: newToken,
        role,
        error: null,
      });
      return { success: true };
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Token refresh failed, logout user
      await get().logout();
      return { success: false, error: error.message };
    }
  },

  /**
   * Logout user
   */
  logout: async () => {
    const { token } = get();
    try {
      await logoutAPI(token);
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      set({
        ...initialState,
        status: "unauthenticated",
      });
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local state even if API call fails
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      set({
        ...initialState,
        status: "unauthenticated",
      });
    }
  },

  /**
   * Update user data in store and persist
   */
  setUser: async (updatedUser) => {
    const { token, role } = get();
    set({ user: updatedUser });
    await get().persistAuth(updatedUser, token, role);
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),

  /**
   * Get temp mobile (for multi-step flows)
   */
  getTempMobile: () => get().tempMobile,

  /**
   * Role-based getters
   */
  isHost: () => get().role === "host",
  isVendor: () => get().role === "vendor",
  isAdmin: () =>
    ["super_admin", "admin", "moderator"].includes(get().role),
  isWhitelabel: () =>
    ["whitelabel_admin", "whitelabel_moderator"].includes(get().role),
  isAdminDashboardRole: () =>
    ["super_admin", "admin", "moderator", "whitelabel_admin", "whitelabel_moderator"].includes(get().role),
  getRole: () => get().role,
}));

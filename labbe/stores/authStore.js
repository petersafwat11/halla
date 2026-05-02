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
  WHITELABEL_ADMIN: "whitelabel_admin",
  WHITELABEL_MODERATOR: "whitelabel_moderator",
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
// All API logic moved to hooks/auth/useAuthMutation.js
// ============================================

const useAuthStore = create(
  persist(
    (set, get) => ({
      // ============ STATE ============
      user: null,
      token: null,
      subscription: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // OTP State
      otpSent: false,
      otpPhone: null,
      otpType: null, // "signup" or "login"

      // Password Reset State
      resetTokenSent: false,
      resetEmail: null,

      // Setup Token State (Whitelabel)
      setupTokenValid: false,
      setupTokenData: null,

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
      
      isWhitelabel: () => {
        const role = get().user?.role;
        return [
          USER_ROLES.WHITELABEL_ADMIN,
          USER_ROLES.WHITELABEL_MODERATOR,
        ].includes(role);
      },
      
      getSubscription: () => get().subscription,
      
      isProfileComplete: () => get().user?.roleData?.profileCompleted ?? true,

      // ============ STATE SETTERS ============
      setUser: (user) => set({ user }),
      
      setToken: (token) => set({ token }),
      
      setSubscription: (subscription) => set({ subscription }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
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

      // Setup Token Setters
      setSetupTokenValid: (data) => 
        set({ setupTokenValid: true, setupTokenData: data }),
      
      clearSetupState: () => 
        set({ setupTokenValid: false, setupTokenData: null }),

      // ============ AUTH STATE ACTIONS ============
      
      /**
       * Set authenticated user after successful login/signup
       */
      setAuth: (user, token, subscription = null) => {
        set({
          user,
          token,
          subscription,
          isAuthenticated: true,
          isLoading: false,
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
       * Logout - Clear all auth state
       */
      logout: () => {
        set({
          user: null,
          token: null,
          subscription: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          otpSent: false,
          otpPhone: null,
          otpType: null,
          resetTokenSent: false,
          resetEmail: null,
          setupTokenValid: false,
          setupTokenData: null,
        });
      },

      /**
       * Initialize auth state (called on app mount)
       */
      initializeAuth: (token) => {
        if (token) {
          set({ token });
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        subscription: state.subscription,
      }),
    },
  ),
);

export default useAuthStore;

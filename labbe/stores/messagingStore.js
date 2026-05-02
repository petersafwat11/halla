/**
 * Messaging Store
 * Zustand store for SMS/WhatsApp invitation state management
 */

import { create } from "zustand";
import messagingService from "@/services/messaging";

const useMessagingStore = create((set, get) => ({
  // State
  isLoading: false,
  isSending: false,
  error: null,
  stats: null,
  balance: null,
  selectedGuests: [],
  selectedChannel: "sms",
  sendProgress: {
    total: 0,
    successful: 0,
    failed: 0,
    inProgress: false,
  },

  // Actions
  setSelectedChannel: (channel) => set({ selectedChannel: channel }),

  setSelectedGuests: (guests) => set({ selectedGuests: guests }),

  toggleGuestSelection: (guestId) => {
    const { selectedGuests } = get();
    const isSelected = selectedGuests.includes(guestId);
    set({
      selectedGuests: isSelected
        ? selectedGuests.filter((id) => id !== guestId)
        : [...selectedGuests, guestId],
    });
  },

  selectAllGuests: (guestIds) => set({ selectedGuests: guestIds }),

  clearSelection: () => set({ selectedGuests: [] }),

  clearError: () => set({ error: null }),

  // API Actions
  sendInvitation: async (guestId, eventId, channel) => {
    set({ isSending: true, error: null });
    try {
      const result = await messagingService.sendInvitation(
        guestId,
        eventId,
        channel || get().selectedChannel
      );
      set({ isSending: false });
      return result;
    } catch (error) {
      set({
        isSending: false,
        error: error.response?.data?.message || error.message,
      });
      throw error;
    }
  },

  sendBulkInvitations: async (eventId) => {
    const { selectedGuests, selectedChannel } = get();

    if (selectedGuests.length === 0) {
      set({ error: "No guests selected" });
      return null;
    }

    set({
      isSending: true,
      error: null,
      sendProgress: {
        total: selectedGuests.length,
        successful: 0,
        failed: 0,
        inProgress: true,
      },
    });

    try {
      const result = await messagingService.sendBulkInvitations(
        selectedGuests,
        eventId,
        selectedChannel
      );

      set({
        isSending: false,
        sendProgress: {
          total: result.data?.total || selectedGuests.length,
          successful: result.data?.successful || 0,
          failed: result.data?.failed || 0,
          inProgress: false,
        },
        selectedGuests: [],
      });

      return result;
    } catch (error) {
      set({
        isSending: false,
        error: error.response?.data?.message || error.message,
        sendProgress: { ...get().sendProgress, inProgress: false },
      });
      throw error;
    }
  },

  retryFailedInvitations: async (eventId) => {
    const { selectedChannel } = get();
    set({ isSending: true, error: null });

    try {
      const result = await messagingService.retryFailedInvitations(
        eventId,
        selectedChannel
      );
      set({ isSending: false });
      return result;
    } catch (error) {
      set({
        isSending: false,
        error: error.response?.data?.message || error.message,
      });
      throw error;
    }
  },

  sendTestInvitation: async (phoneNumber, eventId) => {
    const { selectedChannel } = get();
    set({ isSending: true, error: null });

    try {
      const result = await messagingService.sendTestInvitation(
        phoneNumber,
        eventId,
        selectedChannel
      );
      set({ isSending: false });
      return result;
    } catch (error) {
      set({
        isSending: false,
        error: error.response?.data?.message || error.message,
      });
      throw error;
    }
  },

  sendReminder: async (eventId, customMessage = null) => {
    const { selectedChannel } = get();
    set({ isSending: true, error: null });

    try {
      const result = await messagingService.sendReminder(
        eventId,
        selectedChannel,
        customMessage
      );
      set({ isSending: false });
      return result;
    } catch (error) {
      set({
        isSending: false,
        error: error.response?.data?.message || error.message,
      });
      throw error;
    }
  },

  fetchStats: async (eventId) => {
    set({ isLoading: true, error: null });

    try {
      const result = await messagingService.getInvitationStats(eventId);
      set({
        isLoading: false,
        stats: result.data,
      });
      return result;
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || error.message,
      });
      throw error;
    }
  },

  fetchBalance: async () => {
    set({ isLoading: true, error: null });

    try {
      const result = await messagingService.checkBalance();
      set({
        isLoading: false,
        balance: result.data,
      });
      return result;
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || error.message,
      });
      throw error;
    }
  },

  // Reset store
  reset: () =>
    set({
      isLoading: false,
      isSending: false,
      error: null,
      stats: null,
      balance: null,
      selectedGuests: [],
      selectedChannel: "sms",
      sendProgress: {
        total: 0,
        successful: 0,
        failed: 0,
        inProgress: false,
      },
    }),
}));

export default useMessagingStore;

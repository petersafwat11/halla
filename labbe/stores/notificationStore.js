/**
 * Notification Store
 * Zustand store for managing notification state
 */

import { create } from "zustand";
import { notificationService } from "@/services/notification";

// ============================================
// STORE CONFIGURATION
// ============================================

const POLLING_INTERVAL = 30000; // 30 seconds
const DEFAULT_LIMIT = 20;

// ============================================
// NOTIFICATION STORE
// ============================================

const useNotificationStore = create((set, get) => ({
  // ==========================================
  // STATE
  // ==========================================

  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  pagination: {
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    pages: 0,
    hasMore: false,
  },

  // Polling
  pollingInterval: null,

  // ==========================================
  // ACTIONS
  // ==========================================

  /**
   * Fetch notifications with pagination
   * @param {Object} options - Fetch options
   * @param {boolean} options.refresh - Reset pagination and fetch fresh
   * @param {boolean} options.loadMore - Load next page
   * @param {string} options.type - Filter by type
   * @param {boolean} options.isRead - Filter by read status
   */
  fetchNotifications: async (options = {}) => {
    const { refresh = false, loadMore = false, type, isRead } = options;
    const state = get();

    // Prevent duplicate requests
    if (state.isLoading || (loadMore && state.isLoadingMore)) return;

    // Don't load more if no more pages
    if (loadMore && !state.pagination.hasMore) return;

    const isLoadingState = loadMore
      ? { isLoadingMore: true }
      : { isLoading: true };
    set({ ...isLoadingState, error: null });

    try {
      const page = refresh ? 1 : loadMore ? state.pagination.page + 1 : 1;

      const response = await notificationService.getNotifications({
        page,
        limit: DEFAULT_LIMIT,
        type,
        isRead,
      });

      if (response.status === "success") {
        const { notifications, pagination } = response.data;

        set((prevState) => ({
          notifications: loadMore
            ? [...prevState.notifications, ...notifications]
            : notifications,
          pagination: {
            ...pagination,
            hasMore: pagination.page < pagination.pages,
          },
          isLoading: false,
          isLoadingMore: false,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      set({
        error: error.message || "Failed to fetch notifications",
        isLoading: false,
        isLoadingMore: false,
      });
    }
  },

  /**
   * Fetch unread count (lightweight)
   */
  fetchUnreadCount: async () => {
    try {
      const response = await notificationService.getUnreadCount();

      if (response.status === "success") {
        set({ unreadCount: response.data.unreadCount });
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  },

  /**
   * Mark single notification as read
   * @param {string} id - Notification ID
   */
  markAsRead: async (id) => {
    try {
      const response = await notificationService.markAsRead(id);

      if (response.status === "success") {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    try {
      const response = await notificationService.markAllAsRead();

      if (response.status === "success") {
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            isRead: true,
            readAt: new Date().toISOString(),
          })),
          unreadCount: 0,
        }));
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  },

  /**
   * Delete single notification
   * @param {string} id - Notification ID
   */
  deleteNotification: async (id) => {
    try {
      const response = await notificationService.deleteNotification(id);

      if (response.status === "success") {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          const wasUnread = notification && !notification.isRead;

          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: wasUnread
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
            pagination: {
              ...state.pagination,
              total: Math.max(0, state.pagination.total - 1),
            },
          };
        });
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  },

  /**
   * Clear all notifications
   */
  clearAll: async () => {
    try {
      const response = await notificationService.clearAllNotifications();

      if (response.status === "success") {
        set({
          notifications: [],
          unreadCount: 0,
          pagination: {
            page: 1,
            limit: DEFAULT_LIMIT,
            total: 0,
            pages: 0,
            hasMore: false,
          },
        });
      }
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  },

  /**
   * Add new notification (for real-time updates)
   * @param {Object} notification - New notification object
   */
  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
      pagination: {
        ...state.pagination,
        total: state.pagination.total + 1,
      },
    }));
  },

  /**
   * Start polling for new notifications
   */
  startPolling: () => {
    const state = get();

    // Clear existing interval if any
    if (state.pollingInterval) {
      clearInterval(state.pollingInterval);
    }

    // Initial fetch
    get().fetchUnreadCount();

    // Start polling
    const interval = setInterval(() => {
      get().fetchUnreadCount();
    }, POLLING_INTERVAL);

    set({ pollingInterval: interval });
  },

  /**
   * Stop polling
   */
  stopPolling: () => {
    const state = get();

    if (state.pollingInterval) {
      clearInterval(state.pollingInterval);
      set({ pollingInterval: null });
    }
  },

  /**
   * Reset store state
   */
  reset: () => {
    const state = get();

    if (state.pollingInterval) {
      clearInterval(state.pollingInterval);
    }

    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      pagination: {
        page: 1,
        limit: DEFAULT_LIMIT,
        total: 0,
        pages: 0,
        hasMore: false,
      },
      pollingInterval: null,
    });
  },

  // ==========================================
  // SELECTORS (Computed values)
  // ==========================================

  /**
   * Get unread notifications
   */
  getUnreadNotifications: () => {
    return get().notifications.filter((n) => !n.isRead);
  },

  /**
   * Get notifications by type
   * @param {string} type - Notification type
   */
  getNotificationsByType: (type) => {
    return get().notifications.filter((n) => n.type === type);
  },

  /**
   * Check if has unread notifications
   */
  hasUnread: () => {
    return get().unreadCount > 0;
  },
}));

export default useNotificationStore;

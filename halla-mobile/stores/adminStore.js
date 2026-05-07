import { create } from "zustand";
import adminDashboardService from "../services/adminDashboardService";

/**
 * Admin Store
 * State management for admin dashboard
 */

// Initial state
const initialState = {
  // Data
  hosts: [],
  moderators: [],
  vendors: [],
  events: [],
  tickets: [],
  payments: [],
  whitelabels: [],
  stats: null,

  // UI State
  filters: {
    hosts: {},
    moderators: {},
    vendors: {},
    events: {},
    tickets: {},
    payments: {},
    whitelabels: {},
  },
  searchQuery: "",
  selectedItems: [],

  // Status
  loading: false,
  error: null,

  // Pagination
  pagination: {
    hosts: { page: 1, limit: 10, total: 0 },
    moderators: { page: 1, limit: 10, total: 0 },
    vendors: { page: 1, limit: 10, total: 0 },
    events: { page: 1, limit: 10, total: 0 },
    tickets: { page: 1, limit: 10, total: 0 },
    payments: { page: 1, limit: 10, total: 0 },
    whitelabels: { page: 1, limit: 10, total: 0 },
  },
};

export const useAdminStore = create((set, get) => ({
  ...initialState,

  // ============================================
  // Data Setters
  // ============================================

  /**
   * Set hosts data
   */
  setHosts: (hosts, pagination = null) => {
    const updates = { hosts };
    if (pagination) {
      updates.pagination = {
        ...get().pagination,
        hosts: { ...get().pagination.hosts, ...pagination },
      };
    }
    set(updates);
  },

  /**
   * Set moderators data
   */
  setModerators: (moderators, pagination = null) => {
    const updates = { moderators };
    if (pagination) {
      updates.pagination = {
        ...get().pagination,
        moderators: { ...get().pagination.moderators, ...pagination },
      };
    }
    set(updates);
  },

  /**
   * Set vendors data
   */
  setVendors: (vendors, pagination = null) => {
    const updates = { vendors };
    if (pagination) {
      updates.pagination = {
        ...get().pagination,
        vendors: { ...get().pagination.vendors, ...pagination },
      };
    }
    set(updates);
  },

  /**
   * Set events data
   */
  setEvents: (events, pagination = null) => {
    const updates = { events };
    if (pagination) {
      updates.pagination = {
        ...get().pagination,
        events: { ...get().pagination.events, ...pagination },
      };
    }
    set(updates);
  },

  /**
   * Set tickets data
   */
  setTickets: (tickets, pagination = null) => {
    const updates = { tickets };
    if (pagination) {
      updates.pagination = {
        ...get().pagination,
        tickets: { ...get().pagination.tickets, ...pagination },
      };
    }
    set(updates);
  },

  /**
   * Set payments data
   */
  setPayments: (payments, pagination = null) => {
    const updates = { payments };
    if (pagination) {
      updates.pagination = {
        ...get().pagination,
        payments: { ...get().pagination.payments, ...pagination },
      };
    }
    set(updates);
  },

  /**
   * Set whitelabels data
   */
  setWhitelabels: (whitelabels, pagination = null) => {
    const updates = { whitelabels };
    if (pagination) {
      updates.pagination = {
        ...get().pagination,
        whitelabels: { ...get().pagination.whitelabels, ...pagination },
      };
    }
    set(updates);
  },

  /**
   * Set dashboard stats
   */
  setStats: (stats) => set({ stats }),

  // ============================================
  // Update Functions
  // ============================================

  /**
   * Update a host in the list
   */
  updateHost: (hostId, updates) => {
    const hosts = get().hosts.map((host) =>
      host.id === hostId ? { ...host, ...updates } : host,
    );
    set({ hosts });
  },

  /**
   * Update a moderator in the list
   */
  updateModerator: (moderatorId, updates) => {
    const moderators = get().moderators.map((moderator) =>
      moderator.id === moderatorId ? { ...moderator, ...updates } : moderator,
    );
    set({ moderators });
  },

  /**
   * Update a vendor in the list
   */
  updateVendor: (vendorId, updates) => {
    const vendors = get().vendors.map((vendor) =>
      vendor.id === vendorId ? { ...vendor, ...updates } : vendor,
    );
    set({ vendors });
  },

  /**
   * Update an event in the list
   */
  updateEvent: (eventId, updates) => {
    const events = get().events.map((event) =>
      event.id === eventId ? { ...event, ...updates } : event,
    );
    set({ events });
  },

  /**
   * Update a ticket in the list
   */
  updateTicket: (ticketId, updates) => {
    const tickets = get().tickets.map((ticket) =>
      ticket.id === ticketId ? { ...ticket, ...updates } : ticket,
    );
    set({ tickets });
  },

  /**
   * Update a whitelabel in the list
   */
  updateWhitelabel: (whitelabelId, updates) => {
    const whitelabels = get().whitelabels.map((whitelabel) =>
      whitelabel.id === whitelabelId
        ? { ...whitelabel, ...updates }
        : whitelabel,
    );
    set({ whitelabels });
  },

  // ============================================
  // Delete Functions
  // ============================================

  /**
   * Delete a host from the list
   */
  deleteHost: (hostId) => {
    const hosts = get().hosts.filter((host) => host.id !== hostId);
    set({ hosts });
  },

  /**
   * Delete a moderator from the list
   */
  deleteModerator: (moderatorId) => {
    const moderators = get().moderators.filter(
      (moderator) => moderator.id !== moderatorId,
    );
    set({ moderators });
  },

  /**
   * Delete a vendor from the list
   */
  deleteVendor: (vendorId) => {
    const vendors = get().vendors.filter((vendor) => vendor.id !== vendorId);
    set({ vendors });
  },

  /**
   * Delete an event from the list
   */
  deleteEvent: (eventId) => {
    const events = get().events.filter((event) => event.id !== eventId);
    set({ events });
  },

  /**
   * Delete a ticket from the list
   */
  deleteTicket: (ticketId) => {
    const tickets = get().tickets.filter((ticket) => ticket.id !== ticketId);
    set({ tickets });
  },

  /**
   * Delete a whitelabel from the list
   */
  deleteWhitelabel: (whitelabelId) => {
    const whitelabels = get().whitelabels.filter(
      (whitelabel) => whitelabel.id !== whitelabelId,
    );
    set({ whitelabels });
  },

  /**
   * Bulk delete hosts
   */
  bulkDeleteHosts: (hostIds) => {
    const hosts = get().hosts.filter((host) => !hostIds.includes(host.id));
    set({ hosts, selectedItems: [] });
  },

  /**
   * Bulk delete vendors
   */
  bulkDeleteVendors: (vendorIds) => {
    const vendors = get().vendors.filter(
      (vendor) => !vendorIds.includes(vendor.id),
    );
    set({ vendors, selectedItems: [] });
  },

  /**
   * Bulk delete events
   */
  bulkDeleteEvents: (eventIds) => {
    const events = get().events.filter((event) => !eventIds.includes(event.id));
    set({ events, selectedItems: [] });
  },

  // ============================================
  // UI Actions
  // ============================================

  /**
   * Set filters for a specific entity type
   */
  setFilters: (entityType, filters) => {
    set({
      filters: {
        ...get().filters,
        [entityType]: filters,
      },
    });
  },

  /**
   * Set search query
   */
  setSearchQuery: (query) => set({ searchQuery: query }),

  /**
   * Toggle item selection
   */
  toggleItemSelection: (itemId) => {
    const selectedItems = get().selectedItems;
    const isSelected = selectedItems.includes(itemId);

    set({
      selectedItems: isSelected
        ? selectedItems.filter((id) => id !== itemId)
        : [...selectedItems, itemId],
    });
  },

  /**
   * Select all items
   */
  selectAllItems: (itemIds) => {
    set({ selectedItems: itemIds });
  },

  /**
   * Clear selection
   */
  clearSelection: () => set({ selectedItems: [] }),

  /**
   * Set loading state
   */
  setLoading: (loading) => set({ loading }),

  /**
   * Set error
   */
  setError: (error) => set({ error }),

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),

  // ============================================
  // Async Actions (using service layer)
  // ============================================

  /**
   * Fetch hosts
   */
  fetchHosts: async (token, params = {}) => {
    set({ loading: true, error: null });
    try {
      const result = await adminDashboardService.hosts.getAll(token, params);
      if (result.success) {
        const { data, pagination } = result.data;
        get().setHosts(data || result.data, pagination);
        set({ loading: false });
        return { success: true };
      } else {
        set({ error: result.error, loading: false });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetch moderators
   */
  fetchModerators: async (token, params = {}) => {
    set({ loading: true, error: null });
    try {
      const result = await adminDashboardService.moderators.getAll(
        token,
        params,
      );
      if (result.success) {
        const { data, pagination } = result.data;
        get().setModerators(data || result.data, pagination);
        set({ loading: false });
        return { success: true };
      } else {
        set({ error: result.error, loading: false });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetch vendors
   */
  fetchVendors: async (token, params = {}) => {
    set({ loading: true, error: null });
    try {
      const result = await adminDashboardService.vendors.getAll(token, params);
      if (result.success) {
        const { data, pagination } = result.data;
        get().setVendors(data || result.data, pagination);
        set({ loading: false });
        return { success: true };
      } else {
        set({ error: result.error, loading: false });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetch events
   */
  fetchEvents: async (token, params = {}) => {
    set({ loading: true, error: null });
    try {
      const result = await adminDashboardService.events.getAll(token, params);
      if (result.success) {
        const { data, pagination } = result.data;
        get().setEvents(data || result.data, pagination);
        set({ loading: false });
        return { success: true };
      } else {
        set({ error: result.error, loading: false });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetch tickets
   */
  fetchTickets: async (token, params = {}) => {
    set({ loading: true, error: null });
    try {
      const result = await adminDashboardService.tickets.getAll(token, params);
      if (result.success) {
        const { data, pagination } = result.data;
        get().setTickets(data || result.data, pagination);
        set({ loading: false });
        return { success: true };
      } else {
        set({ error: result.error, loading: false });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetch payments
   */
  fetchPayments: async (token, params = {}) => {
    set({ loading: true, error: null });
    try {
      const result = await adminDashboardService.payments.getAll(token, params);
      if (result.success) {
        const { data, pagination } = result.data;
        get().setPayments(data || result.data, pagination);
        set({ loading: false });
        return { success: true };
      } else {
        set({ error: result.error, loading: false });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetch whitelabels
   */
  fetchWhitelabels: async (token, params = {}) => {
    set({ loading: true, error: null });
    try {
      const result = await adminDashboardService.whitelabels.getAll(
        token,
        params,
      );
      if (result.success) {
        const { data, pagination } = result.data;
        get().setWhitelabels(data || result.data, pagination);
        set({ loading: false });
        return { success: true };
      } else {
        set({ error: result.error, loading: false });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetch host plans
   */
  fetchHostPlans: async (token) => {
    set({ loading: true, error: null });
    try {
      const result = await adminDashboardService.plans.getHostPlans(token);
      if (result.success) {
        set({ loading: false });
        return result.data;
      } else {
        set({ error: result.error, loading: false });
        return [];
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return [];
    }
  },

  /**
   * Fetch enterprise plans
   */
  fetchEnterprisePlans: async (token) => {
    set({ loading: true, error: null });
    try {
      const result =
        await adminDashboardService.plans.getEnterprisePlans(token);
      if (result.success) {
        set({ loading: false });
        return result.data;
      } else {
        set({ error: result.error, loading: false });
        return [];
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return [];
    }
  },

  /**
   * Reset store to initial state
   */
  reset: () => set(initialState),
}));

export default useAdminStore;

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

// ============================================
// TICKETS QUERIES
// ============================================

/**
 * Hook to fetch my tickets
 * @param {Object} params - Query parameters
 * @returns {UseQueryResult}
 */
export const useMyTickets = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ["tickets", "my-tickets", params],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.tickets.getMyTickets,
        params,
      }),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch ticket assignees
 * @returns {UseQueryResult}
 */
export const useTicketAssignees = (options = {}) => {
  return useQuery({
    queryKey: ["tickets", "assignees"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.tickets.getAssignees,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch single ticket
 * @param {string} ticketId
 * @returns {UseQueryResult}
 */
export const useTicket = (ticketId, options = {}) => {
  return useQuery({
    queryKey: ["tickets", ticketId],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.tickets.getTicketById(ticketId),
      }),
    enabled: !!ticketId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to fetch all tickets (admin)
 * @param {Object} params - Query parameters
 * @returns {UseQueryResult}
 */
export const useAllTickets = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ["tickets", "all", params],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.tickets.getMyTickets,
        params,
      }),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

// ============================================
// TICKETS MUTATIONS
// ============================================

/**
 * Unified Tickets Mutation Hook
 * @param {string} action - The ticket action to perform
 * @returns {UseMutationResult}
 */
export const useTicketMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    // Create Ticket
    createTicket: {
      mutationFn: (ticketData) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.tickets.createTicket,
          data: ticketData,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      },
    },

    // Update Ticket
    updateTicket: {
      mutationFn: ({ ticketId, data }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.tickets.updateTicket(ticketId),
          data,
        }),
      onSuccess: (_, { ticketId }) => {
        queryClient.invalidateQueries({ queryKey: ["tickets", ticketId] });
        queryClient.invalidateQueries({ queryKey: ["tickets", "my-tickets"] });
        queryClient.invalidateQueries({ queryKey: ["tickets", "all"] });
      },
    },

    // Delete Ticket
    deleteTicket: {
      mutationFn: (ticketId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.tickets.deleteTicket(ticketId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      },
    },

    // Assign Ticket
    assignTicket: {
      mutationFn: ({ ticketId, assigneeId }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.tickets.assignTicket(ticketId),
          data: { assigneeId },
        }),
      onSuccess: (_, { ticketId }) => {
        queryClient.invalidateQueries({ queryKey: ["tickets", ticketId] });
        queryClient.invalidateQueries({ queryKey: ["tickets", "all"] });
      },
    },

    // Update Ticket Status
    updateStatus: {
      mutationFn: ({ ticketId, status }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.tickets.updateTicketStatus(ticketId),
          data: { status },
        }),
      onSuccess: (_, { ticketId }) => {
        queryClient.invalidateQueries({ queryKey: ["tickets", ticketId] });
        queryClient.invalidateQueries({ queryKey: ["tickets", "my-tickets"] });
        queryClient.invalidateQueries({ queryKey: ["tickets", "all"] });
      },
    },

    // Rate Ticket Resolution
    rateTicket: {
      mutationFn: ({ ticketId, rating, feedback }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.tickets.rateTicket(ticketId),
          data: { rating, feedback },
        }),
      onSuccess: (_, { ticketId }) => {
        queryClient.invalidateQueries({ queryKey: ["tickets", ticketId] });
      },
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown ticket action: ${action}`);
  }

  return useMutation({
    ...mutationConfig,
    onError: (error) => {
      console.error(`Ticket mutation error (${action}):`, error);
    },
  });
};

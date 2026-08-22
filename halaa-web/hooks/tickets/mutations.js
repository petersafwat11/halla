"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { toBulkIdsPayload } from "@halaa/shared/utils/adapters";
import { ticketsKeys } from "./keys";

/**
 * Export tickets as an .xlsx file. Triggers a browser download on success.
 */
export const useExportTickets = () => {
  return useMutation({
    mutationFn: async (filters = {}) => {
      const blob = await apiRequest({
        method: "GET",
        path: API_PATHS.tickets.exportTickets,
        params: filters,
        isExport: true,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tickets_export_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return { success: true };
    },
  });
};

/**
 * Unified Tickets Mutation Hook
 */
export const useTicketMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    createTicket: {
      mutationFn: (ticketData) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.tickets.createTicket,
          data: ticketData,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ticketsKeys.all });
      },
    },

    updateTicket: {
      mutationFn: ({ ticketId, data }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.tickets.updateTicket(ticketId),
          data,
        }),
      onSuccess: (_, { ticketId }) => {
        queryClient.invalidateQueries({ queryKey: ticketsKeys.detail(ticketId) });
        queryClient.invalidateQueries({ queryKey: ticketsKeys.myTicketsPrefix() });
        queryClient.invalidateQueries({ queryKey: ticketsKeys.adminList() });
      },
    },

    deleteTicket: {
      mutationFn: (ticketId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.tickets.deleteTicket(ticketId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ticketsKeys.all });
      },
    },

    bulkDelete: {
      mutationFn: (ticketIds) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.tickets.bulkDelete,
          data: toBulkIdsPayload(ticketIds),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ticketsKeys.all });
      },
    },

    bulkStatus: {
      mutationFn: ({ ticketIds, ids, status, resolution }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.tickets.bulkStatus,
          data: {
            ...toBulkIdsPayload(ticketIds || ids),
            status,
            ...(resolution !== undefined && { resolution }),
          },
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ticketsKeys.all });
      },
    },

    assignTicket: {
      mutationFn: ({ ticketId, assigneeId }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.tickets.assignTicket(ticketId),
          data: { assigneeId },
        }),
      onSuccess: (_, { ticketId }) => {
        queryClient.invalidateQueries({ queryKey: ticketsKeys.detail(ticketId) });
        queryClient.invalidateQueries({ queryKey: ticketsKeys.adminList() });
      },
    },

    updateStatus: {
      mutationFn: ({ ticketId, status, resolution }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.tickets.updateTicketStatus(ticketId),
          data: { status, ...(resolution !== undefined && { resolution }) },
        }),
      onSuccess: (_, { ticketId }) => {
        queryClient.invalidateQueries({ queryKey: ticketsKeys.detail(ticketId) });
        queryClient.invalidateQueries({ queryKey: ticketsKeys.myTicketsPrefix() });
        queryClient.invalidateQueries({ queryKey: ticketsKeys.adminList() });
      },
    },

    rateTicket: {
      mutationFn: ({ ticketId, rating, feedback }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.tickets.rateTicket(ticketId),
          data: { rating, feedback },
        }),
      onSuccess: (_, { ticketId }) => {
        queryClient.invalidateQueries({ queryKey: ticketsKeys.detail(ticketId) });
      },
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown ticket action: ${action}`);
  }

  return useMutation({
    ...mutationConfig,
  });
};

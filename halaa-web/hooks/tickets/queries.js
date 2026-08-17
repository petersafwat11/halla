"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { ticketsKeys } from "./keys";

export const useMyTickets = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ticketsKeys.myTickets(params),
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

export const useTicketAssignees = (options = {}) => {
  return useQuery({
    queryKey: ticketsKeys.assignees(),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.tickets.getAssignees,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useTicket = (ticketId, options = {}) => {
  return useQuery({
    queryKey: ticketsKeys.detail(ticketId),
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
 * Hook to fetch ticket minimal data for rating page.
 */
export const useTicketForRating = (ticketId, options = {}) => {
  return useQuery({
    queryKey: ticketsKeys.forRating(ticketId),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.tickets.getTicketForRating(ticketId),
      }),
    enabled: !!ticketId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

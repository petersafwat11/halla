import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createTicketAPI,
  updateTicketAPI,
  deleteTicketAPI,
  rateTicketAPI,
} from "../../services/ticketsService";
import { ticketsKeys } from "./keys";

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => createTicketAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsKeys.all });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, data }) => updateTicketAPI(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsKeys.all });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId) => deleteTicketAPI(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsKeys.all });
    },
  });
}

export function useRateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, rating, feedback }) =>
      rateTicketAPI(ticketId, { rating, feedback }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsKeys.all });
    },
  });
}

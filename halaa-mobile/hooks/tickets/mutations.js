import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsKeys } from "./keys";
import { ticketsApi } from "./queries";

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => ticketsApi.createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsKeys.all });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, data }) => ticketsApi.updateTicket(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsKeys.all });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ticketId) => ticketsApi.deleteTicket(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsKeys.all });
    },
  });
}

export function useRateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, rating, feedback }) =>
      ticketsApi.rateTicket(ticketId, { rating, feedback }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsKeys.all });
    },
  });
}

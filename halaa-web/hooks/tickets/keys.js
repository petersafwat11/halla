export const ticketsKeys = {
  all: ["tickets"],
  myTickets: (params) => [...ticketsKeys.all, "my-tickets", params],
  myTicketsPrefix: () => [...ticketsKeys.all, "my-tickets"],
  assignees: () => [...ticketsKeys.all, "assignees"],
  adminList: () => [...ticketsKeys.all, "all"],
  detail: (ticketId) => [...ticketsKeys.all, ticketId],
  forRating: (ticketId) => [...ticketsKeys.all, ticketId, "rating-info"],
};

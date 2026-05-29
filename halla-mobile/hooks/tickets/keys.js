export const ticketsKeys = {
  all: ["tickets"],
  list: (filters) => [...ticketsKeys.all, filters],
  detail: (ticketId) => [...ticketsKeys.all, ticketId],
  assignees: () => [...ticketsKeys.all, "assignees"],
};

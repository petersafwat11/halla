export const paymentsKeys = {
  all: ["payments"],
  poll3ds: (moyasarId) => [...paymentsKeys.all, "poll3ds", moyasarId],
};

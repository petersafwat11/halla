export const subscriptionsKeys = {
  all: ["subscriptions"],
  myPayments: (params) => [...subscriptionsKeys.all, "my-payments", params],
};

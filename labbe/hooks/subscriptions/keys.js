export const subscriptionsKeys = {
  all: ["subscriptions"],
  mine: () => [...subscriptionsKeys.all, "my-subscription"],
  myPayments: (params) => [...subscriptionsKeys.all, "my-payments", params],
};

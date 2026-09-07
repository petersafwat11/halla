export const taqnyatTemplatesKeys = {
  all: ["taqnyat-templates"],
  hostList: ({ category, type, invitationMode, deliveryMode } = {}) => [
    ...taqnyatTemplatesKeys.all,
    "host",
    category || "all",
    type || "all",
    invitationMode || "all",
    deliveryMode || "quick_reply",
  ],
  adminList: () => [...taqnyatTemplatesKeys.all, "admin"],
};

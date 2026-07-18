export const taqnyatTemplatesKeys = {
  all: ["taqnyat-templates"],
  hostList: ({ category, type, invitationMode } = {}) => [
    ...taqnyatTemplatesKeys.all,
    "host",
    category || "all",
    type || "all",
    invitationMode || "all",
  ],
};

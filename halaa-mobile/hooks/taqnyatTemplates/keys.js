export const taqnyatTemplatesKeys = {
  all: ["taqnyat-templates"],
  hostList: ({ category, type } = {}) => [
    ...taqnyatTemplatesKeys.all,
    "host",
    category || "all",
    type || "all",
  ],
};

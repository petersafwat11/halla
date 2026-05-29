export const templatesKeys = {
  all: ["templates"],
  hostList: (category) => [...templatesKeys.all, "host", category || "all"],
  adminList: (params) => [...templatesKeys.all, "admin", params || {}],
  detail: (id) => [...templatesKeys.all, id],
};

export const templateCategoriesKeys = {
  all: ["template-categories"],
  public: () => [...templateCategoriesKeys.all, "public"],
  admin: () => [...templateCategoriesKeys.all, "admin"],
};

export const fontsKeys = {
  all: ["fonts"],
};

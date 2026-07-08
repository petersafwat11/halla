export const templatesKeys = {
  all: ["templates"],
  hostList: (category) => [...templatesKeys.all, "host", category || "all"],
};

export const templateCategoriesKeys = {
  all: ["template-categories"],
  public: () => [...templateCategoriesKeys.all, "public"],
};

export const fontsKeys = {
  all: ["fonts"],
};

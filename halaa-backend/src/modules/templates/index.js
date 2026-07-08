const routes = require("./templates.routes");
const service = require("./templates.service");

module.exports = {
  routes,
  adminRoutes: routes.adminRouter,
  categoriesRoutes: routes.categoriesRouter,
  adminCategoriesRoutes: routes.adminCategoriesRouter,
  fontsRoutes: routes.fontsRouter,
  service,
};

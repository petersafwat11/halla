const routes = require("./taqnyat-templates.routes");
const service = require("./taqnyat-templates.service");

module.exports = {
  routes,
  adminRoutes: routes.adminRouter,
  service,
};

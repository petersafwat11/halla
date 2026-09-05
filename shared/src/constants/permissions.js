/**
 * Admin-panel page keys + access levels.
 *
 * The per-role access matrix (`ROLE_PAGE_ACCESS`) is *not* defined here
 * because web and mobile currently disagree with each other and with
 * backend on several rows (e.g. MODERATOR.settings — backend NONE, web
 * FULL, mobile VIEW). Reconciling the matrix is a product decision
 * pending, so each app keeps its own copy for now.
 */

export const ADMIN_PAGES = Object.freeze({
  DASHBOARD: "dashboard",
  HOSTS: "hosts",
  VENDORS: "vendors",
  EVENTS: "events",
  TICKETS: "tickets",
  PAYMENTS: "payments",
  MODERATORS: "moderators",
  MANAGE_PLANS: "manage_plans",
  SETTINGS: "settings",
  DISCOUNTS: "discounts",
  TEMPLATES: "templates",
  TEMPLATE_CATEGORIES: "template_categories",
  TAQNYAT_TEMPLATES: "taqnyat_templates",
  CUSTOM_DESIGNS: "custom_designs",
});

export const ACCESS_LEVELS = Object.freeze({
  FULL: "full",   // view + create + update + delete + export
  EDIT: "edit",   // view + create + update (no delete)
  VIEW: "view",   // view only
  NONE: "none",   // no access
});

export const PERMISSIONS = Object.freeze({
  MANAGE_HOSTS: "manage_hosts",
  MANAGE_VENDORS: "manage_vendors",
  MANAGE_EVENTS: "manage_events",
  MANAGE_TICKETS: "manage_tickets",
  MANAGE_PAYMENTS: "manage_payments",
  MANAGE_TEAM: "manage_team",
});

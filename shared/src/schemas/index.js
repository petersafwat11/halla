/**
 * Barrel for `@halaa/shared/schemas`. Prefer subpath imports
 * (`@halaa/shared/schemas/auth`) over this barrel so bundlers tree-shake.
 */
export * as _primitives from "./_shared.js";
export * as auth from "./auth.js";
export * as events from "./events.js";
export * as tickets from "./tickets.js";
export * as plans from "./plans.js";
export * as admin from "./admin.js";
export * as bulk from "./bulk.js";
export * as settings from "./settings.js";
export * as vendor from "./vendor.js";
export * as postEvent from "./post-event.js";

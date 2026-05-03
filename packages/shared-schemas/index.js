/**
 * @halla/shared-schemas — single source of truth for Zod schemas shared
 * between the web app (`labbe/`) and mobile app (`halla-mobile/`).
 *
 * Phase 4d W0-SCHEMAS lifts the post-Phase-4c create-event schema from
 * the web tree and adds an `updateEventSchema`. Web/mobile-side files
 * under `utils/schemas/` are thin re-export shims so existing imports
 * (`@/utils/schemas/createEventSchema`) keep working.
 *
 * Migrating any other schema (auth, subscription, addon, plan, ticket,
 * vendor, whitelabel) into this package is a Phase 5 hand-off.
 */

const createEventSchemaModule = require("./src/createEventSchema");
const updateEventSchemaModule = require("./src/updateEventSchema");

module.exports = {
  ...createEventSchemaModule,
  ...updateEventSchemaModule,
};

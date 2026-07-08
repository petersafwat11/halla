// Centralized hooks barrel.
//
// Each domain folder owns its own queries/mutations/keys. This barrel
// re-exports the public hook surface so consumers can
// `import { useFoo } from "../../hooks"`
// without knowing the domain split. Domain-specific consumers should
// import from the domain folder directly (`../../hooks/<domain>`) to
// avoid pulling unrelated hooks into their bundle.

// Queries + mutations by domain.
export * from "./addons";
export * from "./admin";
export * from "./auth";
export * from "./checkout";
export * from "./dashboard";
export * from "./discounts";
export * from "./events/queries";
export * from "./events/mutations/useEventMutation";
export * from "./guests";
export * from "./guestPortal";
export * from "./locations";
export * from "./marketplace";
export * from "./messaging";
export * from "./notifications";
export * from "./payments";
export * from "./plans";
export * from "./postEvent";
export * from "./staff";
export * from "./subscriptions";
export * from "./taqnyatTemplates";
export * from "./templates";
export * from "./tickets";
export * from "./users";
export * from "./vendor";

// Non-domain utility hooks.
export { useDebounce } from "@halaa/shared/utils/useDebounce";

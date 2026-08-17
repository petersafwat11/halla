# @halaa/shared

Cross-app code shared by `labbe` (Next.js web) and `halaa-mobile` (Expo / React Native).

- Plain ESM JS, no transpile step, consumed directly via npm workspace symlink.
- Imports use subpaths: `@halaa/shared/api/paths`, `@halaa/shared/schemas/events`, etc.
- `zod` is a peer dependency — the host app's `zod` version is what schemas use at runtime.

See `D:\halla\UNIFICATION_REPORT.md` for the layout and migration plan.

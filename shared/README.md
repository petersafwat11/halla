# @halla/shared

Cross-app code shared by `labbe` (Next.js web) and `halla-mobile` (Expo / React Native).

- Plain ESM JS, no transpile step, consumed directly via npm workspace symlink.
- Imports use subpaths: `@halla/shared/api/paths`, `@halla/shared/schemas/events`, etc.
- `zod` is a peer dependency — the host app's `zod` version is what schemas use at runtime.

See `D:\halla\UNIFICATION_REPORT.md` for the layout and migration plan.

// Learn more https://docs.expo.io/guides/customizing-metro
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

// D-R2 hardening (post-review) — npm-workspaces resolution.
// `@halla/shared-schemas` lives at `<repo>/packages/shared-schemas` and
// is hoisted to `<repo>/node_modules` by the workspace declaration in
// the root `package.json`. Bare Metro defaults won't watch the parent
// directory or fall back to the root node_modules, so we extend both:
//
//   - watchFolders: include the repo root so Metro picks up changes in
//     `packages/shared-schemas/` during development.
//   - resolver.nodeModulesPaths: include the root node_modules so
//     hoisted dependencies (and the workspace package symlink) resolve
//     correctly from any depth.
//   - resolver.disableHierarchicalLookup: false (default) — keeps the
//     normal node_modules walk so per-package overrides still win.

const repoRoot = path.resolve(__dirname, "..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.watchFolders = [...(config.watchFolders || []), repoRoot];
config.resolver = {
  ...(config.resolver || {}),
  nodeModulesPaths: [
    path.resolve(__dirname, "node_modules"),
    path.resolve(repoRoot, "node_modules"),
  ],
};

module.exports = config;

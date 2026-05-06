// Learn more https://docs.expo.io/guides/customizing-metro
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

// Extend Metro config to watch the repo root and resolve modules from
// the root node_modules. This ensures hoisted dependencies work
// correctly from any depth in the monorepo.

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

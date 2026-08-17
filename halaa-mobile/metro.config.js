// Learn more https://docs.expo.io/guides/customizing-metro
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

// Extend Metro config to watch the repo root and resolve modules from
// the root node_modules. This ensures hoisted dependencies work
// correctly from any depth in the monorepo.

const repoRoot = path.resolve(__dirname, "..");
const localNodeModules = path.resolve(__dirname, "node_modules");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.watchFolders = [...(config.watchFolders || []), repoRoot];
config.resolver = {
  ...(config.resolver || {}),
  nodeModulesPaths: [
    localNodeModules,
    path.resolve(repoRoot, "node_modules"),
  ],
  extraNodeModules: {
    ...((config.resolver && config.resolver.extraNodeModules) || {}),
    react: path.resolve(localNodeModules, "react"),
    "react-native": path.resolve(localNodeModules, "react-native"),
  },
};

// Force a single React copy. @halaa/shared lives outside this project
// (D:\halla\shared) and imports `react`; standard node resolution finds the
// root D:\halla\node_modules\react copy while app code + the renderer use
// halaa-mobile/node_modules/react — two React instances → null hook dispatcher
// → "Cannot read property 'useMemo' of null". extraNodeModules is only a
// fallback and never fires here, so intercept resolution and pin every `react`
// (and react subpath, e.g. react/jsx-runtime) to the local copy.
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react" || moduleName.startsWith("react/")) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(localNodeModules, "react", "index.js") },
      moduleName,
      platform
    );
  }
  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

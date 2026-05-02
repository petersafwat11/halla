import { registerRootComponent } from "expo";

import App from "./App";

// Note: I18nManager.forceRTL() doesn't work in Expo Go
// We use flexDirection: "row-reverse" and context-based RTL control instead
console.log("[index.js] App starting...");

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

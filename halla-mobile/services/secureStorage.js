/**
 * Secure storage wrapper.
 *
 * Phase 1a (FLOW-01-F03): the long-lived refresh token must live in the
 * platform's secure enclave (iOS Keychain / Android Keystore via
 * expo-secure-store). This module is the single entry point so the rest of
 * the app never touches AsyncStorage for credentials.
 *
 * - Native (iOS / Android): expo-secure-store.
 * - Web bundle (Expo for web): SecureStore is not available; we fall back to
 *   AsyncStorage so dev workflows still function. Production web users
 *   authenticate via cookies, not the mobile bundle, so this fallback is
 *   acceptable for parity, not for security.
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

let SecureStore = null;
try {
  // eslint-disable-next-line global-require
  SecureStore = require("expo-secure-store");
} catch (e) {
  SecureStore = null;
}

const isSecureStoreAvailable = !!(SecureStore && Platform.OS !== "web");

const REFRESH_TOKEN_KEY = "halla.refreshToken";
const USER_KEY = "halla.user";

const setItem = async (key, value) => {
  if (isSecureStoreAvailable) {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  } else {
    await AsyncStorage.setItem(`@secure:${key}`, value);
  }
};

const getItem = async (key) => {
  if (isSecureStoreAvailable) {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(`@secure:${key}`);
};

const deleteItem = async (key) => {
  if (isSecureStoreAvailable) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await AsyncStorage.removeItem(`@secure:${key}`);
  }
};

export const saveRefreshToken = (token) => {
  if (!token) return deleteItem(REFRESH_TOKEN_KEY);
  return setItem(REFRESH_TOKEN_KEY, token);
};

export const loadRefreshToken = () => getItem(REFRESH_TOKEN_KEY);

export const clearRefreshToken = () => deleteItem(REFRESH_TOKEN_KEY);

export const saveUserShadow = async (user) => {
  if (!user) return deleteItem(USER_KEY);
  return setItem(USER_KEY, JSON.stringify(user));
};

export const loadUserShadow = async () => {
  const raw = await getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

export const clearUserShadow = () => deleteItem(USER_KEY);

export const STORAGE_BACKEND = isSecureStoreAvailable ? "secure-store" : "async-storage-fallback";

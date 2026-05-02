import React, { useState, useEffect, useMemo } from "react";
import { StyleSheet, View, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Font from "expo-font";
// TODO: run: npx expo install expo-notifications expo-constants
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import {
  Cairo_300Light,
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_900Black,
} from "@expo-google-fonts/cairo";

import { LanguageProvider, useLanguage } from "./localization";
import { ToastProvider } from "./contexts/ToastContext";
import { QueryProvider } from "./contexts/QueryProvider";
import { useAuthStore } from "./stores/authStore";
import AppNavigator from "./navigation/AppNavigator";
import LanguageSelector from "./components/languagePrefrence/LanguageSelector";
import { API_BASE_URL } from "./config/api";

// ------------------------------------------------- //
//          PUSH NOTIFICATION SETUP                  //
// ------------------------------------------------- //

// Show notifications even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request permission, obtain an Expo Push Token, and register it with the backend.
 * @param {string} authToken - The user's JWT, used to authenticate the PATCH request.
 */
const registerForPushNotifications = async (authToken) => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.manifest?.extra?.eas?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;

    if (authToken && pushToken) {
      await fetch(`${API_BASE_URL}/auth/update-push-token`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ pushToken }),
      }).catch(() => {});
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
  } catch (err) {
    console.error("Push token registration error:", err);
  }
};

// Keep splash screen visible until assets load

async function loadAssets() {
  await Font.loadAsync({
    Cairo_300Light,
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_900Black,
  });
}

/* ------------------------------------------------- */
/*                APP CONTENT (MAIN UI)              */
/* ------------------------------------------------- */

function AppContent() {
  const { hasSelectedLanguage, changeLanguage } = useLanguage();
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const authStatus = useAuthStore((state) => state.status);
  const authToken = useAuthStore((state) => state.token);

  useEffect(() => {
    restoreSession();
  }, []);

  // Register for push notifications once the user is authenticated.
  // This fires on cold start (session restored) and after fresh login.
  useEffect(() => {
    if (authStatus === "authenticated" && authToken) {
      registerForPushNotifications(authToken);
    }
  }, [authStatus, authToken]);

  const handleLanguageSelect = async (code) => {
    await changeLanguage(code);
  };

  // User must pick a language before using the app
  if (!hasSelectedLanguage) {
    return (
      <View style={styles.centered}>
        <LanguageSelector onLanguageSelect={handleLanguageSelect} />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

/* ------------------------------------------------- */
/*                  ROOT CONTAINER                   */
/* ------------------------------------------------- */

function AppRoot() {
  const { direction } = useLanguage();

  const containerStyle = useMemo(
    () => StyleSheet.create({ container: { flex: 1, direction } }),
    [direction]
  );

  return (
    <View style={containerStyle.container}>
      <AppContent />
    </View>
  );
}

/* ------------------------------------------------- */
/*                       MAIN APP                    */
/* ------------------------------------------------- */

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadAssets()
      .catch(console.warn)
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <View style={{ flex: 1 }} />;

  return (
    <SafeAreaProvider>
      <QueryProvider>
        <LanguageProvider>
          <ToastProvider>
            <AppRoot />
          </ToastProvider>
        </LanguageProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}

/* ------------------------------------------------- */
/*                      STYLES                       */
/* ------------------------------------------------- */

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

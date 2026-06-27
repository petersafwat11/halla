import React, { useState, useEffect, useMemo } from "react";
import { StyleSheet, View, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Font from "expo-font";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";

import {
  Cairo_300Light,
  Cairo_400Regular,
  Cairo_500Medium,
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
import { ENDPOINTS } from "./config/api";
import { apiFetch } from "./services/http";
import ErrorBoundary from "./components/shared/ErrorBoundary";

// ------------------------------------------------- //
//                 CRASH REPORTING                   //
// ------------------------------------------------- //
// DSN is injected by app.config.js (extra.sentryDsn) from the SENTRY_DSN env
// var. When absent (e.g. local dev) Sentry is disabled — a safe no-op.
const sentryDsn =
  Constants.expoConfig?.extra?.sentryDsn ||
  Constants.manifest?.extra?.sentryDsn;

Sentry.init({
  dsn: sentryDsn,
  enabled: !!sentryDsn,
  tracesSampleRate: 0.2,
});

// ------------------------------------------------- //
//          PUSH NOTIFICATION SETUP                  //
// ------------------------------------------------- //

// Show notifications even when the app is in the foreground.
// SDK 54 / expo-notifications ~0.32: `shouldShowAlert` is deprecated in favor
// of `shouldShowBanner` + `shouldShowList`.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Android notification channel. Created once at startup (not gated behind auth)
// so a notification arriving before login still has a channel to post to.
const setupAndroidChannel = async () => {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch (err) {
    console.error("Android channel setup error:", err);
  }
};

/**
 * Request permission, obtain an Expo Push Token, and register it with the backend.
 * Routed through apiFetch so token refresh is automatic if the access token
 * has expired since the last app foreground.
 */
const registerForPushNotifications = async () => {
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

    if (pushToken) {
      await apiFetch(ENDPOINTS.AUTH.UPDATE_PUSH_TOKEN, {
        method: "PATCH",
        body: { pushToken },
      }).catch(() => {});
    }

  } catch (err) {
    console.error("Push token registration error:", err);
  }
};

// Navigation ref so notification taps (which fire outside the React tree) can
// drive navigation.
const navigationRef = createNavigationContainerRef();

/**
 * Route to a sensible screen when the user taps a push notification. We send
 * everyone to the in-app Notifications screen (registered in every authenticated
 * stack), which lists the item and lets the user drill in — reliable across
 * host/vendor/admin without risking navigation to a screen absent from the
 * current role's stack.
 */
const handleNotificationResponse = (response) => {
  try {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate("Notifications");
  } catch (err) {
    console.error("Notification routing error:", err);
  }
};

// Keep splash screen visible until assets load

async function loadAssets() {
  await Font.loadAsync({
    Cairo_300Light,
    Cairo_400Regular,
    Cairo_500Medium,
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

  // Push: set up the Android channel and notification-tap routing once on
  // mount. Covers foreground/background taps (listener) and cold-start taps
  // (getLastNotificationResponseAsync).
  useEffect(() => {
    setupAndroidChannel();

    const sub = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationResponse(response);
    });

    return () => sub.remove();
  }, []);

  // Register for push notifications once the user is authenticated.
  // This fires on cold start (session restored) and after fresh login.
  useEffect(() => {
    if (authStatus === "authenticated" && authToken) {
      registerForPushNotifications();
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

  // Deep-link config. Links use the `halla://` scheme (declared in
  // app.json) plus universal-link variants for the production domain.
  const linking = useMemo(
    () => ({
      prefixes: ["halla://", "https://halaa.com.sa"],
      config: {
        screens: {
          // Forgot-password completion. Backend's email links
          // point to `https://halaa.com.sa/reset-password/<token>`; the
          // universal link variant carries the user into this screen
          // with the token in route params. The custom scheme variant
          // (`halla://reset-password/<token>`) is also supported for
          // dev/QA flows.
          ResetPassword: "reset-password/:token",
          // Guest invitation portal — `halla://invitation/<code>`. The
          // screen is registered on AuthStack so SMS/WhatsApp taps from
          // an unauthenticated device land directly without forcing a
          // login first.
          Invitation: "invitation/:code",
          // 3DS callback. Moyasar appends `?id=<moyasarId>&status=…` to
          // the redirect URL we hand it at checkout time. The screen
          // accepts either query param shape via `usePaymentPoll`.
          PaymentReturn: "host/payments/return",
        },
      },
    }),
    []
  );

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
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

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadAssets()
      .catch(console.warn)
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <View style={{ flex: 1 }} />;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryProvider>
          <LanguageProvider>
            <ToastProvider>
              <AppRoot />
            </ToastProvider>
          </LanguageProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// Wrap the root component so Sentry can capture render errors + touch events.
export default Sentry.wrap(App);

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

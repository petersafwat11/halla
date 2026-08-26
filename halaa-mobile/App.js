import React, { useState, useEffect, useMemo } from "react";
import { StyleSheet, View, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
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
import { initPurchases } from "./services/purchases";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import CenteredAlertProvider from "./components/commen/CenteredAlertProvider";

// ------------------------------------------------- //
//                 CRASH REPORTING                   //
// ------------------------------------------------- //
// DSN is injected by app.config.js (extra.sentryDsn) from the SENTRY_DSN env
// var. When absent (e.g. local dev) Sentry is disabled — a safe no-op.
const sentryDsn =
  Constants.expoConfig?.extra?.sentryDsn ||
  Constants.manifest?.extra?.sentryDsn;

const appVersion = Constants.expoConfig?.version || "0.0.0";
const sentryEnvironment = __DEV__
  ? "development"
  : Constants.expoConfig?.extra?.sentryEnvironment || "production";

// PII scrubbing (§7.3): never let auth material / personal identifiers reach
// Sentry. Strips auth headers + cookies and redacts sensitive keys anywhere in
// the event payload before send.
const SENSITIVE_KEY_RE =
  /(password|token|otp|secret|authorization|cookie|national|iqama|phone|email|pushtoken)/i;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const SAUDI_PHONE_RE = /(?:\+?966|0)?5\d{8}/g;
const scrubString = (value) =>
  typeof value === "string"
    ? value
        .replace(EMAIL_RE, "[redacted-email]")
        .replace(BEARER_RE, "Bearer [redacted]")
        .replace(SAUDI_PHONE_RE, "[redacted-phone]")
    : value;
const redactDeep = (obj, depth = 0) => {
  if (!obj || typeof obj !== "object" || depth > 6) return;
  for (const k of Object.keys(obj)) {
    if (SENSITIVE_KEY_RE.test(k)) {
      obj[k] = "[redacted]";
      continue;
    }
    if (typeof obj[k] === "string") obj[k] = scrubString(obj[k]);
    else if (obj[k] && typeof obj[k] === "object") redactDeep(obj[k], depth + 1);
  }
};
const scrubPII = (event) => {
  try {
    if (event.request?.headers) {
      for (const h of ["Authorization", "authorization", "Cookie", "cookie"]) {
        delete event.request.headers[h];
      }
    }
    delete event.request?.cookies;
    delete event.request?.env;
    delete event.request?.query_string;
    if (event.request?.url) event.request.url = String(event.request.url).split("?")[0];
    redactDeep(event.extra);
    redactDeep(event.contexts);
    redactDeep(event.tags);
    redactDeep(event.breadcrumbs);
    redactDeep(event.exception);
    if (event.message) event.message = scrubString(event.message);
    if (event.request?.data) redactDeep(event.request.data);
    // Drop user email/ip — keep only an opaque id if present.
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }
  } catch {
    /* never block error reporting on scrub failure */
  }
  return event;
};

Sentry.init({
  dsn: sentryDsn,
  enabled: !!sentryDsn,
  environment: sentryEnvironment,
  release: `halla@${appVersion}`,
  dist: String(
    Constants.expoConfig?.ios?.buildNumber ||
      Constants.expoConfig?.android?.versionCode ||
      "1"
  ),
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  sendDefaultPii: false,
  beforeSend: scrubPII,
  beforeSendTransaction: scrubPII,
  beforeBreadcrumb: (breadcrumb) => {
    redactDeep(breadcrumb);
    return breadcrumb;
  },
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
    // Android push was removed from Expo Go in SDK 53 — requesting a token
    // there throws. Only dev-client / standalone builds can register.
    if (
      Platform.OS === "android" &&
      Constants.executionEnvironment === Constants.ExecutionEnvironment.StoreClient
    ) {
      console.log("Push registration skipped: not supported in Expo Go (Android SDK 53+). Use a development build.");
      return;
    }

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
      // Remember the token so logout can unregister it for this account (§7.3).
      useAuthStore.getState().setPushToken?.(pushToken);
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
  const authUser = useAuthStore((state) => state.user);

  useEffect(() => {
    restoreSession();
  }, []);

  // Push: set up the Android channel and notification-tap routing once on
  // mount. Covers foreground/background taps (listener) and cold-start taps
  // (getLastNotificationResponseAsync).
  useEffect(() => {
    if (Platform.OS === "web") return undefined;

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
      // Attach in-app purchases to this user via the STABLE billing id (never
      // the Mongo _id / phone / email — §9.1). No-op on web / without keys /
      // until billingUserId is present.
      initPurchases(authUser?.billingUserId);
    }
  }, [authStatus, authToken, authUser]);

  const handleLanguageSelect = async (code) => {
    await changeLanguage(code);
  };

  // Hooks must run in the same order on the language-picker render and after
  // a language is selected. Keeping this memo above the early return prevents
  // the first-run transition from adding a hook mid-render.
  const linking = useMemo(
    () => ({
      // The locale-prefixed universal-link variants are listed BEFORE the bare
      // host so React Navigation strips the `/<lang>` segment, letting one
      // screen pattern serve `/ar/...`, `/en/...`, and unprefixed links.
      prefixes: [
        "halaa://",
        "https://halaa.com.sa/ar",
        "https://halaa.com.sa/en",
        "https://halaa.com.sa",
      ],
      config: {
        screens: {
          // Forgot-password completion (§5.1). The canonical email link is
          // `https://halaa.com.sa/<lang>/change-password?token=<token>`; the
          // universal link opens this screen with the token from the query
          // string (`route.params.token`). The custom-scheme variant
          // (`halaa://change-password?token=<token>`) is also supported.
          ResetPassword: "change-password",
          // Guest invitation portal — `halaa://invitation/<code>` and
          // `https://halaa.com.sa/<lang>/invitation/<code>`. Registered on
          // AuthStack so SMS/WhatsApp taps from an unauthenticated device land
          // directly without forcing a login first.
          Invitation: "invitation/:code",
          // 3DS callback. Moyasar appends `?id=<moyasarId>&status=…` to
          // the redirect URL we hand it at checkout time. The screen
          // accepts either query param shape via `usePaymentPoll`.
          PaymentReturn: "host/payments/return",
          // Deterministic native RTL/LTR screenshot fixture. It contains no
          // account or backend data and is used by the Maestro visual suite.
          DirectionVisualTest: "__visual/direction",
        },
      },
    }),
    []
  );

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
        {/* One keyboard controller for authenticated, unauthenticated, and
            natively-presented modal content alike (blueprint §6.1). It sits
            inside SafeAreaProvider and OUTSIDE the navigation tree; no global
            KeyboardAvoidingView is rendered around NavigationContainer. */}
        <KeyboardProvider>
          <QueryProvider>
            <LanguageProvider>
              <CenteredAlertProvider>
                <ToastProvider>
                  <AppRoot />
                </ToastProvider>
              </CenteredAlertProvider>
            </LanguageProvider>
          </QueryProvider>
        </KeyboardProvider>
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

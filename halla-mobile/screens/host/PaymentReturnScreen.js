/**
 * 3DS-return landing screen. Moyasar redirects the bank step back to a
 * URL we hand them at checkout time; the deep-link config in App.js
 * routes that to here with `moyasarId` in route params (the URL `id`
 * query param). We poll `/payments/:id/poll` until terminal status,
 * then route per `payment.metadata.purpose`:
 *
 *   subscription → host home (subscription/plans landing)
 *   addon        → events list (where addon-bound features show up)
 *   checkout     → CreateEventScreen (mirror of the web redirect)
 *   missing/unknown → host home
 *
 * `navigation.reset` wipes this screen out of history so the back button
 * doesn't bring the user back to the polling state after a successful
 * landing.
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, CommonActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { usePaymentPoll } from "../../hooks";
import { useTranslation } from "../../localization";
import { clearPendingCheckoutCart } from "../../hooks/checkout";
import { colors, spacing, borderRadius, typography, textStyles, backgrounds } from "../../styles/tokens";

const TERMINAL_OK = new Set(["paid", "captured"]);

// Build a navigator state for the "post-3DS landing" route.
// Subscription/addon/unknown all reset to a single MainTabs entry so the
// back button leads nowhere meaningful (the polling screen is gone). The
// checkout purpose stacks CreateEventScreen on top of MainTabs so the
// tab bar is still reachable via a back press — replacing the whole
// stack with CreateEventScreen would strand the user.
const purposeStackRoutes = (purpose) => {
  if (purpose === "checkout") {
    return {
      index: 1,
      routes: [
        { name: "MainTabs", params: { screen: "Home" } },
        { name: "CreateEventScreen" },
      ],
    };
  }
  if (purpose === "addon") {
    return {
      index: 0,
      routes: [{ name: "MainTabs", params: { screen: "Events" } }],
    };
  }
  if (purpose === "subscription") {
    return {
      index: 0,
      routes: [{ name: "MainTabs", params: { screen: "Plans" } }],
    };
  }
  return {
    index: 0,
    routes: [{ name: "MainTabs", params: { screen: "Home" } }],
  };
};

const PaymentReturnScreen = () => {
  const { t } = useTranslation("admin");
  const navigation = useNavigation();
  const route = useRoute();
  const moyasarId = route.params?.moyasarId || route.params?.id || null;

  const { status, payment, error } = usePaymentPoll(moyasarId);

  useEffect(() => {
    if (!payment) return;
    if (!TERMINAL_OK.has(payment.status)) return;

    // Clear stashed cart now that the payment landed; backend already
    // has the canonical record so this is purely UI cleanup.
    clearPendingCheckoutCart();

    const purpose = payment.metadata?.purpose;
    navigation.dispatch(CommonActions.reset(purposeStackRoutes(purpose)));
  }, [payment, navigation]);

  const goHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "MainTabs", params: { screen: "Home" } }],
      }),
    );
  };

  if (error) {
    const labelKey =
      error === "MISSING_ID"
        ? "paymentReturn.missingId"
        : error === "TIMEOUT"
        ? "paymentReturn.timeout"
        : "paymentReturn.error";
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error[500]} />
          <Text style={styles.title}>{t("paymentReturn.title")}</Text>
          <Text style={styles.body}>{t(labelKey)}</Text>
          <TouchableOpacity style={styles.btn} onPress={goHome}>
            <Text style={styles.btnText}>{t("paymentReturn.backHome")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.title}>{t("paymentReturn.title")}</Text>
        <Text style={styles.body}>{t("paymentReturn.confirming")}</Text>
        <Text style={styles.statusText}>
          {t(`paymentReturn.status.${status}`, status)}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: backgrounds.artboard },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[24],
    gap: spacing[12],
  },
  title: {
    ...textStyles.bodyLarge,
    fontWeight: typography.fontWeight.bold,
    color: colors.natural[900],
    marginTop: spacing[12],
  },
  body: {
    ...textStyles.bodyMedium,
    color: colors.natural[600],
    textAlign: "center",
  },
  statusText: {
    ...textStyles.bodySmall,
    color: colors.natural[450],
  },
  btn: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius[8],
    marginTop: spacing[16],
  },
  btnText: {
    ...textStyles.bodyMedium,
    color: colors.natural[50],
    fontWeight: typography.fontWeight.semibold,
  },
});

export default PaymentReturnScreen;

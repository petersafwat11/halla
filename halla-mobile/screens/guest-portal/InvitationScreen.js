import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { useTranslation } from "../../localization";
import useGuestByToken from "../../hooks/queries/useGuestPortal";
import useSubmitRSVP from "../../hooks/mutations/useGuestPortal";

const FALLBACK_BRAND_COLOR = "#C28E5C";
const FALLBACK_ACCENT_COLOR = "#6B4E33";
const FALLBACK_BG = "#F9F4EF";

const InvitationScreen = ({ route }) => {
  const code = route?.params?.code;
  const { t } = useTranslation("events");

  const { data, isLoading, isError, error, refetch } = useGuestByToken(code);
  const submit = useSubmitRSVP();

  // Local state captures the choice the user made this session — the
  // screen reads from `submitResult.guest.status` first, falling back to
  // the loaded guest. This makes the post-submit transition immediate
  // without having to re-fetch.
  const [submitChoice, setSubmitChoice] = useState(null);

  const guest = data?.data?.guest || data?.guest;
  const event = data?.data?.event || data?.event;
  // Whitelabel branding can arrive populated under `event.whitelabel`
  // (when the backend populates the WhiteLabel ref) or fall back to the
  // event's own `eventDetails.primaryColor` / `themeColor` for non-
  // whitelabel events. Defaults below preserve a sensible look without
  // either source.
  const whitelabel = event?.whitelabel || {};
  const brandColor =
    whitelabel.brandColor ||
    whitelabel.primaryColor ||
    event?.eventDetails?.primaryColor ||
    FALLBACK_BRAND_COLOR;
  const accentColor =
    whitelabel.accentColor || whitelabel.secondaryColor || FALLBACK_ACCENT_COLOR;
  const logoUri = whitelabel.logoUrl || whitelabel.logo || null;

  const currentStatus = submitChoice || guest?.status || "invited";
  const hasResponded = ["confirmed", "declined", "maybe"].includes(currentStatus);

  // Memo'd styles that depend on whitelabel colors. The base palette is
  // copied verbatim into a static StyleSheet below; this overlay only
  // re-keys the brand-color surfaces so React Native can dedupe the
  // common slabs.
  const themedStyles = useMemo(
    () =>
      StyleSheet.create({
        primaryButton: { backgroundColor: brandColor },
        accentButton: { backgroundColor: accentColor },
        eventName: { color: brandColor },
      }),
    [brandColor, accentColor]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: FALLBACK_BG }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={brandColor} />
          <Text style={styles.muted}>{t("guest.portal.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !guest || !event) {
    const status = error?.status;
    const messageKey =
      status === 404 || status === 410
        ? "guest.portal.invalidCode"
        : status === 400
        ? "guest.portal.notAccepting"
        : "guest.portal.networkError";

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: FALLBACK_BG }]}>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>{t("guest.portal.errorTitle")}</Text>
          <Text style={styles.muted}>{t(messageKey)}</Text>
          {status !== 404 && status !== 410 && status !== 400 && (
            <TouchableOpacity
              style={[styles.button, themedStyles.primaryButton]}
              onPress={() => refetch()}
            >
              <Text style={styles.buttonText}>{t("guest.portal.retry")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const handleRsvp = async (response) => {
    try {
      const result = await submit.mutateAsync({
        guestId: guest._id || guest.id,
        response,
        invitationCode: code,
      });
      setSubmitChoice(response);
      // If the backend reported a replay (409/410 on idempotency) we still
      // honor the original choice the user clicked — the success branches
      // below render the same UX.
      if (result?.replay) return;
    } catch (e) {
      // The mutation surface throws on transport / 4xx — render an inline
      // banner instead of an Alert so the page stays in the portal frame.
      // Falls back to the t() key if the backend message is empty.
    }
  };

  // ---- Confirmed (welcome + QR) -----------------------------------------
  if (currentStatus === "confirmed") {
    const qrValue = guest.qrcode || guest.qrUrl || guest.token || code;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: FALLBACK_BG }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
          ) : null}
          <Text style={[styles.eventName, themedStyles.eventName]}>
            {event.eventDetails?.eventName || event.name || ""}
          </Text>
          <Text style={styles.welcomeTitle}>{t("guest.portal.welcomeTitle")}</Text>
          <Text style={styles.welcomeBody}>{t("guest.portal.welcomeBody")}</Text>
          <View style={styles.qrWrap}>
            <QRCode value={String(qrValue)} size={220} />
          </View>
          <Text style={styles.qrLabel}>{t("guest.portal.qrLabel")}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- Declined / Maybe (thank-you) ------------------------------------
  if (currentStatus === "declined" || currentStatus === "maybe") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: FALLBACK_BG }]}>
        <View style={styles.centered}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
          ) : null}
          <Text style={styles.thanksTitle}>{t("guest.portal.thanksTitle")}</Text>
          <Text style={styles.muted}>
            {t(
              currentStatus === "declined"
                ? "guest.portal.thanksDeclined"
                : "guest.portal.thanksMaybe"
            )}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Invited (RSVP buttons) ------------------------------------------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: FALLBACK_BG }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
        ) : null}
        <Text style={[styles.eventName, themedStyles.eventName]}>
          {event.eventDetails?.eventName || event.name || ""}
        </Text>
        <Text style={styles.greeting}>
          {t("guest.portal.greeting", { name: guest.name || "" })}
        </Text>
        <Text style={styles.prompt}>{t("guest.portal.rsvpPrompt")}</Text>

        <TouchableOpacity
          style={[styles.button, themedStyles.primaryButton]}
          disabled={submit.isPending}
          onPress={() => handleRsvp("confirmed")}
        >
          {submit.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>{t("guest.portal.confirm")}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, themedStyles.accentButton]}
          disabled={submit.isPending}
          onPress={() => handleRsvp("maybe")}
        >
          <Text style={styles.buttonText}>{t("guest.portal.maybe")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.declineButton]}
          disabled={submit.isPending}
          onPress={() => handleRsvp("declined")}
        >
          <Text style={[styles.buttonText, styles.declineButtonText]}>
            {t("guest.portal.decline")}
          </Text>
        </TouchableOpacity>

        {submit.isError && (
          <Text style={styles.errorBanner}>
            {submit.error?.message || t("guest.portal.submitError")}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  scrollContent: {
    padding: 24,
    alignItems: "center",
    gap: 16,
  },
  logo: { width: 96, height: 96, marginBottom: 8 },
  eventName: {
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  greeting: {
    fontSize: 18,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
    textAlign: "center",
  },
  prompt: {
    fontSize: 16,
    fontFamily: "Cairo_500Medium",
    color: "#6B6B6B",
    marginBottom: 8,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
  },
  declineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#9CA3AF",
  },
  declineButtonText: { color: "#4B5563" },
  errorBanner: {
    color: "#B91C1C",
    fontFamily: "Cairo_500Medium",
    textAlign: "center",
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#B91C1C",
  },
  welcomeTitle: {
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "center",
  },
  welcomeBody: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#4B5563",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  qrWrap: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    marginVertical: 16,
  },
  qrLabel: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B6B6B",
  },
  thanksTitle: {
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "center",
  },
  muted: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#6B6B6B",
    textAlign: "center",
  },
});

export default InvitationScreen;

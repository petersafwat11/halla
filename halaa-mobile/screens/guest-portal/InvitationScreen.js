import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { useTranslation } from "../../localization";
import useGuestByToken from "../../hooks/guestPortal/queries";
import useSubmitRSVP from "../../hooks/guestPortal/mutations";

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
  // Optional RSVP details — a guest who opens the invitation link in the app
  // (universal link) can add this info.
  const [message, setMessage] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [plusOnes, setPlusOnes] = useState("");

  const guest = data?.data?.guest || data?.guest;
  const event = data?.data?.event || data?.event;
  // Event branding comes from the event's own `eventDetails.primaryColor`.
  // Defaults below preserve a sensible look without that source.
  const brandColor =
    event?.eventDetails?.primaryColor || FALLBACK_BRAND_COLOR;
  const accentColor = FALLBACK_ACCENT_COLOR;
  const logoUri = event?.eventDetails?.logoUrl || null;

  const currentStatus = submitChoice || guest?.status || "invited";
  const hasResponded = ["confirmed", "declined", "maybe"].includes(currentStatus);

  // Invitation type governs whether the RSVP buttons appear and whether a QR
  // is shown. The backend computes these flags on the event payload.
  const allowsReply = event?.allowsReply;
  const includesQr = event?.includesQr;
  const eventTitle =
    event?.title || event?.eventDetails?.eventName || event?.name || "";

  // Memo'd styles that depend on the brand colors. The base palette is
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

  // No-reply invitation types (qr_only / none): never show RSVP buttons.
  // qr_only shows the entry pass QR directly; none shows an info-only card.
  if (!allowsReply) {
    if (includesQr) {
      const qrValue = guest.qrcode || guest.qrUrl || guest.token || code;
      return (
        <SafeAreaView style={[styles.container, { backgroundColor: FALLBACK_BG }]}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
            ) : null}
            <Text style={[styles.eventName, themedStyles.eventName]}>{eventTitle}</Text>
            <Text style={styles.welcomeTitle}>{t("guest.portal.passTitle")}</Text>
            <Text style={styles.welcomeBody}>
              {t("guest.portal.passBody", { name: guest.name || "" })}
            </Text>
            <View style={styles.qrWrap}>
              <QRCode value={String(qrValue)} size={220} />
            </View>
            <Text style={styles.qrLabel}>{t("guest.portal.qrLabel")}</Text>
          </ScrollView>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: FALLBACK_BG }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
          ) : null}
          <Text style={[styles.eventName, themedStyles.eventName]}>{eventTitle}</Text>
          <Text style={styles.welcomeTitle}>{t("guest.portal.infoTitle")}</Text>
          <Text style={styles.welcomeBody}>
            {t("guest.portal.infoBody", { name: guest.name || "" })}
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const handleRsvp = async (response) => {
    try {
      const trimmedMessage = message.trim();
      const trimmedDiet = dietaryRestrictions.trim();
      const extraGuests = Number(plusOnes) || 0;
      const result = await submit.mutateAsync({
        guestId: guest._id || guest.id,
        response,
        invitationCode: code,
        ...(trimmedMessage ? { message: trimmedMessage } : {}),
        ...(trimmedDiet ? { dietaryRestrictions: trimmedDiet } : {}),
        ...(extraGuests > 0 ? { plusOnes: extraGuests } : {}),
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
          {/* reply_only (02) confirmations carry no QR entry code. */}
          {includesQr ? (
            <>
              <View style={styles.qrWrap}>
                <QRCode value={String(qrValue)} size={220} />
              </View>
              <Text style={styles.qrLabel}>{t("guest.portal.qrLabel")}</Text>
            </>
          ) : null}
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

        <View style={styles.optionalForm}>
          <Text style={styles.fieldLabel}>{t("guest.portal.messageLabel")}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder={t("guest.portal.messagePlaceholder")}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            editable={!submit.isPending}
          />
          <Text style={styles.fieldLabel}>{t("guest.portal.dietaryLabel")}</Text>
          <TextInput
            style={styles.input}
            value={dietaryRestrictions}
            onChangeText={setDietaryRestrictions}
            placeholderTextColor="#9CA3AF"
            editable={!submit.isPending}
          />
          <Text style={styles.fieldLabel}>{t("guest.portal.plusOnesLabel")}</Text>
          <TextInput
            style={styles.input}
            value={plusOnes}
            onChangeText={(v) => setPlusOnes(v.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            editable={!submit.isPending}
          />
        </View>

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
  optionalForm: {
    width: "100%",
    gap: 6,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#4B5563",
    alignSelf: "flex-start",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
    backgroundColor: "#FFF",
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: "top",
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

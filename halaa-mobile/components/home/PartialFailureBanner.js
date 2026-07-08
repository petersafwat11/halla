import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import useEventActionGate from "@halaa/shared/hooks/useEventActionGate";

/**
 * PartialFailureBanner — mobile mirror of
 * `halaa-web/app/[lang]/host/events/[id]/_components/PartialFailureBanner.jsx`.
 * Sibling of `EventFailureBanner`. Shown when an event went live (or
 * completed) but `messagingStatus.failedCount > 0` — i.e. the bulk
 * send didn't deliver to every guest.
 */
const PartialFailureBanner = ({ event, currentUser = null }) => {
  const { t } = useTranslation("events");
  const { hasFailedSends, failedCount } = useEventActionGate({
    event,
    currentUser,
  });

  if (!event || !hasFailedSends) return null;

  const total = event?.messagingStatus?.totalMessages || 0;
  const sent = event?.messagingStatus?.sentCount || 0;

  return (
    <View style={styles.banner} testID="partial-failure-banner">
      <Ionicons name="alert-circle-outline" size={20} color="#7A4F01" />
      <View style={styles.body}>
        <Text style={styles.title}>{t("partialFailure.title")}</Text>
        <Text style={styles.message}>
          {t("partialFailure.message", { failed: failedCount, total, sent })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF7E6",
    borderColor: "#FFD591",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#7A4F01",
    textAlign: "right",
  },
  message: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#7A4F01",
    lineHeight: 18,
    textAlign: "right",
  },
});

export default PartialFailureBanner;

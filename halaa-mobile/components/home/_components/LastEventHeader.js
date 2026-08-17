import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import { getStatusVisual } from "../../../constants/statusColors";

const STATUS_STYLE = {
  draft:     { ...getStatusVisual("draft"), textKey: "lastEvent.status.draft" },
  scheduled: { ...getStatusVisual("scheduled"), textKey: "lastEvent.status.scheduled" },
  live:      { ...getStatusVisual("live"), textKey: "lastEvent.status.live" },
  completed: { ...getStatusVisual("completed"), textKey: "lastEvent.status.completed" },
  suspended: { ...getStatusVisual("suspended"), textKey: "lastEvent.status.suspended" },
};

const DEFAULT_STATUS = {
  ...getStatusVisual("invited"),
  textKey: "lastEvent.status.default",
};

function formatDateTime(event, locale) {
  if (!event.date) return event.dateTime || "";
  const d = new Date(event.date);
  const dateStr = d.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  const timeStr = event.time || "";
  return `${dateStr}${timeStr ? " - " + timeStr : ""}`;
}

export default function LastEventHeader({ event, locale = "ar-SA" }) {
  const { t } = useTranslation("home");
  const title = event.title || t("lastEvent.untitled");
  const guestCount = event.guestCount || 0;
  const location = event.locationName || "";
  const status = STATUS_STYLE[event.status] || DEFAULT_STATUS;
  // Step-3 invitation image, signed by the dashboard endpoint. Fall back to the
  // legacy `image` field for any older payload shape.
  const image = event.templateImage || event.image;

  return (
    <View style={styles.contentRow}>
      <View style={styles.textContent}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.fg }]}>
              {t(status.textKey)}
            </Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Ionicons name="people-outline" size={12} color="#C28E5C" />
            <Text style={styles.detailText}>
              {guestCount} {t("lastEvent.guests")}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={12} color="#C28E5C" />
            <Text style={styles.detailText}>{formatDateTime(event, locale)}</Text>
          </View>
          {!!location && (
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={12} color="#C28E5C" />
              <Text style={styles.detailText}>{location}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.imageContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: "row",
    gap: 16,
  },
  textContent: {
    flex: 1,
    gap: 8,
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    lineHeight: 16,
    letterSpacing: 0.06,
  },
  title: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 24,
    letterSpacing: 0.024,
  },
  details: {
    gap: 8,
    alignItems: "flex-start",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 16,
    letterSpacing: 0.06,
  },
  imageContainer: {
    width: 54,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F2F2F2",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F2F2F2",
  },
});

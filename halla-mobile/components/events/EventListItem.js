import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const EventListItem = ({ event, onPress }) => {
  const formatDateTime = () => {
    if (event.date) {
      const date = new Date(event.date);
      const dateStr = date.toLocaleDateString("ar-SA", {
        weekday: "short",
        day: "numeric",
        month: "numeric",
      });
      const timeStr = event.time || "";
      return `${dateStr}${timeStr ? " - " + timeStr : ""}`;
    }
    return "غير محدد";
  };

  const guestCount = event.guestCount || event.totalInvites || 0;
  const confirmed = event.confirmedCount || event.confirmed || 0;
  const declined = event.declinedCount || event.declined || 0;
  const noResponse = Math.max(0, guestCount - confirmed - declined);

  const getStatusStyle = (status) => {
    switch (status) {
      case "live":
        return { bg: "#EAF4EF", color: "#2A8C5B", label: "مباشرة" };
      case "scheduled":
        return { bg: "#DBEAFE", color: "#1E40AF", label: "مجدولة" };
      case "draft":
        return { bg: "#FFF3E0", color: "#F57C00", label: "مسودة" };
      case "completed":
        return { bg: "#F2F2F2", color: "#656565", label: "منتهية" };
      case "cancelled":
        return { bg: "#FEE2E2", color: "#991B1B", label: "ملغية" };
      default:
        return { bg: "#F2F2F2", color: "#656565", label: status || "غير محدد" };
    }
  };

  const status = getStatusStyle(event.status);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Top row: image + info on the start (right in RTL), status at the end */}
      <View style={styles.topRow}>
        <View style={styles.mainGroup}>
          <View style={styles.imageContainer}>
            {event.image ? (
              <Image source={{ uri: event.image }} style={styles.image} />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={22} color="#C28E5C" />
              </View>
            )}
          </View>

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {event.title || "مناسبة بدون عنوان"}
            </Text>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
              <Text style={styles.detailText}>{formatDateTime()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={12} color="#9CA3AF" />
              <Text style={styles.detailText}>{guestCount} ضيف</Text>
            </View>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: "#2A8C5B" }]} />
          <Text style={styles.statText}>موافق {confirmed}</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: "#C0392B" }]} />
          <Text style={styles.statText}>معتذر {declined}</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: "#A0A0A0" }]} />
          <Text style={styles.statText}>لم يرد {noResponse}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  mainGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F9F4EF",
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#1F2937",
    lineHeight: 22,
    alignSelf: "stretch",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 99,
    marginTop: 2,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Cairo_600SemiBold",
    lineHeight: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#6B7280",
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    backgroundColor: "#FAFAFA",
    borderRadius: 6,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 11,
    fontFamily: "Cairo_500Medium",
    color: "#374151",
    lineHeight: 16,
  },
});

export default EventListItem;

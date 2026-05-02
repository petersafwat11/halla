import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
const EventDetails = ({ event, onStatsPress, onBack }) => {

  // Format backend data - handle both flat format (from getMyEvents/_formatEvent)
  // and nested format (from getEventById with eventDetails object)
  const title = event.eventDetails?.title || event.title || "مناسبة بدون عنوان";
  const eventType = event.eventDetails?.type || event.eventDetails?.eventType || event.eventType || event.type || "أخرى";
  // Location can be a string OR an object { address, latitude, longitude, city, country }
  const rawLocation = event.eventDetails?.location || event.location;
  const location = !rawLocation
    ? "غير محدد"
    : typeof rawLocation === "string"
    ? rawLocation
    : rawLocation.address || rawLocation.city || "غير محدد";
  const description =
    event.eventDetails?.description || event.description || "";

  // Format date and time
  const formatDateTime = () => {
    const eventDate = event.eventDetails?.date || event.date;
    const eventTime = event.eventDetails?.time || event.time;
    if (eventDate) {
      const date = new Date(eventDate);
      const dateStr = date.toLocaleDateString("ar-SA", {
        weekday: "long",
        day: "numeric",
        month: "numeric",
        year: "numeric"
      });
      return `${dateStr}${eventTime ? " - " + eventTime : ""}`;
    }
    return "غير محدد";
  };

  // Calculate guest count and moderators
  const guestCount = event.guestCount || event.guestList?.length || event.totalInvites || 0;
  const moderatorsCount =
    event.staffList?.length || event.staffCount || 0;

  // Get guest stats
  const confirmed =
    event.confirmedCount ||
    event.confirmed ||
    event.guestList?.filter((g) => g.status === "confirmed").length ||
    0;
  const declined =
    event.declined ||
    event.guestList?.filter((g) => g.status === "declined").length ||
    0;
  const noResponse = Math.max(0, guestCount - confirmed - declined);

  const getEventTypeLabel = () => {
    switch (eventType) {
      case "wedding": return "حفل زفاف";
      case "birthday": return "عيد ميلاد";
      case "graduation": return "تخرج";
      default: return "مناسبة";
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Image */}
        <View style={styles.imageWrapper}>
          <View style={styles.imageContainer}>
            {event.image ? (
              <Image source={{ uri: event.image }} style={styles.image} />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>INVITATION</Text>
                <Text style={styles.placeholderSubtext}>Dear, Lorem Ipsum</Text>
              </View>
            )}
          </View>
        </View>

        {/* Event Title */}
        <View style={styles.titleSection}>
          <Text style={styles.eventTitle}>{title}</Text>
          <Text style={styles.eventType}>{getEventTypeLabel()}</Text>
        </View>

        {/* Info Cards */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItemHalf}>
              <View style={styles.iconContainer}>
                <Ionicons name="people-outline" size={16} color="#C28E5C" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>ضيف مدعو</Text>
                <Text style={styles.infoValue}>{guestCount}</Text>
              </View>
            </View>

            <View style={styles.infoItemHalf}>
              <View style={styles.iconContainer}>
                <Ionicons name="person-add-outline" size={16} color="#C28E5C" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>مشرف</Text>
                <Text style={styles.infoValue}>{moderatorsCount}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItemHalf}>
              <View style={styles.iconContainer}>
                <Ionicons name="calendar-outline" size={16} color="#C28E5C" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>التوقيت</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{formatDateTime()}</Text>
              </View>
            </View>

            <View style={styles.infoItemHalf}>
              <View style={styles.iconContainer}>
                <Ionicons name="location-outline" size={16} color="#C28E5C" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>العنوان</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{location}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionTitle}>تفاصيل المناسبة</Text>
          <Text style={styles.descriptionText}>
            {description || "لا يوجد وصف للمناسبة"}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: "#2A8C5B" }]} />
            <Text style={styles.statValue}>{confirmed}</Text>
            <Text style={styles.statLabel}>موافق</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: "#C0392B" }]} />
            <Text style={styles.statValue}>{declined}</Text>
            <Text style={styles.statLabel}>معتذر</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: "#A0A0A0" }]} />
            <Text style={styles.statValue}>{noResponse}</Text>
            <Text style={styles.statLabel}>لم يرد</Text>
          </View>
        </View>

        {/* Stats Button */}
        <TouchableOpacity
          style={styles.statsButton}
          onPress={onStatsPress}
          activeOpacity={0.7}
        >
          <Text style={styles.statsButtonText}>احصائيات المناسبة</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F4EF"
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 32
  },
  imageWrapper: {
    position: "relative"
  },
  imageContainer: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  image: {
    width: "100%",
    height: 200,
    resizeMode: "cover"
  },
  placeholderImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#0D4D4D",
    justifyContent: "center",
    alignItems: "center"
  },
  placeholderText: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: "#C28E5C"
  },
  placeholderSubtext: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#C28E5C",
    marginTop: 4
  },
  titleSection: {
    gap: 4
  },
  eventTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 28
  },
  eventType: {
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: "#8A8A8A",
    lineHeight: 20
  },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: "#F5ECE4"
  },
  infoRow: {
    flexDirection: "row",
    gap: 12
  },
  infoItemHalf: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1
  },
  infoContent: {
    flex: 1
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 16
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 20
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C28E5C",
    justifyContent: "center",
    alignItems: "center"
  },
  descriptionCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#F5ECE4"
  },
  descriptionTitle: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 20
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 20
  },
  statsCard: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5ECE4"
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    lineHeight: 16
  },
  statValue: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 18
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  statsButton: {
    backgroundColor: "#C28E5C",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center"
  },
  statsButtonText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    lineHeight: 20
  }
});

export default EventDetails;

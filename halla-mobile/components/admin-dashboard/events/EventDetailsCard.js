import React from "react";
import { View, Text, Image, StyleSheet, ScrollView } from "react-native";
import PropTypes from "prop-types";
import { StatusBadge } from "../common";
import {
  colors,
  spacing,
  borderRadius,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";

/**
 * EventDetailsCard Component
 *
 * Displays comprehensive event information including event details,
 * host information, statistics, and status.
 *
 * @component
 * @example
 * <EventDetailsCard event={eventData} />
 */
const EventDetailsCard = ({ event }) => {
  /**
   * Get status badge color based on event status
   */
  const getStatusColor = (status) => {
    const statusColors = {
      active: colors.success[500],
      ended: colors.natural[400],
      suspended: colors.error[500],
      pending_scheduling: colors.warning[500],
    };
    return statusColors[status?.toLowerCase()] || colors.natural[400];
  };

  /**
   * Calculate attendance rate
   */
  const calculateAttendanceRate = () => {
    return event.confirmedGuests || 0;
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return "غير محدد";
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  /**
   * Format time for display
   */
  const formatTime = (timeString) => {
    if (!timeString) return "غير محدد";
    return timeString;
  };

  const attendanceRate = calculateAttendanceRate();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Event Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>معلومات المناسبة</Text>

        {/* Event Image */}
        {event.image && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: event.image }}
              style={styles.eventImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Title and Status */}
        <View style={styles.row}>
          <Text style={styles.label}>العنوان:</Text>
          <View style={styles.titleRow}>
            <Text style={styles.value}>{event.title || "بدون عنوان"}</Text>
            <StatusBadge
              status={event.status || "pending_scheduling"}
              color={getStatusColor(event.status)}
            />
          </View>
        </View>

        {/* Description */}
        {event.description && (
          <View style={styles.row}>
            <Text style={styles.label}>الوصف:</Text>
            <Text style={styles.value}>{event.description}</Text>
          </View>
        )}

        {/* Date */}
        <View style={styles.row}>
          <Text style={styles.label}>التاريخ:</Text>
          <Text style={styles.value}>{formatDate(event.date)}</Text>
        </View>

        {/* Time */}
        <View style={styles.row}>
          <Text style={styles.label}>الوقت:</Text>
          <Text style={styles.value}>{formatTime(event.time)}</Text>
        </View>

        {/* Location */}
        {event.location && (
          <View style={styles.row}>
            <Text style={styles.label}>الموقع:</Text>
            <Text style={styles.value}>{event.location}</Text>
          </View>
        )}
      </View>

      {/* Host Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>معلومات المضيف</Text>

        <View style={styles.row}>
          <Text style={styles.label}>الاسم:</Text>
          <Text style={styles.value}>{event.hostName || "غير محدد"}</Text>
        </View>

        {event.hostEmail && (
          <View style={styles.row}>
            <Text style={styles.label}>البريد الإلكتروني:</Text>
            <Text style={styles.value}>{event.hostEmail}</Text>
          </View>
        )}

        {event.hostPhone && (
          <View style={styles.row}>
            <Text style={styles.label}>الهاتف:</Text>
            <Text style={styles.value}>{event.hostPhone}</Text>
          </View>
        )}
      </View>

      {/* Statistics Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الإحصائيات</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{event.totalGuests || 0}</Text>
            <Text style={styles.statLabel}>إجمالي الضيوف</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success[500] }]}>
              {event.confirmedGuests || 0}
            </Text>
            <Text style={styles.statLabel}>مؤكد</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.warning[500] }]}>
              {event.pendingGuests || 0}
            </Text>
            <Text style={styles.statLabel}>قيد الانتظار</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.error[500] }]}>
              {event.declinedGuests || 0}
            </Text>
            <Text style={styles.statLabel}>رفض</Text>
          </View>
        </View>

        <View style={styles.attendanceRateContainer}>
          <Text style={styles.attendanceLabel}>عدد القبول:</Text>
          <Text
            style={[styles.attendanceValue, { color: colors.success[500] }]}
          >
            {attendanceRate}
          </Text>
        </View>
      </View>

      {/* Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>معلومات الحالة</Text>

        <View style={styles.row}>
          <Text style={styles.label}>الحالة الحالية:</Text>
          <StatusBadge
            status={event.status || "pending_scheduling"}
            color={getStatusColor(event.status)}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>تاريخ الإنشاء:</Text>
          <Text style={styles.value}>{formatDate(event.createdAt)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>آخر تحديث:</Text>
          <Text style={styles.value}>{formatDate(event.updatedAt)}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

EventDetailsCard.propTypes = {
  /** Event data object */
  event: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    description: PropTypes.string,
    image: PropTypes.string,
    date: PropTypes.string,
    time: PropTypes.string,
    location: PropTypes.string,
    hostName: PropTypes.string,
    hostEmail: PropTypes.string,
    hostPhone: PropTypes.string,
    status: PropTypes.string,
    totalGuests: PropTypes.number,
    confirmedGuests: PropTypes.number,
    pendingGuests: PropTypes.number,
    declinedGuests: PropTypes.number,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string,
  }).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    padding: spacing[16],
    marginBottom: spacing[16],
  },
  sectionTitle: {
    ...textStyles.titleMedium,
    color: colors.natural[900],
    marginBottom: spacing[16],
  },
  imageContainer: {
    marginBottom: spacing[16],
  },
  eventImage: {
    width: "100%",
    height: 200,
    borderRadius: borderRadius[8],
  },
  row: {
    marginBottom: spacing[12],
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing[4],
  },
  label: {
    ...textStyles.bodyMedium,
    color: colors.natural[500],
    marginBottom: spacing[4],
  },
  value: {
    ...textStyles.bodyMedium,
    color: colors.natural[900],
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing[8],
    marginBottom: spacing[16],
  },
  statCard: {
    width: "50%",
    padding: spacing[8],
    alignItems: "center",
  },
  statValue: {
    ...textStyles.titleLarge,
    color: colors.primary[500],
    marginBottom: spacing[4],
  },
  statLabel: {
    ...textStyles.bodySmall,
    color: colors.natural[500],
    textAlign: "center",
  },
  attendanceRateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing[16],
    borderTopWidth: 1,
    borderTopColor: colors.natural[200],
  },
  attendanceLabel: {
    ...textStyles.bodyMedium,
    color: colors.natural[500],
  },
  attendanceValue: {
    ...textStyles.titleLarge,
    fontWeight: "bold",
  },
});

export default EventDetailsCard;

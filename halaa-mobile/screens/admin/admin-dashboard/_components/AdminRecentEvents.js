import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDate } from "@halaa/shared/utils/locale";
import { useTranslation } from "../../../../localization";
import AdaptiveText from "../../../components/commen/AdaptiveText";
import LocalizedText from "../../../components/commen/LocalizedText";
import { colors, spacing, borderRadius, typography, textStyles, backgrounds } from "../../../../styles/tokens";

const EVENT_STATUS_COLORS = {
  live: colors.success[500],
  scheduled: "#3498DB",
  draft: colors.natural[400],
  completed: colors.natural[350],
  cancelled: colors.error[500],
  pending: colors.warning[500],
  upcoming: "#3498DB",
  ongoing: colors.success[500],
};

const AdminRecentEvents = ({ events, t, onViewAll }) => {
  const { currentLanguage } = useTranslation();
  if (!events.length) return null;

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary[500]} />
          <LocalizedText style={styles.sectionTitle}>{t("dashboard.recentEvents.title")}</LocalizedText>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <LocalizedText style={styles.viewAllText}>{t("common.viewAll")}</LocalizedText>
          </TouchableOpacity>
        )}
      </View>
      {events.map((event, idx) => {
        const statusColor = EVENT_STATUS_COLORS[event.status] ?? colors.natural[400];
        const dateStr = event.date ? formatDate(event.date, currentLanguage) : "—";
        return (
          <React.Fragment key={event._id ?? event.id ?? idx}>
            {idx > 0 && <View style={styles.divider} />}
            <View style={styles.eventRow}>
              <View style={[styles.eventStrip, { backgroundColor: statusColor }]} />
              <View style={styles.listRowContent}>
                {/* Event title is backend content — first-strong + isolation. */}
                <AdaptiveText style={styles.listRowName} numberOfLines={1}>
                  {event.title}
                </AdaptiveText>
                {/* Structured nested runs: adaptive host name and a
                    locale-formatted date stay isolated from each other. */}
                <Text style={styles.listRowSub} numberOfLines={1} writingDirection={currentLanguage === "ar" ? "rtl" : "ltr"}>
                  <AdaptiveText>{event.host}</AdaptiveText>
                  {" · "}
                  <LocalizedText>{dateStr}</LocalizedText>
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
                <LocalizedText style={[styles.statusText, { color: statusColor }]}>
                  {t(`events.status.${event.status}`) || event.status}
                </LocalizedText>
              </View>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.natural[200],
    padding: spacing[16],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[12],
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  sectionTitle: {
    ...textStyles.bodyLarge,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
  },
  viewAllText: {
    ...textStyles.labelLarge,
    color: colors.primary[500],
  },
  divider: {
    height: 1,
    backgroundColor: colors.natural[200],
    marginVertical: spacing[8],
  },
  listRowContent: { flex: 1 },
  listRowName: {
    ...textStyles.bodyMedium,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[900],
  },
  listRowSub: {
    ...textStyles.labelMedium,
    color: colors.natural[450],
    marginTop: 2,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
  },
  eventStrip: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: borderRadius[4],
    minHeight: 36,
    flexShrink: 0,
  },
  statusBadge: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[8],
  },
  statusText: {
    fontSize: typography.fontSize.label.small,
    fontWeight: typography.fontWeight.medium,
  },
});

export default AdminRecentEvents;

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AdaptiveText from "../../../../components/commen/AdaptiveText";
import LocalizedText from "../../../../components/commen/LocalizedText";
import { colors, spacing, borderRadius, typography, textStyles, backgrounds } from "../../../../styles/tokens";

const HOST_STATUS_COLORS = {
  active: colors.success[500],
  pending: colors.warning[500],
  suspended: colors.error[500],
  inactive: colors.natural[400],
};

const AdminRecentHosts = ({ hosts, t, onViewAll }) => {
  if (!hosts.length) return null;

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name="people-outline" size={18} color={colors.primary[500]} />
          <LocalizedText style={styles.sectionTitle}>{t("dashboard.recentHosts.title")}</LocalizedText>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <LocalizedText style={styles.viewAllText}>{t("common.viewAll")}</LocalizedText>
          </TouchableOpacity>
        )}
      </View>
      {hosts.map((host, idx) => {
        const name = host.name || "—";
        const initial = name.charAt(0).toUpperCase();
        const statusColor = HOST_STATUS_COLORS[host.status] ?? colors.natural[400];
        return (
          <React.Fragment key={host._id ?? host.id ?? idx}>
            {idx > 0 && <View style={styles.divider} />}
            <View style={styles.listRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={styles.listRowContent}>
                {/* Host names and emails are backend content — first-strong. */}
                <AdaptiveText style={styles.listRowName} numberOfLines={1}>{name}</AdaptiveText>
                <AdaptiveText style={styles.listRowSub} numberOfLines={1}>{host.email}</AdaptiveText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
                <LocalizedText style={[styles.statusText, { color: statusColor }]}>
                  {t(`hosts.status.${host.status}`) || host.status}
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
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
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
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[500],
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: typography.fontSize.label.large,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[50],
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

export default AdminRecentHosts;

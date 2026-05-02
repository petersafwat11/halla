import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SectionCard } from "./HostSectionCard";
import { colors, spacing, borderRadius, textStyles, typography } from "../../../styles/tokens";

const ActionRow = ({ icon, iconBg, iconColor, label, sublabel, onPress, loading, last, destructive }) => (
  <TouchableOpacity
    style={[styles.row, !last && styles.rowBorder]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.7}
  >
    <View style={styles.rowLeft}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Ionicons name={icon} size={16} color={iconColor} />
        )}
      </View>
      <View>
        <Text style={[styles.label, destructive && styles.labelDestructive]}>{label}</Text>
        <Text style={styles.sublabel}>{sublabel}</Text>
      </View>
    </View>
    <Ionicons name="chevron-forward" size={16} color={colors.natural[300]} />
  </TouchableOpacity>
);

const HostAdminActions = ({
  host,
  canEdit,
  canDelete,
  onManageSub,
  onToggleStatus,
  onDelete,
  updatePending,
  deletePending,
}) => {
  if (!canEdit && !canDelete) return null;

  const isActive = host.status === "active";

  return (
    <SectionCard title="Admin Actions" icon="shield-outline">
      {canEdit && (
        <ActionRow
          icon="card-outline"
          iconBg={`${colors.primary[500]}15`}
          iconColor={colors.primary[500]}
          label="Manage Subscription"
          sublabel="Change plan or billing cycle"
          onPress={onManageSub}
          last={!canEdit || (!canDelete && !isActive)}
        />
      )}
      {canEdit && (
        <ActionRow
          icon={isActive ? "pause-circle-outline" : "checkmark-circle-outline"}
          iconBg={isActive ? colors.warning[50] : colors.success[50]}
          iconColor={isActive ? colors.warning[500] : colors.success[500]}
          label={isActive ? "Suspend Host" : "Activate Host"}
          sublabel={
            isActive
              ? "Prevent host from creating events"
              : "Allow host to create events again"
          }
          onPress={onToggleStatus}
          loading={updatePending}
          last={!canDelete}
        />
      )}
      {canDelete && (
        <ActionRow
          icon="trash-outline"
          iconBg={colors.error[50]}
          iconColor={colors.error[500]}
          label="Delete Host"
          sublabel="Permanently remove this host"
          onPress={onDelete}
          loading={deletePending}
          destructive
          last
        />
      )}
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius[8],
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...textStyles.bodyMedium,
    color: colors.natural[900],
    fontWeight: typography.fontWeight.semibold,
  },
  labelDestructive: { color: colors.error[500] },
  sublabel: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[400],
    marginTop: 2,
  },
});

export default HostAdminActions;

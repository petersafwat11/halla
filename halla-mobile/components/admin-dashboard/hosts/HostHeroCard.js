import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import StatusBadge from "../common/StatusBadge";
import { getStatusVisual } from "../../../constants/statusColors";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";

const getPlanStyle = (planType) => {
  if (!planType) return { color: colors.natural[500], bg: colors.natural[150] };
  const t = planType.toLowerCase();
  if (t.includes("elite")) return { color: colors.error[500], bg: colors.error[50] };
  if (t.includes("pro"))   return { color: colors.warning[500], bg: colors.warning[50] };
  if (t.includes("lite"))  return { color: "#9B59B6", bg: "#F5EEF8" };
  if (t.includes("single")) return { color: "#3498DB", bg: "#E8F4FD" };
  if (t.includes("trial")) return { color: colors.natural[400], bg: colors.natural[150] };
  return { color: colors.primary[500], bg: colors.primary[50] };
};

const HostHeroCard = ({ host }) => {
  if (!host) return null;

  const initial = (host.name || host.username || "?")[0].toUpperCase();
  const subscription = host.subscription;
  const planName =
    subscription?.planId?.nameEn ||
    subscription?.planId?.name ||
    subscription?.planType ||
    null;
  const planStyle = getPlanStyle(subscription?.planType);

  const statusDotColor = getStatusVisual(host.status).fg;

  return (
    <View style={styles.card}>
      <View style={styles.avatarWrap}>
        {host.avatar ? (
          <Image source={{ uri: host.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
        <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {host.name || host.username || "Unnamed Host"}
        </Text>
        {host.email && (
          <Text style={styles.sub} numberOfLines={1}>{host.email}</Text>
        )}
        {host.phoneNumber && (
          <Text style={styles.sub}>{host.phoneNumber}</Text>
        )}
        <View style={styles.badges}>
          <StatusBadge status={host.status} size="small" />
          {planName && (
            <View style={[styles.planChip, { backgroundColor: planStyle.bg }]}>
              <Text style={[styles.planChipText, { color: planStyle.color }]}>
                {planName}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    padding: spacing[16],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarWrap: { position: "relative" },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary[500]}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[500],
  },
  statusDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: backgrounds.card[1],
  },
  info: { flex: 1, gap: spacing[4] },
  name: {
    ...textStyles.titleSmall,
    color: colors.natural[900],
    fontWeight: typography.fontWeight.semibold,
  },
  sub: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
  },
  badges: {
    flexDirection: "row",
    gap: spacing[8],
    marginTop: spacing[4],
    flexWrap: "wrap",
    alignItems: "center",
  },
  planChip: {
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: borderRadius[20],
  },
  planChipText: { fontSize: 11, fontWeight: typography.fontWeight.semibold },
});

export default HostHeroCard;

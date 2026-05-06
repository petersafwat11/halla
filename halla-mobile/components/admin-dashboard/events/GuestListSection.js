import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "../../../styles/tokens";

const RSVP_CONFIG = {
  confirmed: { color: "#2A8C5B", bg: "#EAF4EF", labelKey: "confirmed" },
  pending: { color: "#D38200", bg: "#FBF3E6", labelKey: "pending" },
  declined: { color: "#C0392B", bg: "#F9EBEA", labelKey: "declined" },
};

const GuestListSection = ({ guestList, t, SectionCard }) => {
  const renderGuest = (g, idx) => {
    const rsvpKey = g.rsvpStatus?.toLowerCase();
    const rsvpCfg = RSVP_CONFIG[rsvpKey] || { color: "#666", bg: "#F5F5F5", labelKey: "unknown" };
    const label = t(`eventDetails.rsvpStatuses.${rsvpCfg.labelKey}`, rsvpCfg.labelKey);

    return (
      <View
        key={g.id || g._id || idx}
        style={[styles.guestRow, idx < guestList.length - 1 && styles.guestRowBorder]}
      >
        <View style={styles.guestInfo}>
          <Text style={styles.guestName} numberOfLines={1}>
            {g.name || g.user?.name || t("common.unknown")}
          </Text>
          {(g.email || g.user?.email) ? (
            <Text style={styles.guestEmail} numberOfLines={1}>
              {g.email || g.user?.email}
            </Text>
          ) : null}
        </View>
        <View style={styles.guestRight}>
          <View style={[styles.rsvpChip, { backgroundColor: rsvpCfg.bg }]}>
            <Text style={[styles.rsvpText, { color: rsvpCfg.color }]}>{label}</Text>
          </View>
          {g.checkedIn && <View style={styles.checkedInDot} />}
        </View>
      </View>
    );
  };

  return (
    <SectionCard title={t("eventDetails.guestList")} icon="people-outline">
      <View style={styles.guestHeader}>
        <View style={[styles.guestCountBadge, { backgroundColor: `${colors.primary[500]}15` }]}>
          <Text style={styles.guestCountText}>{guestList.length}</Text>
        </View>
      </View>
      {guestList.length === 0 ? (
        <View style={styles.guestEmpty}>
          <Ionicons name="people-outline" size={32} color={colors.natural[300]} />
          <Text style={styles.guestEmptyText}>{t("eventDetails.noGuests")}</Text>
        </View>
      ) : (
        guestList.map(renderGuest)
      )}
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  guestHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[100],
  },
  guestCountBadge: {
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: borderRadius[20],
  },
  guestCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary[500],
  },
  guestEmpty: {
    padding: spacing[32],
    alignItems: "center",
    gap: spacing[8],
  },
  guestEmptyText: { fontSize: 12, color: colors.natural[400] },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  guestRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[100],
  },
  guestInfo: { flex: 1 },
  guestName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.natural[900],
  },
  guestEmail: {
    fontSize: 12,
    color: colors.natural[450],
    marginTop: 2,
  },
  guestRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  rsvpChip: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[20],
  },
  rsvpText: { fontSize: 11, fontWeight: "600" },
  checkedInDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success[500],
  },
});

export default GuestListSection;

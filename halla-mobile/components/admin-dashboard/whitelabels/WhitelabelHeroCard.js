import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import StatusBadge from "../../admin-dashboard/common/StatusBadge";
import { backgrounds, colors, spacing, borderRadius, typography, textStyles } from "../../../styles/tokens";

const IMAGE_BASE = "https://labbe-backend-production.up.railway.app";
const resolveLogo = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${IMAGE_BASE}${path.startsWith("/") ? path : `/${path}`}`;
};

const WhitelabelHeroCard = ({ whitelabel }) => {
  const { t } = useTranslation("admin");

  const wlData =
    whitelabel?.profile?.whitelabelData ||
    whitelabel?.roleData ||
    whitelabel?.whitelabelData ||
    {};

  const arabicName = wlData.arabicName;
  const englishName = wlData.englishName;
  const displayName = arabicName || englishName || whitelabel?.username || "—";
  const subtitleName = arabicName && englishName ? englishName : null;
  const logo = resolveLogo(wlData.logo);

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        {logo ? (
          <Image source={{ uri: logo }} style={styles.avatarImg} />
        ) : (
          <Ionicons name="business-outline" size={28} color={colors.primary[500]} />
        )}
      </View>

      <Text style={styles.name}>{displayName}</Text>
      {subtitleName ? <Text style={styles.subtitle}>{subtitleName}</Text> : null}
      {whitelabel?.username ? <Text style={styles.username}>@{whitelabel.username}</Text> : null}

      <View style={styles.badgeRow}>
        <StatusBadge status={whitelabel?.status || "pending"} size="small" />
      </View>

      {whitelabel?.email ? (
        <View style={styles.metaRow}>
          <Ionicons name="mail-outline" size={13} color={colors.natural[400]} />
          <Text style={styles.metaText}>{whitelabel.email}</Text>
        </View>
      ) : null}
      {whitelabel?.phoneNumber ? (
        <View style={styles.metaRow}>
          <Ionicons name="call-outline" size={13} color={colors.natural[400]} />
          <Text style={styles.metaText}>{whitelabel.phoneNumber}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[16],
    alignItems: "center",
    paddingVertical: spacing[24],
    paddingHorizontal: spacing[20],
    gap: spacing[6],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.primary[500]}15`,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: spacing[8],
  },
  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  name: { ...textStyles.titleLarge, color: colors.natural[900], textAlign: "center" },
  subtitle: { fontSize: typography.fontSize.body.small, color: colors.natural[500], textAlign: "center" },
  username: { fontSize: typography.fontSize.body.small, color: colors.natural[400] },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: spacing[8], marginTop: spacing[4] },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing[4], marginTop: spacing[4] },
  metaText: { fontSize: typography.fontSize.body.small, color: colors.natural[450] },
});

export default WhitelabelHeroCard;

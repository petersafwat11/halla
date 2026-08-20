import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDate } from "@halaa/shared/utils/locale";
import { useTranslation } from "../../../localization";
import { colors, spacing, borderRadius, textStyles, backgrounds } from "../../../styles/tokens";

const TicketHeroCard = ({ ticket, statusCfg, priorityCfg, statusLabel, priorityLabel, t, onResolve }) => {
  const { currentLanguage } = useTranslation();
  return (
  <View style={styles.heroCard}>
    <View style={[styles.heroAccent, { backgroundColor: statusCfg.color }]} />
    <View style={styles.heroBody}>
      <View style={styles.heroTop}>
        <Text style={styles.heroTicketNum}>#{ticket.ticketNumber || ticket.id?.toString().slice(-8) || "—"}</Text>
        <View style={[styles.priorityChip, { backgroundColor: priorityCfg.bg }]}>
          <Text style={[styles.priorityChipText, { color: priorityCfg.color }]}>{priorityLabel}</Text>
        </View>
      </View>
      <Text style={styles.heroSubject}>{ticket.subject || t("ticketDetails.noSubject")}</Text>
      <View style={styles.heroStatusRow}>
        <View style={[styles.statusChip, { backgroundColor: statusCfg.bg }]}>
          <Ionicons name={statusCfg.icon} size={13} color={statusCfg.color} />
          <Text style={[styles.statusChipText, { color: statusCfg.color }]}>{statusLabel}</Text>
        </View>
        {ticket.category && (
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{ticket.category}</Text>
          </View>
        )}
        <Text style={styles.heroDate}>{formatDate(ticket.createdAt, currentLanguage)}</Text>
      </View>
    </View>
  </View>
  );
};

const styles = StyleSheet.create({
  heroCard: { backgroundColor: backgrounds.card[1], borderRadius: borderRadius[16], flexDirection: "row", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  heroAccent: { width: 5 },
  heroBody: { flex: 1, padding: spacing[16], gap: spacing[8] },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroTicketNum: { fontSize: 12, color: colors.natural[450], fontWeight: "600" },
  heroSubject: { ...textStyles.titleLarge, color: colors.natural[900] },
  heroStatusRow: { flexDirection: "row", alignItems: "center", gap: spacing[8], flexWrap: "wrap", marginTop: spacing[4] },
  heroDate: { fontSize: 12, color: colors.natural[400], marginStart: "auto" },
  statusChip: { flexDirection: "row", alignItems: "center", gap: spacing[4], paddingHorizontal: spacing[8], paddingVertical: spacing[4], borderRadius: borderRadius[20] },
  statusChipText: { fontSize: 12, fontWeight: "600" },
  priorityChip: { paddingHorizontal: spacing[8], paddingVertical: spacing[4], borderRadius: borderRadius[20] },
  priorityChipText: { fontSize: 12, fontWeight: "600" },
  categoryChip: { backgroundColor: `${colors.primary[500]}12`, paddingHorizontal: spacing[8], paddingVertical: spacing[4], borderRadius: borderRadius[20] },
  categoryChipText: { fontSize: 12, color: colors.primary[500], fontWeight: "500" },
});

export default TicketHeroCard;

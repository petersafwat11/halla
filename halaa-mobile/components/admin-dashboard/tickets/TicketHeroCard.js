import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDate } from "@halaa/shared/utils/locale";
import { isolateAuto, isolateLtr } from "@halaa/shared/utils/bidi";
import AdaptiveText from "../../commen/AdaptiveText";
import LocalizedText from "../../commen/LocalizedText";
import { useTranslation } from "../../../localization";
import { colors, spacing, borderRadius, textStyles, backgrounds } from "../../../styles/tokens";

/**
 * Ticket hero card (admin ticket details).
 *
 * Content-direction classification (blueprint §5/§6):
 *  - ticket number  → ltr token (stable `#`+digits order in every locale);
 *  - subject        → adaptive backend text (first-strong + isolate);
 *  - status/priority→ localized app copy (UI locale, never the value script);
 *  - category       → adaptive backend value;
 *  - date           → locale-formatted via shared utils, first-strong isolated.
 */
const TicketHeroCard = ({ ticket, statusCfg, priorityCfg, statusLabel, priorityLabel, t }) => {
  const { currentLanguage } = useTranslation();
  const ticketNumber = ticket.ticketNumber || ticket.id?.toString().slice(-8) || null;
  const formattedDate = formatDate(ticket.createdAt, currentLanguage);

  return (
    <View style={styles.heroCard}>
      <View style={[styles.heroAccent, { backgroundColor: statusCfg.color }]} />
      <View style={styles.heroBody}>
        <View style={styles.heroTop}>
          {ticketNumber ? (
            <LocalizedText style={[styles.heroTicketNum, styles.ltrToken]}>
              {isolateLtr(`#${ticketNumber}`)}
            </LocalizedText>
          ) : (
            <LocalizedText style={styles.heroTicketNum}>—</LocalizedText>
          )}
          <View style={[styles.priorityChip, { backgroundColor: priorityCfg.bg }]}>
            <LocalizedText style={[styles.priorityChipText, { color: priorityCfg.color }]}>
              {priorityLabel}
            </LocalizedText>
          </View>
        </View>
        <AdaptiveText style={styles.heroSubject}>
          {ticket.subject || t("ticketDetails.noSubject")}
        </AdaptiveText>
        <View style={styles.heroStatusRow}>
          <View style={[styles.statusChip, { backgroundColor: statusCfg.bg }]}>
            {/* Status glyphs are semantic state icons — never mirrored. */}
            <Ionicons name={statusCfg.icon} size={13} color={statusCfg.color} />
            <LocalizedText style={[styles.statusChipText, { color: statusCfg.color }]}>
              {statusLabel}
            </LocalizedText>
          </View>
          {ticket.category && (
            <View style={styles.categoryChip}>
              <AdaptiveText style={styles.categoryChipText}>{ticket.category}</AdaptiveText>
            </View>
          )}
          {!!formattedDate && (
            <LocalizedText style={styles.heroDate}>{isolateAuto(formattedDate)}</LocalizedText>
          )}
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
  ltrToken: { writingDirection: "ltr" },
  heroSubject: { ...textStyles.titleLarge, color: colors.natural[900] },
  heroStatusRow: { flexDirection: "row", alignItems: "center", gap: spacing[8], flexWrap: "wrap", marginTop: spacing[4] },
  // The date hugs the logical end of the row in every locale.
  heroDate: { fontSize: 12, color: colors.natural[400], marginStart: "auto" },
  statusChip: { flexDirection: "row", alignItems: "center", gap: spacing[4], paddingHorizontal: spacing[8], paddingVertical: spacing[4], borderRadius: borderRadius[20] },
  statusChipText: { fontSize: 12, fontWeight: "600" },
  priorityChip: { paddingHorizontal: spacing[8], paddingVertical: spacing[4], borderRadius: borderRadius[20] },
  priorityChipText: { fontSize: 12, fontWeight: "600" },
  categoryChip: { backgroundColor: `${colors.primary[500]}12`, paddingHorizontal: spacing[8], paddingVertical: spacing[4], borderRadius: borderRadius[20] },
  categoryChipText: { fontSize: 12, color: colors.primary[500], fontWeight: "500" },
});

export default TicketHeroCard;

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import { formatDate } from "@halaa/shared/utils/locale";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";
import { getStatusVisual } from "../../../constants/statusColors";

function getDiscountStatus(discount) {
  if (discount.validUntil && new Date(discount.validUntil) < new Date())
    return "expired";
  if (discount.maxUses > 0 && discount.usedCount >= discount.maxUses)
    return "exhausted";
  return discount.isActive ? "active" : "inactive";
}

const DiscountListItem = ({
  discount,
  onEdit,
  onDelete,
  onToggleActive,
  canEdit,
  canDelete,
}) => {
  const { t, currentLanguage } = useTranslation("admin");

  const status = getDiscountStatus(discount);
  const statusVisual = getStatusVisual(status);
  const statusLabel = t(`discounts.status.${status}`);

  const isPercentage = discount.discountType === "percentage";
  const valueLabel = isPercentage
    ? `${discount.value}%`
    : `${discount.value} ${t("discounts.labels.sar")}`;

  const usageLabel =
    discount.maxUses > 0
      ? `${discount.usedCount} / ${discount.maxUses}`
      : String(discount.usedCount ?? 0);

  const expiryLabel = discount.validUntil
    ? formatDate(discount.validUntil, currentLanguage)
    : t("discounts.labels.noExpiry");

  return (
    <View style={styles.card}>
      {/* ── Header: Voucher Code & Status Badge ── */}
      <View style={styles.topRow}>
        <View style={styles.codeBadge}>
          <Ionicons name="pricetag" size={15} color={colors.primary[600]} />
          <Text style={styles.codeText} numberOfLines={1}>
            {discount.code}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusVisual.bg }]}>
          <Text style={[styles.statusText, { color: statusVisual.fg }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* ── Value & Type Hero Box ── */}
      <View style={styles.valueCard}>
        <View style={styles.valueLeft}>
          <Text style={styles.valueLabelText}>{t("discounts.labels.value")}</Text>
          <Text style={styles.valueHighlight}>{valueLabel}</Text>
        </View>
        <View style={styles.typeBadge}>
          <Ionicons
            name={isPercentage ? "pie-chart-outline" : "cash-outline"}
            size={14}
            color={colors.primary[700]}
          />
          <Text style={styles.typeBadgeText}>
            {t(`discounts.type.${discount.discountType}`)}
          </Text>
        </View>
      </View>

      {/* ── Details Grid (Usage & Expiry) ── */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailBox}>
          <View style={styles.detailIconRow}>
            <Ionicons name="repeat-outline" size={14} color={colors.natural[450]} />
            <Text style={styles.detailBoxLabel}>{t("discounts.labels.usage")}</Text>
          </View>
          <Text style={styles.detailBoxValue}>{usageLabel}</Text>
        </View>

        <View style={styles.detailBox}>
          <View style={styles.detailIconRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.natural[450]} />
            <Text style={styles.detailBoxLabel}>{t("discounts.labels.expires")}</Text>
          </View>
          <Text style={styles.detailBoxValue}>{expiryLabel}</Text>
        </View>
      </View>

      {/* ── Actions Footer ── */}
      {(canEdit || canDelete) && (
        <View style={styles.actionsRow}>
          {canEdit && onToggleActive && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                discount.isActive ? styles.deactivateBtn : styles.activateBtn,
              ]}
              onPress={() => onToggleActive(discount)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={discount.isActive ? "pause-circle-outline" : "checkmark-circle-outline"}
                size={16}
                color={discount.isActive ? colors.warning[600] : colors.success[600]}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: discount.isActive ? colors.warning[600] : colors.success[600] },
                ]}
              >
                {discount.isActive
                  ? t("discounts.actions.deactivate")
                  : t("discounts.actions.activate")}
              </Text>
            </TouchableOpacity>
          )}

          {canEdit && onEdit && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.editBtn]}
              onPress={() => onEdit(discount)}
              activeOpacity={0.75}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary[600]} />
              <Text style={[styles.actionBtnText, { color: colors.primary[600] }]}>
                {t("discounts.actions.edit")}
              </Text>
            </TouchableOpacity>
          )}

          {canDelete && onDelete && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => onDelete(discount)}
              activeOpacity={0.75}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error[500]} />
              <Text style={[styles.actionBtnText, { color: colors.error[500] }]}>
                {t("discounts.actions.delete")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[16],
    padding: spacing[16],
    marginBottom: spacing[12],
    borderWidth: 1,
    borderColor: colors.natural[200],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[12],
  },
  codeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[6],
    borderRadius: borderRadius[8],
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderStyle: "dashed",
    maxWidth: "70%",
  },
  codeText: {
    ...textStyles.bodyMedium,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[700],
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[20],
  },
  statusText: {
    fontSize: typography.fontSize.label.small,
    fontWeight: typography.fontWeight.semibold,
  },
  valueCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: backgrounds.card[2],
    borderRadius: borderRadius[12],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    marginBottom: spacing[12],
    borderWidth: 1,
    borderColor: colors.natural[150],
  },
  valueLeft: {
    flexDirection: "column",
    gap: 2,
  },
  valueLabelText: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
    fontWeight: typography.fontWeight.medium,
  },
  valueHighlight: {
    ...textStyles.titleLarge,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    backgroundColor: colors.natural[50],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[6],
    borderRadius: borderRadius[8],
    borderWidth: 1,
    borderColor: colors.natural[200],
  },
  typeBadgeText: {
    fontSize: typography.fontSize.label.medium,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[700],
  },
  detailsGrid: {
    flexDirection: "row",
    gap: spacing[10],
    marginBottom: spacing[12],
  },
  detailBox: {
    flex: 1,
    backgroundColor: backgrounds.card[2],
    padding: spacing[10],
    borderRadius: borderRadius[8],
    borderWidth: 1,
    borderColor: colors.natural[150],
  },
  detailIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    marginBottom: 4,
  },
  detailBoxLabel: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
    fontWeight: typography.fontWeight.regular,
  },
  detailBoxValue: {
    fontSize: typography.fontSize.body.small,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[800],
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingTop: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colors.natural[200],
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
    paddingVertical: spacing[8],
    borderRadius: borderRadius[8],
  },
  activateBtn: {
    backgroundColor: "#EAF4EF",
  },
  deactivateBtn: {
    backgroundColor: "#FDF4E7",
  },
  editBtn: {
    backgroundColor: colors.primary[50],
  },
  deleteBtn: {
    backgroundColor: "#FDEDEC",
  },
  actionBtnText: {
    fontSize: typography.fontSize.label.medium,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default DiscountListItem;

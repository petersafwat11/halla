import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
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
  onToggle,
  onDelete,
  canEdit,
  canDelete,
}) => {
  const { t } = useTranslation("admin");

  const status = getDiscountStatus(discount);
  const statusVisual = getStatusVisual(status);
  const statusLabel = t(`discounts.status.${status}`);

  const valueLabel =
    discount.discountType === "percentage"
      ? `${discount.value}%`
      : `${discount.value} ${t("discounts.labels.sar")}`;

  const usageLabel =
    discount.maxUses > 0
      ? `${discount.usedCount} / ${discount.maxUses}`
      : String(discount.usedCount);

  const expiryLabel = discount.validUntil
    ? new Date(discount.validUntil).toLocaleDateString()
    : t("discounts.labels.noExpiry");

  return (
    <View style={styles.card}>
      {/* Top row: code + status badge */}
      <View style={styles.topRow}>
        <View style={styles.codeContainer}>
          <Ionicons name="pricetag-outline" size={16} color={colors.primary[500]} />
          <Text style={styles.codeText}>{discount.code}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusVisual.bg }]}>
          <Text style={[styles.statusText, { color: statusVisual.fg }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Details row */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>{t("discounts.labels.type")}</Text>
          <Text style={styles.detailValue}>
            {t(`discounts.type.${discount.discountType}`)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>{t("discounts.labels.value")}</Text>
          <Text style={[styles.detailValue, styles.valueHighlight]}>
            {valueLabel}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>{t("discounts.labels.usage")}</Text>
          <Text style={styles.detailValue}>{usageLabel}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>{t("discounts.labels.expires")}</Text>
          <Text style={styles.detailValue}>{expiryLabel}</Text>
        </View>
      </View>

      {/* Actions */}
      {(canEdit || canDelete) && (
        <View style={styles.actionsRow}>
          {canEdit && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.toggleBtn]}
                onPress={() => onToggle(discount)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={discount.isActive ? "toggle" : "toggle-outline"}
                  size={14}
                  color={discount.isActive ? colors.success[600] : colors.natural[400]}
                />
                <Text style={[styles.actionBtnText, { color: discount.isActive ? colors.success[600] : colors.natural[400] }]}>
                  {discount.isActive
                    ? t("discounts.actions.deactivate")
                    : t("discounts.actions.activate")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.editBtn]}
                onPress={() => onEdit(discount)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={14} color={colors.primary[500]} />
                <Text style={[styles.actionBtnText, { color: colors.primary[500] }]}>
                  {t("discounts.actions.edit")}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {canDelete && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => onDelete(discount)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={14} color={colors.error[500]} />
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
    borderRadius: borderRadius[12],
    padding: spacing[16],
    marginBottom: spacing[12],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[12],
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
  },
  codeText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[900],
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[20],
  },
  statusText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.medium,
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[12],
    marginBottom: spacing[12],
  },
  detailItem: {
    minWidth: "40%",
    flex: 1,
  },
  detailLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.small,
    color: colors.natural[400],
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.large,
    color: colors.natural[700],
  },
  valueHighlight: {
    color: colors.primary[500],
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing[8],
    paddingTop: spacing[8],
    borderTopWidth: 1,
    borderTopColor: colors.natural[100],
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[6],
    borderRadius: borderRadius[6],
  },
  toggleBtn: {
    backgroundColor: "#F0FAF5",
  },
  editBtn: {
    backgroundColor: colors.primary[50],
  },
  deleteBtn: {
    backgroundColor: "#FEF2F2",
    marginLeft: "auto",
  },
  actionBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.medium,
  },
});

export default DiscountListItem;

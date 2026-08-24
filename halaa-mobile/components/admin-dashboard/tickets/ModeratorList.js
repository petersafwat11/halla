import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import AdaptiveText from "../../commen/AdaptiveText";
import LocalizedText from "../../commen/LocalizedText";
import {
  colors,
  spacing,
  textStyles,
  borderRadius,
  typography,
  backgrounds,
} from "../../../styles/tokens";

/**
 * Assign-ticket moderator radio list.
 *
 * Classification (blueprint §5): the display name is backend content
 * (adaptive, first-strong + isolate); the email is an intrinsically LTR
 * token; the empty-state message is app copy that follows the UI locale.
 */
const ModeratorListItem = ({ moderator, isSelected, onPress }) => {
  const { t } = useTranslation("admin");
  const modId = moderator.id || moderator._id;

  return (
    <TouchableOpacity
      style={[styles.moderatorItem, isSelected && styles.moderatorItemSelected]}
      onPress={() => onPress(modId)}
      activeOpacity={0.75}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
    >
      <View style={styles.moderatorItemLeft}>
        <View style={[styles.radio, isSelected && styles.radioSelected]}>
          {isSelected && <View style={styles.radioDot} />}
        </View>
        <View style={styles.moderatorInfo}>
          <AdaptiveText
            style={[styles.moderatorName, isSelected && styles.moderatorNameSelected]}
            numberOfLines={1}
          >
            {moderator.name || moderator.username || t("common.unknown")}
          </AdaptiveText>
          {moderator.email ? (
            <AdaptiveText style={[styles.moderatorEmail, styles.ltrToken]} isolate={false} numberOfLines={1}>
              {isolateLtr(moderator.email)}
            </AdaptiveText>
          ) : null}
        </View>
      </View>
      {/* Selected check is a semantic state icon — never mirrored. */}
      {isSelected && (
        <Ionicons name="checkmark-circle" size={20} color={colors.primary[500]} />
      )}
    </TouchableOpacity>
  );
};

const ModeratorList = ({ moderators, selectedModeratorId, onSelect }) => {
  const { t } = useTranslation("admin");

  if (moderators.length === 0) {
    return (
      <View style={styles.emptyModerators}>
        <Ionicons name="people-outline" size={28} color={colors.natural[300]} />
        <LocalizedText style={styles.emptyText}>{t("tickets.assign.noModeratorsAvailable")}</LocalizedText>
      </View>
    );
  }

  return (
    <View style={styles.moderatorList}>
      {moderators.map((moderator) => {
        const modId = moderator.id || moderator._id;
        return (
          <ModeratorListItem
            key={modId}
            moderator={moderator}
            isSelected={selectedModeratorId === modId}
            onPress={onSelect}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  moderatorList: {
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.natural[200],
    overflow: "hidden",
  },
  moderatorItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    backgroundColor: backgrounds.card[1],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  moderatorItemSelected: {
    backgroundColor: `${colors.primary[500]}08`,
  },
  moderatorItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    flex: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.natural[300],
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: colors.primary[500],
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[500],
  },
  moderatorInfo: {
    flex: 1,
  },
  moderatorName: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[800],
  },
  moderatorNameSelected: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semibold,
  },
  moderatorEmail: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
    marginTop: 2,
  },
  emptyModerators: {
    alignItems: "center",
    paddingVertical: spacing[24],
    gap: spacing[8],
  },
  emptyText: {
    ...textStyles.bodySmall,
    color: colors.natural[400],
  },
});

export default ModeratorList;

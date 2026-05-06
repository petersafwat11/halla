import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import {
  colors,
  spacing,
  textStyles,
  borderRadius,
  typography,
  backgrounds,
} from "../../../styles/tokens";

const ModeratorListItem = ({ moderator, isSelected, onPress }) => {
  const { t } = useTranslation("admin");
  const modId = moderator.id || moderator._id;

  return (
    <TouchableOpacity
      style={[styles.moderatorItem, isSelected && styles.moderatorItemSelected]}
      onPress={() => onPress(modId)}
      activeOpacity={0.75}
    >
      <View style={styles.moderatorItemLeft}>
        <View style={[styles.radio, isSelected && styles.radioSelected]}>
          {isSelected && <View style={styles.radioDot} />}
        </View>
        <View style={styles.moderatorInfo}>
          <Text
            style={[styles.moderatorName, isSelected && styles.moderatorNameSelected]}
            numberOfLines={1}
          >
            {moderator.name || moderator.username || t("common.unknown")}
          </Text>
          {moderator.email ? (
            <Text style={styles.moderatorEmail} numberOfLines={1}>
              {moderator.email}
            </Text>
          ) : null}
        </View>
      </View>
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
        <Text style={styles.emptyText}>{t("tickets.assign.noModeratorsAvailable")}</Text>
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

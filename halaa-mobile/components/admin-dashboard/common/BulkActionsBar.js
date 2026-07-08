import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
} from "../../../styles/tokens";

/**
 * BulkActionsBar - Sticky bar shown above the list when items are selected.
 *
 * Props:
 *   selectedIds      {string[]} - Currently selected item IDs
 *   totalCount       {number}   - Total items in the visible (filtered) list
 *   onSelectAll      {func}     - Selects all visible items
 *   onClearSelection {func}     - Deselects all items
 *   actions          {Array}    - Action buttons:
 *     { icon, label, onPress(ids), destructive?, color?, bg?, loading? }
 */
const BulkActionsBar = ({
  selectedIds = [],
  totalCount = 0,
  onSelectAll,
  onClearSelection,
  actions = [],
}) => {
  const selectedCount = selectedIds.length;
  if (selectedCount === 0) return null;

  const allSelected = selectedCount >= totalCount && totalCount > 0;

  return (
    <View style={styles.container}>
      {/* Left: select-all toggle + count */}
      <TouchableOpacity
        style={styles.selectSection}
        onPress={allSelected ? onClearSelection : onSelectAll}
        activeOpacity={0.7}
      >
        <View style={[styles.checkIcon, allSelected && styles.checkIconActive]}>
          <Ionicons
            name={allSelected ? "checkmark" : "remove"}
            size={12}
            color={allSelected ? "#fff" : colors.primary[500]}
          />
        </View>
        <Text style={styles.countText}>
          <Text style={styles.countNum}>{selectedCount}</Text>
          {" selected"}
        </Text>
      </TouchableOpacity>

      {/* Middle: scrollable action buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.actionsScroll}
        contentContainerStyle={styles.actionsContent}
        bounces={false}
      >
        {actions.map((action, idx) => {
          const btnColor = action.destructive
            ? colors.error[500]
            : action.color || colors.primary[500];
          const btnBg = action.destructive
            ? colors.error[50]
            : action.bg || colors.primary[50];
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.actionBtn, { backgroundColor: btnBg }]}
              onPress={() => action.onPress(selectedIds)}
              activeOpacity={0.8}
              disabled={!!action.loading}
            >
              {action.loading ? (
                <ActivityIndicator size="small" color={btnColor} />
              ) : (
                <View style={styles.actionBtnContent}>
                  <Ionicons name={action.icon} size={14} color={btnColor} />
                  <Text style={[styles.actionBtnText, { color: btnColor }]}>
                    {action.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Right: close / deselect-all */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={onClearSelection}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={18} color={colors.natural[500]} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[200],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    gap: spacing[8],
    marginBottom: spacing[12],
  },
  selectSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    flexShrink: 0,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: borderRadius[4],
    borderWidth: 2,
    borderColor: colors.primary[500],
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  checkIconActive: {
    backgroundColor: colors.primary[500],
  },
  countText: {
    fontSize: typography.fontSize.label.large,
    color: colors.natural[700],
    fontWeight: typography.fontWeight.regular,
  },
  countNum: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[700],
  },
  actionsScroll: { flex: 1 },
  actionsContent: {
    gap: spacing[6],
    paddingHorizontal: spacing[4],
    alignItems: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[6],
    borderRadius: borderRadius[8],
    minWidth: 72,
    justifyContent: "center",
    minHeight: 30,
  },
  actionBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  actionBtnText: {
    fontSize: typography.fontSize.label.large,
    fontWeight: typography.fontWeight.semibold,
  },
  closeBtn: {
    padding: spacing[4],
    flexShrink: 0,
  },
});

export default BulkActionsBar;

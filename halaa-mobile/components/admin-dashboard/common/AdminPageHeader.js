import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "./SearchBar";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";

/**
 * AdminPageHeader - Unified sticky header for admin list pages.
 * Renders: optional action row (export + add) + optional search bar + optional filter chips.
 * Place this ABOVE the scrolling list so it stays visible while scrolling.
 *
 * @param {Function}     onAdd              - Add button press handler; button hidden if undefined
 * @param {string}       addLabel           - Label text for add button
 * @param {string}       addIcon            - Ionicons icon name for add button (default: "add-outline")
 * @param {ReactElement} exportButton       - Export button element to render beside add button
 * @param {string}       searchValue        - Controlled search input value
 * @param {Function}     onSearchChange     - Called when search text changes
 * @param {string}       searchPlaceholder  - Placeholder text for search input
 * @param {Array}        filterOptions      - [{id, label, count}] for filter chips
 * @param {string}       activeFilter       - Currently active filter id
 * @param {Function}     onFilterChange     - Called with filter id when chip pressed
 */
const AdminPageHeader = ({
  onAdd,
  addLabel,
  addIcon = "add-outline",
  exportButton,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filterOptions,
  activeFilter,
  onFilterChange,
}) => {
  const hasAdd = typeof onAdd === "function";
  const hasExport = !!exportButton;
  const hasSearch = typeof onSearchChange === "function";
  const hasFilters = Array.isArray(filterOptions) && filterOptions.length > 0;
  const hasActionRow = hasAdd || hasExport;

  if (!hasActionRow && !hasSearch && !hasFilters) return null;

  return (
    <View style={styles.container}>
      {/* Action row: export button (left) + add button (right) */}
      {hasActionRow && (
        <View style={styles.actionRow}>
          <View style={styles.actionRowLeft}>
            {hasExport && exportButton}
          </View>
          <View style={styles.actionRowRight}>
            {hasAdd && (
              <TouchableOpacity style={styles.addBtn} onPress={onAdd} activeOpacity={0.8}>
                <Ionicons name={addIcon} size={18} color={colors.natural[50]} />
                <Text style={styles.addBtnText}>{addLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Search bar */}
      {hasSearch && (
        <View style={styles.searchRow}>
          <SearchBar
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
          />
        </View>
      )}

      {/* Filter chips */}
      {hasFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {filterOptions.map((opt) => {
            const active = activeFilter === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onFilterChange?.(opt.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
                {opt.count !== undefined && (
                  <View style={[styles.badge, active && styles.badgeActive]}>
                    <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                      {opt.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: backgrounds.artboard,
  },

  /* Action row: export (left) + add (right) */
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[16],
    paddingTop: spacing[8],
    paddingBottom: spacing[4],
  },
  actionRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  actionRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: borderRadius[8],
  },
  addBtnText: {
    ...textStyles.bodySmall,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[50],
  },

  /* Search row */
  searchRow: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[8],
    paddingBottom: spacing[4],
  },

  /* Filter chips */
  filterScroll: {
    flexGrow: 0,
  },
  filterContent: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    gap: spacing[8],
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[8],
    borderRadius: borderRadius[20],
    backgroundColor: backgrounds.card[1],
    borderWidth: 1,
    borderColor: colors.natural[200],
    minHeight: 38,
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  chipText: {
    fontSize: typography.fontSize.label.large,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[500],
  },
  chipTextActive: {
    color: colors.natural[50],
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.natural[200],
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[4],
  },
  badgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  badgeText: {
    fontSize: typography.fontSize.label.small,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[500],
  },
  badgeTextActive: {
    color: colors.natural[50],
  },
});

export default AdminPageHeader;

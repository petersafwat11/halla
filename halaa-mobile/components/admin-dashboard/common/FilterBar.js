import React from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import PropTypes from "prop-types";
import { formatCount } from "@halaa/shared/utils/locale";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { useTranslation } from "../../../localization";
import LocalizedText from "../../commen/LocalizedText";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../styles/tokens";

/**
 * FilterBar - Horizontal filter tabs
 *
 * Labels are localized app copy; the optional count badge is a
 * locale-formatted, LTR-isolated numeric token so it cannot BiDi-spill.
 *
 * @param {Object} props
 * @param {Array} props.filters - Array of filter objects with { id, label, count }
 * @param {string} props.activeFilter - Currently active filter id
 * @param {Function} props.onFilterChange - Filter change handler
 */
const FilterBar = ({ filters, activeFilter, onFilterChange }) => {
  const { currentLanguage } = useTranslation("admin");
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {filters.map((filter) => {
        const isActive = filter.id === activeFilter;

        return (
          <TouchableOpacity
            key={filter.id}
            style={[styles.filterChip, isActive && styles.activeFilterChip]}
            onPress={() => onFilterChange(filter.id)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <LocalizedText
              style={[styles.filterText, isActive && styles.activeFilterText]}
              numberOfLines={1}
            >
              {filter.label}
            </LocalizedText>
            {filter.count !== undefined && (
              <View
                style={[styles.countBadge, isActive && styles.activeCountBadge]}
              >
                {/* Locale digits (٠١٢ / 0-9) in one LTR-isolated token,
                    rendered through the shared localized role primitive. */}
                <LocalizedText
                  style={[styles.countText, isActive && styles.activeCountText]}
                >
                  {isolateLtr(formatCount(filter.count, currentLanguage))}
                </LocalizedText>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

FilterBar.propTypes = {
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      count: PropTypes.number,
    }),
  ).isRequired,
  activeFilter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[8],
    gap: spacing[8],
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: borderRadius[20],
    backgroundColor: colors.natural[100],
    gap: spacing[8],
  },
  activeFilterChip: {
    backgroundColor: colors.primary[500],
  },
  filterText: {
    fontSize: typography.fontSize.body.small,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[700],
  },
  activeFilterText: {
    color: colors.natural[50],
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: borderRadius[20],
    backgroundColor: colors.natural[200],
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[8],
  },
  activeCountBadge: {
    backgroundColor: colors.natural[50],
  },
  countText: {
    fontSize: typography.fontSize.label.small,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[700],
  },
  activeCountText: {
    color: colors.primary[500],
  },
});

export default FilterBar;

import React, { useState } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import PropTypes from "prop-types";
import { colors, spacing } from "../../../styles/tokens";
import SearchBar from "./SearchBar";
import FilterBar from "./FilterBar";
import EmptyState from "./EmptyState";

/**
 * DataList - Generic list with search, filter, pagination
 *
 * @param {Object} props
 * @param {Array} props.data - Array of data items
 * @param {Function} props.renderItem - Render function for each item
 * @param {Function} props.onRefresh - Pull-to-refresh handler
 * @param {Function} props.onLoadMore - Load more handler for pagination
 * @param {boolean} props.loading - Loading state
 * @param {string} props.emptyMessage - Message to show when no data
 * @param {boolean} props.searchable - Enable search bar
 * @param {boolean} props.filterable - Enable filter bar
 * @param {Array} props.filters - Array of filter objects
 * @param {string} props.emptyIcon - Icon for empty state
 * @param {string} props.emptyTitle - Title for empty state
 */
const DataList = ({
  data,
  renderItem,
  onRefresh,
  onLoadMore,
  loading = false,
  emptyMessage = "No data available",
  searchable = false,
  filterable = false,
  filters = [],
  emptyIcon = "file-tray-outline",
  emptyTitle = "No Data",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState(filters[0]?.id || "all");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {searchable && (
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search..."
          />
        </View>
      )}
      {filterable && filters.length > 0 && (
        <FilterBar
          filters={filters}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      )}
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      );
    }

    return (
      <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />
    );
  };

  const renderFooter = () => {
    if (!loading || data.length === 0) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </View>
    );
  };

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item, index) => item.id?.toString() || index.toString()}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        ) : undefined
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      contentContainerStyle={[
        styles.contentContainer,
        data.length === 0 && styles.emptyContentContainer,
      ]}
      showsVerticalScrollIndicator={false}
    />
  );
};

DataList.propTypes = {
  data: PropTypes.array.isRequired,
  renderItem: PropTypes.func.isRequired,
  onRefresh: PropTypes.func,
  onLoadMore: PropTypes.func,
  loading: PropTypes.bool,
  emptyMessage: PropTypes.string,
  searchable: PropTypes.bool,
  filterable: PropTypes.bool,
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      count: PropTypes.number,
    }),
  ),
  emptyIcon: PropTypes.string,
  emptyTitle: PropTypes.string,
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[24],
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
  header: {
    marginBottom: spacing[16],
  },
  searchContainer: {
    marginBottom: spacing[12],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing[48],
  },
  footerLoader: {
    paddingVertical: spacing[16],
    alignItems: "center",
  },
});

export default DataList;

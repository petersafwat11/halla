import React from "react";
import { View, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import { DataList, SearchBar, FilterBar, EmptyState } from "../common";
import TicketListItem from "./TicketListItem";
import { spacing } from "../../../styles/tokens";

/**
 * TicketList Component
 *
 * Displays a list of tickets with search, filter, and pagination capabilities.
 * Wraps the DataList component and integrates search and filter functionality.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Array} props.tickets - Array of ticket objects
 * @param {Function} props.onTicketPress - Handler for ticket press
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onRefresh - Handler for pull-to-refresh
 * @param {Function} props.onLoadMore - Handler for loading more items
 * @param {string} props.searchQuery - Current search query
 * @param {Function} props.onSearch - Handler for search input change
 * @param {string} props.filters - Current filter value
 * @param {Function} props.onFilterChange - Handler for filter change
 */
const TicketList = ({
  tickets,
  onTicketPress,
  loading,
  onRefresh,
  onLoadMore,
  searchQuery,
  onSearch,
  filters,
  onFilterChange,
}) => {
  /**
   * Filter options for ticket status
   */
  const filterOptions = [
    { label: "All", value: "all" },
    { label: "Open", value: "open" },
    { label: "In Progress", value: "in-progress" },
    { label: "Resolved", value: "resolved" },
    { label: "Closed", value: "closed" },
  ];

  /**
   * Render individual ticket item
   */
  const renderTicketItem = ({ item }) => (
    <TicketListItem ticket={item} onPress={() => onTicketPress(item)} />
  );

  /**
   * Render empty state when no tickets found
   */
  const renderEmptyState = () => (
    <EmptyState
      icon="ticket"
      title="No Tickets Found"
      message={
        searchQuery || filters !== "all"
          ? "Try adjusting your search or filters"
          : "No support tickets available"
      }
    />
  );

  /**
   * Render list header with search and filters
   */
  const renderListHeader = () => (
    <View style={styles.headerContainer}>
      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={onSearch}
        placeholder="Search tickets by ID, subject, or submitter..."
        style={styles.searchBar}
      />

      {/* Filter Bar */}
      <FilterBar
        options={filterOptions}
        selectedValue={filters}
        onValueChange={onFilterChange}
        style={styles.filterBar}
      />
    </View>
  );

  return (
    <DataList
      data={tickets}
      renderItem={renderTicketItem}
      keyExtractor={(item) => (item._id || item.id)?.toString()}
      loading={loading}
      onRefresh={onRefresh}
      onEndReached={onLoadMore}
      ListHeaderComponent={renderListHeader}
      ListEmptyComponent={!loading ? renderEmptyState : null}
      contentContainerStyle={styles.listContent}
    />
  );
};

TicketList.propTypes = {
  tickets: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      subject: PropTypes.string,
      submitterName: PropTypes.string,
      priority: PropTypes.string,
      status: PropTypes.string,
      category: PropTypes.string,
      createdAt: PropTypes.string,
    }),
  ),
  onTicketPress: PropTypes.func,
  loading: PropTypes.bool,
  onRefresh: PropTypes.func,
  onLoadMore: PropTypes.func,
  searchQuery: PropTypes.string,
  onSearch: PropTypes.func,
  filters: PropTypes.string,
  onFilterChange: PropTypes.func,
};

TicketList.defaultProps = {
  tickets: [],
  onTicketPress: () => {},
  loading: false,
  onRefresh: () => {},
  onLoadMore: () => {},
  searchQuery: "",
  onSearch: () => {},
  filters: "all",
  onFilterChange: () => {},
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  searchBar: {
    marginBottom: spacing[12],
  },
  filterBar: {
    marginBottom: spacing[8],
  },
  listContent: {
    flexGrow: 1,
  },
});

export default TicketList;

import React from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, textStyles, backgrounds } from "../../../styles/tokens";

/**
 * AdminFlatList - Unified FlatList for admin pages.
 * Handles loading spinner (first load), pull-to-refresh, and empty state.
 *
 * @param {Array}     data                  - Items to render
 * @param {Function}  renderItem            - Render function for each item
 * @param {Function}  keyExtractor          - Key extractor function
 * @param {boolean}   loading               - Loading state
 * @param {Function}  onRefresh             - Pull-to-refresh handler
 * @param {string}    emptyIcon             - Ionicons icon name for empty state
 * @param {string}    emptyTitle            - Title text for empty state
 * @param {string}    emptyMessage          - Message text for empty state
 * @param {Object}    contentContainerStyle - Extra style for list content
 * @param {any}       extraData             - Pass any extra state that renderItem depends on
 */
const AdminFlatList = ({
  data,
  renderItem,
  keyExtractor,
  loading = false,
  onRefresh,
  emptyIcon = "file-tray-outline",
  emptyTitle,
  emptyMessage,
  contentContainerStyle,
  extraData,
}) => {
  if (loading && (!data || data.length === 0)) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      extraData={extraData}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        ) : undefined
      }
      contentContainerStyle={[styles.listContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Ionicons name={emptyIcon} size={48} color={colors.natural[300]} />
          {!!emptyTitle && (
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          )}
          {!!emptyMessage && (
            <Text style={styles.emptyMsg}>{emptyMessage}</Text>
          )}
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[32],
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    paddingTop: 60,
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[32],
  },
  emptyTitle: {
    ...textStyles.titleMedium,
    color: colors.natural[700],
    textAlign: "center",
  },
  emptyMsg: {
    ...textStyles.bodySmall,
    color: colors.natural[400],
    textAlign: "center",
  },
});

export default AdminFlatList;

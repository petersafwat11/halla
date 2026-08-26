import React from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import VendorCard from "./VendorCard";
import LocalizedText from "../commen/LocalizedText";
import { useTranslation } from "../../localization";
import { colors, layout } from "../../styles/tokens";

const VendorCards = ({ vendors, onVendorPress, loading, error, onRetry, onReset, refreshing, onRefresh, onEndReached, isFetchingNextPage, bottomSpacing = layout.dashboardPageBottom }) => {
  const { t } = useTranslation("marketplace");
  const renderItem = ({ item, index }) => (
    <VendorCard
      vendor={item}
      onPress={onVendorPress}
      index={index}
    />
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      );
    }

    if (error) return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}><Ionicons name="cloud-offline-outline" size={30} color={colors.primary[500]} /></View>
        {/* Empty/error copy is app-authored → always the UI locale. Centering
            is a design choice; writing direction still follows the locale so
            punctuation stays at the sentence end. */}
        <LocalizedText center style={styles.emptyTitle}>{t("errors.loadFailed")}</LocalizedText>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} accessibilityRole="button">
          <LocalizedText style={styles.retryText}>{t("errors.retry")}</LocalizedText>
        </TouchableOpacity>
      </View>
    );
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}><Ionicons name="search-outline" size={30} color={colors.primary[500]} /></View>
        <LocalizedText center style={styles.emptyTitle}>{t("noResults.title")}</LocalizedText>
        <LocalizedText center style={styles.emptyText}>{t("noResults.description")}</LocalizedText>
        {onReset ? (
          <TouchableOpacity style={styles.retryButton} onPress={onReset} accessibilityRole="button">
            <LocalizedText style={styles.retryText}>{t("filters.reset")}</LocalizedText>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </View>
    );
  };

  return (
    <FlatList
      data={vendors}
      renderItem={renderItem}
      keyExtractor={(item, index) => item.id?.toString() || index.toString()}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomSpacing }]}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 10
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary[50],
    marginBottom: 16
  },
  emptyTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    color: colors.natural[900],
    marginBottom: 6
  },
  emptyText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: colors.natural[450]
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
  retryButton: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary[500], minHeight: 44, justifyContent: "center" },
  retryText: { fontFamily: "Cairo_600SemiBold", color: colors.natural[50], fontSize: 14 },
});

export default VendorCards;

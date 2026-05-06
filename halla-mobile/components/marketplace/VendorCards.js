import React from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  ActivityIndicator
} from "react-native";
import VendorCard from "./VendorCard";
import { useTranslation } from "../../localization";
import { colors } from "../../styles/tokens";

const VendorCards = ({ vendors, onVendorCallPress, loading, refreshing, onRefresh, onEndReached, isFetchingNextPage }) => {
  const { t } = useTranslation("marketplace");
  const renderItem = ({ item, index }) => (
    <VendorCard
      vendor={item}
      onCallPress={onVendorCallPress}
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

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {t("noResults")}
        </Text>
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
      contentContainerStyle={styles.listContent}
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
    padding: 24,
    paddingTop: 10
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60
  },
  emptyText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 16,
    color: colors.natural[450]
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
});

export default VendorCards;

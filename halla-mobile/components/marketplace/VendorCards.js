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
          <ActivityIndicator size="large" color="#C28E5C" />
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
        <ActivityIndicator size="small" color="#C28E5C" />
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
    color: "#656565"
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
});

export default VendorCards;

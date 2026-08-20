import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { useTranslation } from "../../localization/hooks/useTranslation";
import { formatDate } from "@halaa/shared/utils/locale";
import { getStatusVisual } from "../../constants/statusColors";

const VendorOrdersList = ({ orders, onOrderPress }) => {
  const { t, currentLanguage } = useTranslation("vendor");

  const renderOrderItem = ({ item }) => {
    const statusVisual = getStatusVisual(item.status);
    return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => onOrderPress && onOrderPress(item)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderTitle}>{item.serviceName}</Text>
          <Text style={styles.orderDate}>
            {item.createdAt ? formatDate(item.createdAt, currentLanguage) : ""}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusVisual.bg },
          ]}
        >
          <Text style={[styles.statusText, { color: statusVisual.fg }]}>
            {t(`orderStatus.${item.status}`)}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t("orders.customer")}:</Text>
          <Text style={styles.detailValue}>{item.customerName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t("orders.eventDate")}:</Text>
          <Text style={styles.detailValue}>
            {item.eventDate ? formatDate(item.eventDate, currentLanguage) : ""}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t("orders.price")}:</Text>
          <Text style={styles.priceValue}>
            {item.price} {t("currency")}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyTitle}>{t("orders.noOrders")}</Text>
      <Text style={styles.emptySubtitle}>
        {t("orders.noOrdersDescription")}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("orders.recentOrders")}</Text>
        {orders && orders.length > 0 && (
          <Text style={styles.orderCount}>
            {orders.length} {t("orders.orders")}
          </Text>
        )}
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item._id || item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  orderCount: {
    fontSize: 14,
    color: "#666666",
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: "#999999",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderDetails: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666666",
  },
  detailValue: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  priceValue: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});

export default VendorOrdersList;

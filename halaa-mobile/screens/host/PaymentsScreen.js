import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "../../localization";
import { formatDateTime } from "@halaa/shared/utils/locale";
import { formatSar } from "@halaa/shared/utils";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { countRatioToken, priceToken } from "@halaa/shared/utils/displayTokens";
import { useMyPayments } from "../../hooks";
import LocalizedText from "../../components/commen/LocalizedText";
import AdaptiveText from "../../components/commen/AdaptiveText";
import StatusBadge from "../../components/admin-dashboard/common/StatusBadge";
import TopBar from "../../components/plans/TopBar";

const STATUS_FILTERS = ["all", "completed", "pending", "failed"];

const PaymentsScreen = () => {
  const { t, currentLanguage } = useTranslation("payments");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error, refetch, isRefetching } = useMyPayments({
    page,
    limit,
    status: filter,
  });

  const payments = data?.data?.payments || [];
  const pagination = data?.data?.pagination || { page: 1, pages: 1, total: 0 };

  const setFilterAndReset = (next) => {
    setFilter(next);
    setPage(1);
  };

  // Amounts are atomic isolated tokens: [amount currency], and a refunded
  // part keeps its parentheses/minus glued inside one LTR isolate so nothing
  // BiDi-reorders inside Arabic copy (blueprint §6/§9).
  const formatAmount = (item) => {
    const base = priceToken(item.amount, item.currency);
    if (item.refundedAmount && item.refundedAmount > 0) {
      const refunded = isolateLtr(
        `(- ${formatSar(item.refundedAmount, {
          trimTrailingZeros: true,
        })} ${item.currency})`
      );
      return `${base} ${refunded}`;
    }
    return base;
  };

  const formatDate = (iso) => (iso ? formatDateTime(iso, currentLanguage) : "—");

  const renderRow = (item) => (
    <View key={item.id} style={styles.row}>
      <View style={styles.rowHeader}>
        {/* Backend service name — follows its own script (adaptive). */}
        <AdaptiveText style={styles.service} numberOfLines={1}>
          {item.service}
        </AdaptiveText>
        <StatusBadge
          status={item.status}
          domain="payment"
          label={t(`table.status.${item.status}`, item.status)}
          size="small"
        />
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.amount}>{formatAmount(item)}</Text>
        <LocalizedText style={styles.date}>{formatDate(item.createdAt)}</LocalizedText>
      </View>
      {item.transactionId ? (
        <Text style={[styles.transactionId, styles.ltrToken]} numberOfLines={1}>
          {isolateLtr(item.transactionId)}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("title")} showBack />

        <View style={styles.filterBar}>
          {STATUS_FILTERS.map((key) => {
            const active = key === filter;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setFilterAndReset(key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <LocalizedText
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {t(`table.filter.${key === "completed" ? "success" : key === "failed" ? "cancelled" : key}`)}
                </LocalizedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#C28E5C" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <LocalizedText style={styles.errorText} center>
              {error?.message || t("errors.loadFailed")}
            </LocalizedText>
          </View>
        ) : payments.length === 0 ? (
          <View style={styles.center}>
            <LocalizedText style={styles.emptyText} center>
              {t("empty")}
            </LocalizedText>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
          >
            {payments.map(renderRow)}
            {pagination.pages > 1 ? (
              <View style={styles.pager}>
                <TouchableOpacity
                  disabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  style={[styles.pagerBtn, page <= 1 && styles.pagerBtnDisabled]}
                >
                  <LocalizedText style={styles.pagerBtnText}>
                    {t("pager.prev")}
                  </LocalizedText>
                </TouchableOpacity>
                {/* "page / pages" is one locale-formatted, isolated ratio token. */}
                <Text style={styles.pagerLabel}>
                  {countRatioToken(pagination.page, pagination.pages, currentLanguage)}
                </Text>
                <TouchableOpacity
                  disabled={page >= pagination.pages}
                  onPress={() => setPage((p) => p + 1)}
                  style={[
                    styles.pagerBtn,
                    page >= pagination.pages && styles.pagerBtnDisabled,
                  ]}
                >
                  <LocalizedText style={styles.pagerBtnText}>
                    {t("pager.next")}
                  </LocalizedText>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#C28E5C" },
  container: { flex: 1, backgroundColor: "#F9F4EF" },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EA",
  },
  filterChipActive: { backgroundColor: "#C28E5C", borderColor: "#C28E5C" },
  filterChipText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#6B4E33",
  },
  filterChipTextActive: { color: "#FFF" },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 12 },
  row: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#F0E7DC",
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  service: {
    flex: 1,
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#3F2C1A",
  },
  rowMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amount: { fontFamily: "Cairo_600SemiBold", fontSize: 14, color: "#6B4E33" },
  date: { fontFamily: "Cairo_400Regular", fontSize: 11, color: "#999" },
  transactionId: {
    fontFamily: "Cairo_400Regular",
    fontSize: 11,
    color: "#999",
  },
  ltrToken: {
    writingDirection: "ltr",
    textAlign: "left",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 14,
    color: "#C0392B",
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  pager: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginTop: 8,
  },
  pagerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#C28E5C",
  },
  pagerBtnDisabled: { backgroundColor: "#E5E7EA" },
  pagerBtnText: { fontFamily: "Cairo_700Bold", fontSize: 12, color: "#FFF" },
  pagerLabel: { fontFamily: "Cairo_600SemiBold", fontSize: 13, color: "#6B4E33" },
});

export default PaymentsScreen;

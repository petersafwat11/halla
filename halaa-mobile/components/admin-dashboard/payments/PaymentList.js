import React from "react";
import { useTranslation } from "../../../localization";
import AdminFlatList from "../common/AdminFlatList";
import PaymentListItem from "./PaymentListItem";

const PaymentList = ({
  payments,
  loading,
  onRefresh,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  onPressPayment,
}) => {
  const { t } = useTranslation("admin");

  return (
    <AdminFlatList
      data={payments || []}
      keyExtractor={(item, index) => item._id || item.id || `payment-${index}`}
      renderItem={({ item }) => (
        <PaymentListItem payment={item} onPress={onPressPayment} />
      )}
      loading={loading}
      onRefresh={onRefresh}
      hasMore={hasMore}
      onLoadMore={onLoadMore}
      loadingMore={loadingMore}
      emptyIcon="card-outline"
      emptyTitle={t("payments.empty.title")}
      emptyMessage={t("payments.empty.message")}
    />
  );
};

export default PaymentList;

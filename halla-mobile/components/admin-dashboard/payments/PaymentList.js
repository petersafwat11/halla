import React from "react";
import { useTranslation } from "../../../localization";
import AdminFlatList from "../common/AdminFlatList";
import PaymentListItem from "./PaymentListItem";

const PaymentList = ({ payments, loading, onRefresh }) => {
  const { t } = useTranslation("admin");

  return (
    <AdminFlatList
      data={payments || []}
      keyExtractor={(item) => item._id || item.id || String(Math.random())}
      renderItem={({ item }) => <PaymentListItem payment={item} />}
      loading={loading}
      onRefresh={onRefresh}
      emptyIcon="card-outline"
      emptyTitle={t("payments.empty.title")}
      emptyMessage={t("payments.empty.message")}
    />
  );
};

export default PaymentList;

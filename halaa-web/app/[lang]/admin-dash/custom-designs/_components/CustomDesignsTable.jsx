"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import Table from "@/ui/commen/new-table/Table";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useAdminFulfillment } from "@/hooks/addons";
import {
  DESIGN_TEMPLATE_TIERS,
  DESIGN_FULFILLMENT_STATUS,
  getNextFulfillmentStatus,
} from "@halaa/shared/constants/addons";
import { formatDateTime, formatCurrency } from "@halaa/shared/utils/locale";
import { normalizeFulfillmentFilters } from "@/utils/filterNormalizer";
import styles from "./CustomDesignsTable.module.css";

const STATUS_CLASS = {
  [DESIGN_FULFILLMENT_STATUS.PAID]: styles.statusPaid,
  [DESIGN_FULFILLMENT_STATUS.QUEUED]: styles.statusQueued,
  [DESIGN_FULFILLMENT_STATUS.IN_PROGRESS]: styles.statusInProgress,
  [DESIGN_FULFILLMENT_STATUS.FULFILLED]: styles.statusFulfilled,
};

export default function CustomDesignsTable({ onSelectOrderForTransition }) {
  const { t, i18n } = useTranslation("admin");
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => normalizeFulfillmentFilters(searchParams, { limit: 20 }),
    [searchParams]
  );

  const { data, isLoading, error } = useAdminFulfillment(filters);

  const handlePageChange = useCallback(
    (page) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(page));
      router.push(`?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleSearchChange = useCallback(
    (query) => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("search", query);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.push(`?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleFilterChange = useCallback(
    (status) => {
      const params = new URLSearchParams(searchParams.toString());
      if (status && status !== "all") {
        params.set("status", status);
      } else {
        params.delete("status");
      }
      params.set("page", "1");
      router.push(`?${params.toString()}`);
    },
    [searchParams, router]
  );

  if (isLoading) return <SimpleLoading />;
  if (error) {
    return (
      <div className={styles.errorState}>
        {t("customDesigns.loadError", "تعذر تحميل طلبات التصاميم المخصصة")}
      </div>
    );
  }

  const items = data?.data || data?.items || [];
  const pagination = data?.pagination || { total: 0, pages: 1 };
  const locale = i18n.language || "ar";
  const isAr = locale.startsWith("ar");

  const tierMap = new Map();
  DESIGN_TEMPLATE_TIERS.forEach((tier) => {
    tierMap.set(tier.type, isAr ? tier.nameAr : tier.nameEn);
  });

  const statusLabelMap = {
    [DESIGN_FULFILLMENT_STATUS.PAID]: t("customDesigns.status.paid", "مدفوع"),
    [DESIGN_FULFILLMENT_STATUS.QUEUED]: t("customDesigns.status.queued", "في الانتظار"),
    [DESIGN_FULFILLMENT_STATUS.IN_PROGRESS]: t("customDesigns.status.in_progress", "قيد التنفيذ"),
    [DESIGN_FULFILLMENT_STATUS.FULFILLED]: t("customDesigns.status.fulfilled", "مكتمل"),
    cancelled: t("customDesigns.status.cancelled", "ملغي"),
    refund_required: t("customDesigns.status.refund_required", "مطلوب استرداد"),
    refunded: t("customDesigns.status.refunded", "مسترد"),
  };

  const nextActionLabels = {
    [DESIGN_FULFILLMENT_STATUS.QUEUED]: t("customDesigns.actions.moveToQueue", "نقل للانتظار"),
    [DESIGN_FULFILLMENT_STATUS.IN_PROGRESS]: t("customDesigns.actions.startWork", "بدء التنفيذ"),
    [DESIGN_FULFILLMENT_STATUS.FULFILLED]: t("customDesigns.actions.markFulfilled", "إكمال وتوصيل"),
  };

  const tableData = items.map((item) => ({
    id: item.id || item._id,
    orderRef: (item.id || item._id || "").slice(-8).toUpperCase(),
    host: item.userId?.name || item.user?.name || "-",
    hostPhone: item.userId?.phoneNumber || item.userId?.mobile || item.user?.phoneNumber || item.user?.mobile || "",
    tier: tierMap.get(item.templateType) || item.templateType || t("customDesigns.unknownTier", "تصميم مخصص"),
    price: item.price,
    currency: item.currency || "SAR",
    requestedAt: item.fulfillment?.requestedAt || item.createdAt,
    expectedDeliveryAt: item.fulfillment?.expectedDeliveryAt,
    status: item.status,
    nextStatus: getNextFulfillmentStatus(item.status),
    _raw: item,
  }));

  const renderCell = (key, value, row) => {
    if (key === "orderRef") {
      return <span className={styles.refCell}>{value}</span>;
    }

    if (key === "host") {
      return (
        <div className={styles.userCell}>
          <span className={styles.userName}>{value}</span>
          {row.hostPhone && <span className={styles.userContact}>{row.hostPhone}</span>}
        </div>
      );
    }

    if (key === "price") {
      return formatCurrency(value, locale, row.currency);
    }

    if (key === "requestedAt") {
      return value ? formatDateTime(value, locale) : "-";
    }

    if (key === "expectedDeliveryAt") {
      return value ? formatDateTime(value, locale) : "-";
    }

    if (key === "status") {
      return (
        <span className={`${styles.statusPill} ${STATUS_CLASS[value] || ""}`}>
          {statusLabelMap[value] || value}
        </span>
      );
    }

    if (key === "nextAction") {
      const next = row.nextStatus;
      if (!next) {
        return <span className={styles.completedText}>-</span>;
      }
      return (
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => onSelectOrderForTransition(row._raw)}
        >
          {nextActionLabels[next] || next}
        </button>
      );
    }

    return value ?? "-";
  };

  return (
    <div className={styles.container}>
      <Table
        mode="server"
        title={t("customDesigns.tableTitle", "قائمة طلبات التصاميم المخصصة")}
        headers={[
          t("customDesigns.columns.ref", "رقم المرجع"),
          t("customDesigns.columns.host", "المضيف"),
          t("customDesigns.columns.tier", "الباقة / النوع"),
          t("customDesigns.columns.price", "السعر"),
          t("customDesigns.columns.requestedAt", "تاريخ الطلب"),
          t("customDesigns.columns.expectedDelivery", "التسليم المتوقع"),
          t("customDesigns.columns.status", "الحالة"),
          t("customDesigns.columns.action", "الإجراء التالي"),
        ]}
        headerKeys={[
          "orderRef",
          "host",
          "tier",
          "price",
          "requestedAt",
          "expectedDeliveryAt",
          "status",
          "nextAction",
        ]}
        data={tableData}
        searchValue={filters.search}
        onSearchChange={handleSearchChange}
        activeFilter={filters.status || "all"}
        onFilterChange={handleFilterChange}
        renderCell={renderCell}
        showCheckboxes={false}
        filterOptions={[
          { label: t("customDesigns.filter.all", "الكل"), value: "all" },
          { label: t("customDesigns.filter.paid", "مدفوع"), value: DESIGN_FULFILLMENT_STATUS.PAID },
          { label: t("customDesigns.filter.queued", "في الانتظار"), value: DESIGN_FULFILLMENT_STATUS.QUEUED },
          { label: t("customDesigns.filter.in_progress", "قيد التنفيذ"), value: DESIGN_FULFILLMENT_STATUS.IN_PROGRESS },
          { label: t("customDesigns.filter.fulfilled", "مكتمل"), value: DESIGN_FULFILLMENT_STATUS.FULFILLED },
        ]}
        pagination={{
          currentPage: parseInt(filters.page, 10) || 1,
          totalPages: pagination.pages || 1,
          totalItems: pagination.total || 0,
          onPageChange: handlePageChange,
        }}
      />
    </div>
  );
}

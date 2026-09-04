"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { FaToggleOn, FaToggleOff, FaCopy } from "react-icons/fa";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { normalizeDiscountsFilters } from "@/utils/filterNormalizer";
import Table from "@/ui/commen/new-table/Table";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import {
  useDiscounts,
  useToggleDiscount,
  useDeleteDiscount,
} from "@/hooks/discounts";
import { formatDate } from "@halaa/shared/utils/locale";
import styles from "./DiscountsTable.module.css";

function getDiscountStatus(discount) {
  if (discount.validUntil && new Date(discount.validUntil) < new Date())
    return "expired";
  if (discount.maxUses > 0 && discount.usedCount >= discount.maxUses)
    return "exhausted";
  return discount.isActive ? "active" : "inactive";
}

const STATUS_CLASS = {
  active: styles.statusActive,
  inactive: styles.statusInactive,
  expired: styles.statusExpired,
  exhausted: styles.statusExhausted,
};

export default function DiscountsTable({ onEdit }) {
  const { t, i18n } = useTranslation("adminDiscounts");
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(() => normalizeDiscountsFilters(searchParams, { limit: 20 }), [searchParams]);

  const { data, isLoading, error } = useDiscounts(filters);

  const toggleDiscount = useToggleDiscount();
  const deleteDiscount = useDeleteDiscount();

  const handleToggle = async (discount) => {
    try {
      await toggleDiscount.mutateAsync(discount.id);
      toastUtils.success(
        discount.isActive
          ? t("discounts.deactivated", "تم تعطيل الكود")
          : t("discounts.activated", "تم تفعيل الكود")
      );
    } catch {
      toastUtils.error(t("discounts.toggleError", "فشل تغيير الحالة"));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t("discounts.confirmDelete", "هل تريد حذف هذا الكود؟"))) return;
    try {
      await deleteDiscount.mutateAsync(id);
      toastUtils.success(t("discounts.deleteSuccess", "تم حذف الكود"));
    } catch {
      toastUtils.error(t("discounts.deleteError", "فشل الحذف"));
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).then(() =>
      toastUtils.success(t("discounts.copied", "تم نسخ الكود"))
    );
  };

  const handlePageChange = useCallback((page) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`?${params.toString()}`);
  }, [searchParams, router]);

  const handleSearchChange = useCallback((query) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set("search", query);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }, [searchParams, router]);

  const handleFilterChange = useCallback((status) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }, [searchParams, router]);

  if (isLoading) return <SimpleLoading />;
  if (error)
    return (
      <div className={styles.errorState}>
        {t("discounts.loadError", "تعذر تحميل أكواد الخصم")}
      </div>
    );
  if (!data) return null;

  const discounts = data?.data || [];
  const pagination = data?.pagination || { total: 0, pages: 1 };

  const tableData = discounts.map((discount) => ({
    id: discount.id,
    code: discount.code,
    discountType: discount.discountType,
    value: discount.value,
    usage:
      discount.maxUses > 0
        ? `${discount.usedCount} / ${discount.maxUses}`
        : String(discount.usedCount),
    status: getDiscountStatus(discount),
    expires: discount.validUntil,
    // kept for actions lookup
    _isActive: discount.isActive,
  }));

  const dateLocale = i18n.language || "ar";

  const renderCell = (key, value, row) => {
    if (key === "code") {
      return (
        <div className={styles.codeCell}>
          <span className={styles.codeText}>{value}</span>
          <button
            className={styles.copyBtn}
            onClick={() => handleCopy(value)}
            title={t("discounts.copy", "نسخ")}
          >
            <FaCopy />
          </button>
        </div>
      );
    }

    if (key === "discountType") {
      return value === "percentage"
        ? t("discounts.type.percentage", "نسبة مئوية")
        : t("discounts.type.fixed", "مبلغ ثابت");
    }

    if (key === "value") {
      const discount = discounts.find((d) => d.id === row.id);
      return discount?.discountType === "percentage"
        ? `${value}%`
        : `${value} ${t("discounts.sar", "ر.س")}`;
    }

    if (key === "status") {
      const labelMap = {
        active: t("discounts.status.active", "نشط"),
        inactive: t("discounts.status.inactive", "معطل"),
        expired: t("discounts.status.expired", "منتهي"),
        exhausted: t("discounts.status.exhausted", "مستنفد"),
      };
      return (
        <span className={`${styles.statusPill} ${STATUS_CLASS[value] || styles.statusInactive}`}>
          {labelMap[value] || labelMap.inactive}
        </span>
      );
    }

    if (key === "expires") {
      if (!value) return t("discounts.noExpiry", "بلا تاريخ");
      return formatDate(value, dateLocale);
    }

    if (key === "_isActive") return null;

    return value ?? "-";
  };

  const getRowActions = (row) => {
    const discount = discounts.find((d) => d.id === row.id);
    if (!discount) return [];
    return [
      {
        type: "dropdown",
        icon: discount.isActive ? (
          <FaToggleOn color="#2a8c5b" />
        ) : (
          <FaToggleOff color="#aaa" />
        ),
        text: discount.isActive
          ? t("discounts.deactivate", "تعطيل")
          : t("discounts.activate", "تفعيل"),
        onClick: () => handleToggle(discount),
      },
      {
        type: "dropdown",
        icon: <FiEdit2 size={16} />,
        text: t("discounts.edit", "تعديل"),
        onClick: () => onEdit(discount),
      },
      {
        type: "dropdown",
        icon: <FiTrash2 size={16} />,
        text: t("discounts.delete", "حذف"),
        onClick: (r) => handleDelete(r.id),
      },
    ];
  };

  return (
    <div className={styles.container}>
      <Table
        mode="server"
        title={t("discounts.tableTitle", "أكواد الخصم")}
        headers={[
          t("discounts.columns.code", "الكود"),
          t("discounts.columns.type", "النوع"),
          t("discounts.columns.value", "القيمة"),
          t("discounts.columns.usage", "الاستخدام"),
          t("discounts.columns.status", "الحالة"),
          t("discounts.columns.expires", "تاريخ الانتهاء"),
        ]}
        headerKeys={["code", "discountType", "value", "usage", "status", "expires"]}
        data={tableData}
        searchValue={filters.search}
        onSearchChange={handleSearchChange}
        activeFilter={filters.status}
        onFilterChange={handleFilterChange}
        renderCell={renderCell}
        getRowActions={getRowActions}
        showCheckboxes={false}
        filterOptions={[
          { label: t("discounts.filter.all", "الكل"), value: "" },
          { label: t("discounts.filter.active", "نشطة"), value: "active" },
          { label: t("discounts.filter.inactive", "معطلة"), value: "inactive" },
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

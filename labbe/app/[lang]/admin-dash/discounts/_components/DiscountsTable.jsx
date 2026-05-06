"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { FaToggleOn, FaToggleOff, FaCopy } from "react-icons/fa";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { discountsAPI } from "@/services/adminDashboard";
import styles from "./DiscountsTable.module.css";

function buildFilters(searchParams) {
  const status = searchParams.get("status");
  return {
    page: searchParams.get("page") || 1,
    limit: 20,
    search: searchParams.get("search") || undefined,
    isActive:
      status === "active" ? true : status === "inactive" ? false : undefined,
  };
}

function getDiscountStatus(discount) {
  if (discount.validUntil && new Date(discount.validUntil) < new Date())
    return "expired";
  if (discount.maxUses > 0 && discount.usedCount >= discount.maxUses)
    return "exhausted";
  return discount.isActive ? "active" : "inactive";
}

export default function DiscountsTable({ onEdit }) {
  const { t } = useTranslation("adminDashboard");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const filters = buildFilters(searchParams);

  const { data, isLoading, error } = useQuery({
    queryKey: ["discounts", "admin", filters],
    queryFn: () => discountsAPI.getAll(filters),
    staleTime: 5 * 60 * 1000,
  });

  const toggleDiscount = useMutation({
    mutationFn: (id) => discountsAPI.toggleStatus(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });

  const deleteDiscount = useMutation({
    mutationFn: (id) => discountsAPI.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["discounts"] }),
  });

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

  if (isLoading) return <SimpleLoading />;
  if (error) return null;
  if (!data) return null;

  const discounts = data.discounts;
  const pagination = data.pagination;

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
      const statusMap = {
        active: { bg: "#EAF4EF", color: "#2A8C5B", label: t("discounts.status.active", "نشط") },
        inactive: { bg: "#F5F5F5", color: "#666", label: t("discounts.status.inactive", "معطل") },
        expired: { bg: "#F9EBEA", color: "#C0392B", label: t("discounts.status.expired", "منتهي") },
        exhausted: { bg: "#FBF3E6", color: "#D38200", label: t("discounts.status.exhausted", "مستنفد") },
      };
      const cfg = statusMap[value] || statusMap.inactive;
      return (
        <span
          style={{
            display: "inline-flex",
            padding: "0.3rem 1.2rem",
            borderRadius: "9999px",
            background: cfg.bg,
            color: cfg.color,
            fontSize: "1.2rem",
            fontFamily: "Cairo",
          }}
        >
          {cfg.label}
        </span>
      );
    }

    if (key === "expires") {
      if (!value) return t("discounts.noExpiry", "بلا تاريخ");
      return new Date(value).toLocaleDateString("ar-SA");
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

  const filterOptions = [
    {
      text: t("discounts.filter.all", "الكل"),
      onClick: () => {
        const params = new URLSearchParams(searchParams);
        params.delete("status");
        params.delete("page");
        router.push(`?${params.toString()}`);
      },
    },
    {
      text: t("discounts.filter.active", "نشطة"),
      onClick: () => {
        const params = new URLSearchParams(searchParams);
        params.set("status", "active");
        params.delete("page");
        router.push(`?${params.toString()}`);
      },
    },
    {
      text: t("discounts.filter.inactive", "معطلة"),
      onClick: () => {
        const params = new URLSearchParams(searchParams);
        params.set("status", "inactive");
        params.delete("page");
        router.push(`?${params.toString()}`);
      },
    },
  ];

  const handlePageChange = useCallback((page) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page);
    router.push(`?${params.toString()}`);
  }, [searchParams, router]);

  return (
    <div className={styles.container}>
      <Table
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
        renderCell={renderCell}
        getRowActions={getRowActions}
        showCheckboxes={false}
        filterOptions={filterOptions}
        pagination={{
          currentPage: parseInt(filters.page),
          totalPages: pagination.pages || 1,
          totalItems: pagination.total || 0,
          onPageChange: handlePageChange,
        }}
      />
    </div>
  );
}

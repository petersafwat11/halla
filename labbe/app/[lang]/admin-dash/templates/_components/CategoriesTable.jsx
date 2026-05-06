"use client";

import { useTemplateCategories } from "@/hooks/queries/useTemplates";
import {
  useDeleteCategory,
  useUpdateCategory,
} from "@/hooks/mutations/useTemplateMutations";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import { FiEdit2, FiTrash2, FiCheckCircle, FiXCircle } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import CategoryFormPopup from "./CategoryFormPopup";
import styles from "./CategoriesTable.module.css";

export default function CategoriesTable({ showCreatePopup, setShowCreatePopup }) {
  const { t } = useTranslation("admin");
  const { canCreate, canUpdate, canDelete } = usePageAccess("template_categories");
  const [internalShowCreate, setInternalShowCreate] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const showCreate = showCreatePopup !== undefined ? showCreatePopup : internalShowCreate;
  const setShowCreate = setShowCreatePopup || setInternalShowCreate;

  const { data, isLoading } = useTemplateCategories({ admin: true });
  const deleteCategory = useDeleteCategory();
  const updateCategory = useUpdateCategory();

  const handleDelete = async (id) => {
    if (!confirm(t("templates.categories.confirmDelete", "هل أنت متأكد من حذف هذه الفئة؟"))) return;
    try {
      await deleteCategory.mutateAsync(id);
      toastUtils.success(t("templates.categories.delete.success", "تم حذف الفئة بنجاح"));
    } catch (error) {
      handleError(error, t);
    }
  };

  const handleToggleActive = async (id, active) => {
    try {
      await updateCategory.mutateAsync({ id, body: { active } });
      toastUtils.success(t("templates.categories.update.success", "تم تحديث الحالة بنجاح"));
    } catch (error) {
      handleError(error, t);
    }
  };

  const getRowActions = (row) => {
    const actions = [];

    if (canUpdate) {
      actions.push({
        type: "dropdown",
        icon: <FiEdit2 size={16} />,
        text: t("templates.categories.edit.title", "تعديل"),
        onClick: () => setEditingCategory(row),
      });
      actions.push({
        type: "dropdown",
        icon: row.active ? <FiXCircle size={16} /> : <FiCheckCircle size={16} />,
        text: row.active
          ? t("templates.categories.deactivate", "إيقاف")
          : t("templates.categories.activate", "تفعيل"),
        onClick: () => handleToggleActive(row.id, !row.active),
      });
    }

    if (canDelete) {
      actions.push({
        type: "dropdown",
        icon: <FiTrash2 size={16} />,
        text: t("templates.categories.delete.title", "حذف"),
        onClick: () => handleDelete(row.id),
      });
    }

    return actions;
  };

  const bulkActions = [];
  if (canDelete) {
    bulkActions.push({
      icon: <FiTrash2 size={16} />,
      text: t("templates.categories.bulkDelete", "حذف المحدد"),
      onClick: async (ids) => {
        if (!ids?.length) {
          toastUtils.warning(t("templates.categories.selectRows", "الرجاء تحديد فئات للحذف"));
          return;
        }
        if (!confirm(t("templates.categories.confirmBulkDelete", "هل أنت متأكد من حذف الفئات المحددة؟"))) return;
        try {
          for (const id of ids) {
            await deleteCategory.mutateAsync(id);
          }
          toastUtils.success(t("templates.categories.delete.success", "تم حذف الفئات بنجاح"));
        } catch (error) {
          handleError(error, t);
        }
      },
    });
  }

  const renderCell = (key, value, row) => {
    if (key === "active") {
      const config = value
        ? { bg: "#EAF4EF", color: "#2A8C5B", text: t("templates.categories.status.active", "نشط") }
        : { bg: "#F9EBEA", color: "#C0392B", text: t("templates.categories.status.inactive", "غير نشط") };
      return (
        <div
          className={`${styles.statusBadge} ${canUpdate ? styles.statusBadgeClickable : styles.statusBadgeReadonly}`}
          style={{ background: config.bg }}
          onClick={() => {
            if (!canUpdate) return;
            handleToggleActive(row.id, !value);
          }}
        >
          <span className={styles.statusBadgeText} style={{ color: config.color }}>
            {config.text}
          </span>
        </div>
      );
    }

    return value;
  };

  const tableData = (data?.data?.categories || data?.categories || []).map((cat) => ({
    id: cat._id,
    code: cat.code || "-",
    nameEn: cat.nameEn || "-",
    nameAr: cat.nameAr || "-",
    sortOrder: cat.sortOrder ?? 0,
    active: cat.active !== false,
  }));

  if (isLoading) return <SimpleLoading />;

  return (
    <>
      <div className={styles.container}>
        <Table
          title={t("templates.categories.title", "إدارة الفئات")}
          headers={[
            t("templates.categories.columns.code", "الكود"),
            t("templates.categories.columns.nameEn", "الاسم بالإنجليزية"),
            t("templates.categories.columns.nameAr", "الاسم بالعربية"),
            t("templates.categories.columns.sortOrder", "الترتيب"),
            t("templates.categories.columns.status", "الحالة"),
          ]}
          data={tableData}
          renderCell={renderCell}
          getRowActions={getRowActions}
          showCheckboxes={canDelete}
          bulkActions={bulkActions}
          showExport={false}
          filterOptions={[
            { label: t("templates.categories.filter.all", "الكل"), value: "" },
            { label: t("templates.categories.filter.active", "نشط"), value: "active" },
            { label: t("templates.categories.filter.inactive", "غير نشط"), value: "inactive" },
          ]}
        />
      </div>

      {showCreate && (
        <CategoryFormPopup onClose={() => setShowCreate(false)} />
      )}

      {editingCategory && (
        <CategoryFormPopup
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}
    </>
  );
}

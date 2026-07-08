"use client";

import {
  useTemplateCategories,
  useDeleteCategory,
  useUpdateCategory,
} from "@/hooks/templates";
import { usePageAccess } from "@/hooks/usePageAccess";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import { FiEdit2, FiTrash2, FiCheckCircle, FiXCircle } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import DeleteConfirmation from "@/ui/vendor/modals/DeleteConfirmation";
import CategoryFormPopup from "./CategoryFormPopup";
import { getStatusVisual } from "@/utils/statusColors";
import styles from "./CategoriesTable.module.css";

export default function CategoriesTable({ showCreatePopup, setShowCreatePopup }) {
  const { t } = useTranslation("admin");
  const { canCreate, canUpdate, canDelete } = usePageAccess("template_categories");
  const [internalShowCreate, setInternalShowCreate] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState(null);

  const showCreate = showCreatePopup !== undefined ? showCreatePopup : internalShowCreate;
  const setShowCreate = setShowCreatePopup || setInternalShowCreate;

  const { data, isLoading, error } = useTemplateCategories({ admin: true });
  const deleteCategory = useDeleteCategory();
  const updateCategory = useUpdateCategory();

  const performDelete = async (id) => {
    try {
      await deleteCategory.mutateAsync(id);
      toastUtils.success(
        t("templates.categories.disable.success", "تم تعطيل الفئة بنجاح")
      );
    } catch (err) {
      handleError(err, t);
    }
  };

  const performBulkDelete = async (ids) => {
    try {
      for (const id of ids) await deleteCategory.mutateAsync(id);
      toastUtils.success(
        t("templates.categories.disable.success", "تم تعطيل الفئات بنجاح")
      );
    } catch (err) {
      handleError(err, t);
    }
  };

  const handleToggleActive = async (id, active) => {
    try {
      await updateCategory.mutateAsync({ id, body: { active } });
      toastUtils.success(
        t("templates.categories.update.success", "تم تحديث الحالة بنجاح")
      );
    } catch (err) {
      handleError(err, t);
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
        text: t("templates.categories.disable.title", "تعطيل"),
        onClick: () => setDeleteTarget(row),
      });
    }

    return actions;
  };

  const bulkActions = [];
  if (canDelete) {
    bulkActions.push({
      icon: <FiTrash2 size={16} />,
      text: t("templates.categories.bulkDisable", "تعطيل المحدد"),
      onClick: (ids) => {
        if (!ids?.length) {
          toastUtils.warning(
            t("templates.categories.selectRows", "الرجاء تحديد فئات للتعطيل")
          );
          return;
        }
        setBulkDeleteIds(ids);
      },
    });
  }

  const renderCell = (key, value, row) => {
    if (key === "active") {
      const text = value
        ? t("templates.categories.status.active", "نشط")
        : t("templates.categories.status.inactive", "غير نشط");
      const { fg, bg } = getStatusVisual(value ? "active" : "inactive");
      return (
        <div
          className={`${styles.statusBadge} ${canUpdate ? styles.statusBadgeClickable : styles.statusBadgeReadonly}`}
          style={{ background: bg }}
          onClick={() => {
            if (!canUpdate) return;
            handleToggleActive(row.id, !value);
          }}
        >
          <span className={styles.statusBadgeText} style={{ color: fg }}>
            {text}
          </span>
        </div>
      );
    }

    return value;
  };

  const tableData = (data?.data?.categories || []).map((cat) => ({
    id: cat._id,
    code: cat.code || "-",
    nameEn: cat.nameEn || "-",
    nameAr: cat.nameAr || "-",
    sortOrder: cat.sortOrder ?? 0,
    active: cat.active !== false,
  }));

  if (isLoading) return <SimpleLoading />;
  if (error) {
    return (
      <p style={{ color: "#C0392B", fontSize: "1.4rem", padding: "1.6rem" }}>
        {t("templates.categories.fetchError", "تعذر تحميل الفئات")}
      </p>
    );
  }

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

      <DeleteConfirmation
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          const id = deleteTarget?.id;
          setDeleteTarget(null);
          if (id) await performDelete(id);
        }}
        title={t("templates.categories.disable.title", "تعطيل الفئة")}
        message={t(
          "templates.categories.confirmDisable",
          "هل أنت متأكد من تعطيل هذه الفئة؟ لن تظهر للمضيفين بعد ذلك."
        )}
        itemName={deleteTarget?.nameAr || deleteTarget?.nameEn}
        confirmText={t("templates.categories.disable.confirm", "تعطيل")}
        cancelText={t("common.cancel", "إلغاء")}
        isLoading={deleteCategory.isPending}
      />

      <DeleteConfirmation
        isOpen={!!bulkDeleteIds}
        onClose={() => setBulkDeleteIds(null)}
        onConfirm={async () => {
          const ids = bulkDeleteIds;
          setBulkDeleteIds(null);
          if (ids?.length) await performBulkDelete(ids);
        }}
        title={t("templates.categories.bulkDisable", "تعطيل المحدد")}
        message={t(
          "templates.categories.confirmBulkDisable",
          "هل أنت متأكد من تعطيل الفئات المحددة؟"
        )}
        confirmText={t("templates.categories.disable.confirm", "تعطيل")}
        cancelText={t("common.cancel", "إلغاء")}
        isLoading={deleteCategory.isPending}
      />
    </>
  );
}

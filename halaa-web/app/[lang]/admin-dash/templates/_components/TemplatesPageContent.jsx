"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Button from "@/ui/commen/button/Button";
import {
  useAdminTemplates,
  useTemplateCategories,
  useDeleteTemplate,
  useDuplicateTemplate,
} from "@/hooks/templates";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import DeleteConfirmation from "@/ui/vendor/modals/DeleteConfirmation";
import TemplateSearchInput from "./TemplateSearchInput";
import TemplateCategoryFilter from "./TemplateCategoryFilter";
import TemplateIncludeInactiveToggle from "./TemplateIncludeInactiveToggle";
import TemplateGridCard from "./TemplateGridCard";
import styles from "./TemplatesPageContent.module.css";

export default function TemplatesPageContent({ lang }) {
  const { t } = useTranslation("admin");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const langParam = lang || params.lang;

  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const includeInactive = searchParams.get("includeInactive") !== "false";
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, error } = useAdminTemplates({
    search: search || undefined,
    category: category || undefined,
    includeInactive: includeInactive ? "true" : "false",
  });
  const { data: catData } = useTemplateCategories({ admin: true });

  const del = useDeleteTemplate();
  const dup = useDuplicateTemplate();

  const templates = data?.data?.templates || [];
  const categories = catData?.data?.categories || [];

  const updateParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === "" || value === null || value === undefined) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      router.push(`?${next.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearchChange = useCallback(
    (value) => updateParam("search", value),
    [updateParam]
  );

  const handleCategoryChange = useCallback(
    (value) => updateParam("category", value),
    [updateParam]
  );

  const handleInactiveToggle = useCallback(
    (checked) => updateParam("includeInactive", checked ? "true" : "false"),
    [updateParam]
  );

  const handleDuplicate = useCallback(
    async (id) => {
      try {
        const res = await dup.mutateAsync(id);
        const newId = res?.data?.template?._id;
        toastUtils.success(t("templates.duplicated", "تم تكرار القالب"));
        if (newId) router.push(`/${langParam}/admin-dash/templates/${newId}`);
      } catch (e) {
        handleError(e, t, { fallbackMessage: "errors.operation_failed" });
      }
    },
    [dup, t, router, langParam]
  );

  const performDelete = async (id) => {
    try {
      await del.mutateAsync(id);
      toastUtils.success(t("templates.templateDeleted", "تم حذف القالب"));
    } catch (e) {
      handleError(e, t, { fallbackMessage: "errors.operation_failed" });
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("templates.title", "القوالب")}</h1>
          <p className={styles.subtitle}>
            {t("templates.subtitle", "إدارة قوالب الدعوات المرئية")}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/${langParam}/admin-dash/templates/categories`}>
            <Button
              variant="secondary"
              title={t("templates.manageCategories", "إدارة الفئات")}
            />
          </Link>
          <Link href={`/${langParam}/admin-dash/templates/new`}>
            <Button
              variant="primary"
              title={t("templates.createNew", "قالب جديد")}
            />
          </Link>
        </div>
      </header>

      <div className={styles.filters}>
        <TemplateSearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder={t("templates.searchPlaceholder", "ابحث عن قالب...")}
        />
        <TemplateCategoryFilter
          categories={categories}
          value={category}
          onChange={handleCategoryChange}
          t={t}
          lang={lang}
        />
        <TemplateIncludeInactiveToggle
          checked={includeInactive}
          onChange={handleInactiveToggle}
          label={t("templates.includeInactive", "إظهار غير النشطة")}
        />
      </div>

      {isLoading && <SimpleLoading />}
      {error && (
        <p className={styles.error}>
          {t("templates.fetchError", "تعذر تحميل القوالب")}
        </p>
      )}

      <div className={styles.grid}>
        {templates.map((tpl) => (
          <TemplateGridCard
            key={tpl._id}
            tpl={tpl}
            lang={lang}
            langParam={langParam}
            t={t}
            onDuplicate={handleDuplicate}
            onDelete={(target) => setDeleteTarget(target)}
            dupPending={dup.isPending}
            delPending={del.isPending}
          />
        ))}
        {!isLoading && templates.length === 0 && (
          <div className={styles.empty}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="12" y="12" width="40" height="40" rx="8" stroke="currentColor" strokeWidth="2" />
              <path d="M24 24H40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M24 32H36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M24 40H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p>{t("templates.empty", "لا توجد قوالب")}</p>
          </div>
        )}
      </div>

      <DeleteConfirmation
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          const id = deleteTarget?._id;
          setDeleteTarget(null);
          if (id) await performDelete(id);
        }}
        title={t("templates.confirmDeleteTitle", "حذف القالب")}
        message={t(
          "templates.confirmDelete",
          "هل أنت متأكد من حذف هذا القالب؟"
        )}
        itemName={
          deleteTarget
            ? lang === "ar"
              ? deleteTarget.nameAr
              : deleteTarget.nameEn
            : ""
        }
        confirmText={t("delete", "حذف")}
        cancelText={t("cancel", "إلغاء")}
        isLoading={del.isPending}
      />
    </div>
  );
}

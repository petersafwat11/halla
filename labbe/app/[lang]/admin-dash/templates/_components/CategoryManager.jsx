"use client";

import React from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import Button from "@/ui/commen/button/Button";
import { useTemplateCategories } from "@/hooks/queries/useTemplates";
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/mutations/useTemplateMutations";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./CategoryManager.module.css";

const categorySchema = z.object({
  code: z.string().min(1),
  nameEn: z.string().min(1),
  nameAr: z.string().min(1),
  sortOrder: z.coerce.number().min(0).default(0),
});

export default function CategoryManager({ lang }) {
  const { t } = useTranslation("admin");
  const { data, isLoading } = useTemplateCategories({ admin: true });
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const del = useDeleteCategory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: { code: "", nameEn: "", nameAr: "", sortOrder: 0 },
  });

  const cats = data?.data?.categories || data?.categories || [];

  const onSubmit = async (data) => {
    try {
      await create.mutateAsync(data);
      reset();
      toastUtils.success(t("templates.categoryCreated"));
    } catch (err) {
      handleError(err, t, { fallbackMessage: "errors.generic" });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t("templates.panel.categoryDeleteConfirm"))) return;
    try {
      await del.mutateAsync(id);
      toastUtils.success(t("templates.panel.categoryDeleted"));
    } catch (err) {
      handleError(err, t);
    }
  };

  const handleActiveToggle = async (id, active) => {
    try {
      await update.mutateAsync({ id, body: { active } });
      toastUtils.success(t("templates.panel.categoryUpdated"));
    } catch (err) {
      handleError(err, t);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("templates.categoriesTitle")}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <label className={styles.formField}>
          <small className={styles.label}>{t("templates.panel.code")}</small>
          <input
            {...register("code")}
            className={styles.input}
          />
        </label>
        <label className={styles.formField}>
          <small className={styles.label}>{t("templates.panel.nameEn")}</small>
          <input
            {...register("nameEn")}
            className={styles.input}
          />
        </label>
        <label className={styles.formField}>
          <small className={styles.label}>{t("templates.panel.nameAr")}</small>
          <input
            {...register("nameAr")}
            dir="rtl"
            className={styles.input}
          />
        </label>
        <label className={styles.formField}>
          <small className={styles.label}>{t("templates.panel.sort")}</small>
          <input
            type="number"
            {...register("sortOrder")}
            className={styles.input}
          />
        </label>
        <Button
          type="submit"
          variant="primary"
          title={t("templates.panel.add")}
          disabled={isSubmitting || create.isPending}
        />
      </form>

      {isLoading && <SimpleLoading />}

      {!isLoading && (
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>{t("templates.panel.code")}</th>
              <th className={styles.th}>{t("templates.panel.nameEn")}</th>
              <th className={styles.th}>{t("templates.panel.nameAr")}</th>
              <th className={styles.th}>{t("templates.panel.sort")}</th>
              <th className={styles.th}>{t("templates.panel.active")}</th>
              <th className={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c._id} className={styles.tr}>
                <td className={styles.td}>{c.code}</td>
                <td className={styles.td}>{c.nameEn}</td>
                <td className={styles.td}>{c.nameAr}</td>
                <td className={styles.td}>{c.sortOrder ?? 0}</td>
                <td className={styles.td}>
                  <input
                    type="checkbox"
                    defaultChecked={c.active !== false}
                    onChange={(e) => handleActiveToggle(c._id, e.target.checked)}
                  />
                </td>
                <td className={styles.td}>
                  <Button
                    variant="danger"
                    size="small"
                    title={t("templates.panel.delete")}
                    onClick={() => handleDelete(c._id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

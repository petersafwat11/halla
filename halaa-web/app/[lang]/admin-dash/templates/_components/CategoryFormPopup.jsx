"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import { categoryFormSchema } from "@halaa/shared/schemas/admin";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import {
  useCreateCategory,
  useUpdateCategory,
} from "@/hooks/templates";
import styles from "./CategoryFormPopup.module.css";

export default function CategoryFormPopup({ onClose, category }) {
  const { t } = useTranslation("admin");
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const isEdit = !!category;

  const methods = useForm({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      code: category?.code || "",
      nameEn: category?.nameEn || "",
      nameAr: category?.nameAr || "",
      sortOrder: category?.sortOrder ?? 0,
    },
  });

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        // `code` is immutable on the backend — strip before submit.
        const { code, ...rest } = data;
        await update.mutateAsync({ id: category._id, body: rest });
        toastUtils.success(t("templates.categories.edit.success", "تم تحديث الفئة بنجاح"));
      } else {
        await create.mutateAsync(data);
        toastUtils.success(t("templates.categories.create.success", "تم إضافة الفئة بنجاح"));
      }
      onClose();
    } catch (error) {
      handleError(error, t);
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>
            {isEdit
              ? t("templates.categories.edit.title", "تعديل الفئة")
              : t("templates.categories.create.title", "إضافة فئة جديدة")}
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
            <InputGroup
              label={t("templates.categories.form.code", "الكود")}
              placeholder={t("templates.categories.form.codePlaceholder", "أدخل كود الفئة")}
              type="text"
              name="code"
              required
              disabled={isEdit}
            />
            <InputGroup
              label={t("templates.categories.form.nameEn", "الاسم بالإنجليزية")}
              placeholder={t("templates.categories.form.nameEnPlaceholder", "Category name in English")}
              type="text"
              name="nameEn"
              required
            />
            <InputGroup
              label={t("templates.categories.form.nameAr", "الاسم بالعربية")}
              placeholder={t("templates.categories.form.nameArPlaceholder", "اسم الفئة بالعربية")}
              type="text"
              name="nameAr"
              required
            />
            <InputGroup
              label={t("templates.categories.form.sortOrder", "ترتيب العرض")}
              placeholder={t("templates.categories.form.sortOrderPlaceholder", "0")}
              type="number"
              name="sortOrder"
            />
            <div className={styles.actions}>
              <Button
                variant="secondary"
                title={t("common.cancel", "إلغاء")}
                onClick={onClose}
                disabled={create.isPending || update.isPending}
              />
              <Button
                variant="primary"
                title={
                  create.isPending || update.isPending
                    ? t("common.saving", "جاري الحفظ...")
                    : isEdit
                      ? t("common.save", "حفظ")
                      : t("common.add", "إضافة")
                }
                type="submit"
                disabled={create.isPending || update.isPending}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}

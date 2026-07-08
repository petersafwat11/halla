import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { createEventAdditionSchemas } from "@/utils/schemas/eventAddintionSchemas";
import styles from "./addStaffPopup.module.css";
import Button from "@/ui/commen/button/Button";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";

const AddStaffPopup = ({ onConfirm, onCancel, eventId }) => {
  const { t } = useTranslation("home-events");

  // Create localized schemas
  const { staffSchema } = createEventAdditionSchemas(t);

  const methods = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
    },
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    register,
    watch,
    setValue,
  } = methods;

  const watchedFields = watch();

  const onSubmit = async (data) => {
    try {
      await onConfirm(data);
      toast.success(
        t("singleEvent.addStaff.success") ||
          "Staff added successfully"
      );
      onCancel(); // Close popup on success
    } catch (error) {
      console.error("Error adding staff:", error);
      toast.error(
        error.message ||
          t("singleEvent.addStaff.error") ||
          "Failed to add staff"
      );
    }
  };

  return (
    <div className={styles.popup}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {t("singleEvent.addStaff.title") || "Add Staff"}
        </h2>
        <button className={styles.closeButton} onClick={onCancel} type="button">
          ×
        </button>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.content}>
            <div className={styles.formGroup}>
              <InputGroup
                label={t("singleEvent.addStaff.name") || "Name"}
                type="text"
                name="name"
                error={errors.name?.message}
                placeholder={
                  t("singleEvent.addStaff.namePlaceholder") ||
                  "Enter staff name"
                }
                required
              />
            </div>

            <div className={styles.formGroup}>
              <InputGroup
                label={t("singleEvent.addStaff.phone") || "Phone"}
                type="tel"
                name="phone"
                error={errors.phone?.message}
                placeholder={
                  t("singleEvent.addStaff.phonePlaceholder") ||
                  "Enter phone number"
                }
                required
              />
            </div>
          </div>

          <div className={styles.footer}>
            <Button
              variant="secondary"
              title={t("common.cancel") || "Cancel"}
              onClick={onCancel}
              disabled={isSubmitting}
              type="button"
            />
            <Button
              variant="primary"
              title={
                isSubmitting
                  ? t("common.loading") || "Loading..."
                  : t("common.confirm") || "Confirm"
              }
              disabled={isSubmitting}
              type="submit"
            />
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default AddStaffPopup;

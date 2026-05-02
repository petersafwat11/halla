import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { createEventAdditionSchemas } from "@/utils/schemas/eventAddintionSchemas";
import styles from "./addGuestPopup.module.css";
import Button from "@/ui/commen/button/Button";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";

const AddGuestPopup = ({ onConfirm, onCancel, eventId, editGuest = null }) => {
  const { t } = useTranslation("home-events");

  // Create localized schemas
  const { guestSchema } = createEventAdditionSchemas(t);

  // Determine if we're editing
  const isEditing = editGuest !== null;

  const methods = useForm({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      name: editGuest?.name || "",
      email: editGuest?.email || "",
      phone: editGuest?.phone || "",
    },
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    register,
    watch,
  } = methods;

  const watchedFields = watch();

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        // Update existing guest
        await onConfirm(editGuest._id, data);
        toast.success(
          t("singleEvent.updateGuest.success") || "Guest updated successfully"
        );
      } else {
        // Add new guest
        await onConfirm(data);
        toast.success(
          t("singleEvent.addGuest.success") || "Guest added successfully"
        );
      }
      onCancel(); // Close popup on success
    } catch (error) {
      console.error(`Error ${isEditing ? "updating" : "adding"} guest:`, error);
      const errorMessage = isEditing
        ? error.message ||
          t("singleEvent.updateGuest.error") ||
          "Failed to update guest"
        : error.message ||
          t("singleEvent.addGuest.error") ||
          "Failed to add guest";
      toast.error(errorMessage);
    }
  };

  const getTitle = () => {
    if (isEditing) {
      return t("singleEvent.updateGuest.title") || "Update Guest";
    }
    return t("singleEvent.addGuest.title") || "Add Guest";
  };

  const getConfirmButtonText = () => {
    if (isSubmitting) {
      return t("common.loading") || "Loading...";
    }
    if (isEditing) {
      return t("singleEvent.updateGuest.confirm") || "Update";
    }
    return t("common.confirm") || "Confirm";
  };

  return (
    <div className={styles.popup}>
      <div className={styles.header}>
        <h2 className={styles.title}>{getTitle()}</h2>
        <button className={styles.closeButton} onClick={onCancel} type="button">
          ×
        </button>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.content}>
            <div className={styles.formGroup}>
              <InputGroup
                label={t("singleEvent.addGuest.name") || "Name"}
                type="text"
                name="name"
                error={errors.name?.message}
                placeholder={
                  t("singleEvent.addGuest.namePlaceholder") ||
                  "Enter guest name"
                }
                required
              />
            </div>

            <div className={styles.formGroup}>
              <InputGroup
                label={t("singleEvent.addGuest.email") || "Email"}
                type="email"
                name="email"
                error={errors.email?.message}
                placeholder={
                  t("singleEvent.addGuest.emailPlaceholder") ||
                  "Enter email address"
                }
              />
            </div>

            <div className={styles.formGroup}>
              <InputGroup
                label={t("singleEvent.addGuest.phone") || "Phone"}
                type="tel"
                name="phone"
                error={errors.phone?.message}
                placeholder={
                  t("singleEvent.addGuest.phonePlaceholder") ||
                  "Enter phone number"
                }
              />
            </div>

            {errors.contact && (
              <div className={styles.contactError}>
                {errors.contact.message}
              </div>
            )}
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
              title={getConfirmButtonText()}
              disabled={isSubmitting}
              type="submit"
            />
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default AddGuestPopup;

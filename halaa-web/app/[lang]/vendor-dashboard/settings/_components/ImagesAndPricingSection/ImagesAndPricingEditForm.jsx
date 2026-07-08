"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { toast } from "react-toastify";

import styles from "./imagesAndPricingEditForm.module.css";
import { keyFromSignedUrl } from "@/utils/vendorHelpers";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

/**
 * Edit dialog for the Images & Pricing section.
 *
 * Handles two distinct flows in one form:
 *
 *  1. Existing images — each thumbnail has a delete icon that hits
 *     `DELETE /users/profile/vendorData/image` with `{ field, key }` and
 *     refetches the profile so the grid stays in sync with the server.
 *
 *  2. New uploads — picked files live in local state with previews and
 *     remove buttons. On submit we forward only the new files to the parent's
 *     onSave; the backend appends them to the existing array.
 *
 *  The old DynamicForm-backed flow couldn't delete existing images and lost
 *  new uploads when its `existingImages` prop changed identity; replacing it
 *  with a purpose-built form removes both bugs.
 */
const ImageTile = ({ src, onRemove, isLoading, label }) => {
  const { t } = useTranslation("vendorSettings");
  return (
    <div className={styles.tile}>
      <Image
        src={src}
        alt={label || "image"}
        width={96}
        height={96}
        className={styles.tileImage}
        unoptimized
      />
      <button
        type="button"
        className={styles.tileDelete}
        onClick={onRemove}
        disabled={isLoading}
        aria-label={t("buttons.delete", "حذف")}
      >
        {isLoading ? "…" : "×"}
      </button>
    </div>
  );
};

const ImagesAndPricingEditForm = ({
  existingPortfolio,
  existingPricing,
  onSave,
  onClose,
  onRefetch,
  isLoading,
}) => {
  const { t } = useTranslation("vendorSettings");
  const portfolioInputRef = useRef(null);
  const pricingInputRef = useRef(null);

  const [newPortfolio, setNewPortfolio] = useState([]);
  const [newPricing, setNewPricing] = useState([]);
  const [deletingKey, setDeletingKey] = useState(null);

  // Pair each picked File with a stable blob URL and revoke when the file is
  // dropped from state — otherwise every render mints a new ObjectURL and
  // leaks blobs until the page navigates away.
  const portfolioPreviews = useMemo(
    () => newPortfolio.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [newPortfolio]
  );
  const pricingPreviews = useMemo(
    () => newPricing.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [newPricing]
  );
  useEffect(() => {
    return () => {
      portfolioPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [portfolioPreviews]);
  useEffect(() => {
    return () => {
      pricingPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [pricingPreviews]);

  const handlePick = (event, setter) => {
    const picked = Array.from(event.target.files || []);
    if (picked.length === 0) return;
    const invalid = picked.filter(
      (f) => !ACCEPTED_IMAGE_TYPES.includes(f.type)
    );
    if (invalid.length) {
      toast.error(
        t(
          "imagesAndPricing.invalidFormat",
          "Only JPEG, PNG, GIF, WebP files are accepted"
        )
      );
      event.target.value = "";
      return;
    }
    setter((prev) => [...prev, ...picked]);
    event.target.value = "";
  };

  const removeNew = (setter, index) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const deleteExisting = async (field, signedUrl) => {
    const key = keyFromSignedUrl(signedUrl);
    if (!key) {
      toast.error(t("messages.deleteFailed", "Failed to delete image"));
      return;
    }
    if (
      !window.confirm(
        t("imagesAndPricing.confirmDelete", "Delete this image?")
      )
    ) {
      return;
    }
    setDeletingKey(key);
    try {
      await apiRequest({
        method: "DELETE",
        path: API_PATHS.users.deleteVendorImage,
        data: { field, key },
      });
      toast.success(t("messages.imageDeleted", "Image deleted"));
      if (onRefetch) onRefetch();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          t("messages.deleteFailed", "Failed to delete image")
      );
    } finally {
      setDeletingKey(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {};
    if (newPortfolio.length) payload.portfolioImages = newPortfolio;
    if (newPricing.length) payload.pricePackages = newPricing;
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    await onSave(payload);
    setNewPortfolio([]);
    setNewPricing([]);
    onClose();
  };

  const renderSection = ({
    title,
    field,
    existing,
    newFiles,
    newPreviews,
    setNewFiles,
    inputRef,
    setterRef,
  }) => (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => inputRef.current?.click()}
        >
          + {t("imagesAndPricing.addImages", "إضافة صور")}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handlePick(e, setterRef)}
        />
      </div>

      {existing.length === 0 && newFiles.length === 0 && (
        <div className={styles.empty}>
          {t("imagesAndPricing.noImages", "لا توجد صور")}
        </div>
      )}

      {existing.length > 0 && (
        <div className={styles.subhead}>
          {t("imagesAndPricing.savedImages", "الصور المحفوظة")}
        </div>
      )}
      <div className={styles.grid}>
        {existing.map((url, i) => {
          const key = keyFromSignedUrl(url);
          return (
            <ImageTile
              key={`existing-${field}-${i}-${url}`}
              src={url}
              label={`${field}-${i}`}
              isLoading={deletingKey === key}
              onRemove={() => deleteExisting(field, url)}
            />
          );
        })}
      </div>

      {newFiles.length > 0 && (
        <>
          <div className={styles.subhead}>
            {t("imagesAndPricing.newUploads", "صور جديدة")}
          </div>
          <div className={styles.grid}>
            {newPreviews.map((preview, i) => (
              <ImageTile
                key={`new-${field}-${i}-${preview.file.name}`}
                src={preview.url}
                label={preview.file.name}
                onRemove={() => removeNew(setNewFiles, i)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );

  return (
    <form className={styles.container} onSubmit={handleSubmit}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label={t("buttons.cancel", "إلغاء")}
        >
          ×
        </button>
        <h2 className={styles.title}>{t("imagesAndPricing.title")}</h2>
      </header>

      <div className={styles.body}>
        {renderSection({
          title: t("imagesAndPricing.previousWorkImages"),
          field: "portfolioImages",
          existing: existingPortfolio,
          newFiles: newPortfolio,
          newPreviews: portfolioPreviews,
          setNewFiles: setNewPortfolio,
          inputRef: portfolioInputRef,
          setterRef: setNewPortfolio,
        })}

        {renderSection({
          title: t("imagesAndPricing.priceListsAndPackages"),
          field: "pricePackages",
          existing: existingPricing,
          newFiles: newPricing,
          newPreviews: pricingPreviews,
          setNewFiles: setNewPricing,
          inputRef: pricingInputRef,
          setterRef: setNewPricing,
        })}
      </div>

      <footer className={styles.footer}>
        <button
          type="submit"
          className={styles.saveBtn}
          disabled={isLoading}
        >
          {isLoading
            ? t("buttons.saving", "جاري الحفظ...")
            : t("buttons.save", "حفظ")}
        </button>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={onClose}
          disabled={isLoading}
        >
          {t("buttons.cancel", "إلغاء")}
        </button>
      </footer>
    </form>
  );
};

export default ImagesAndPricingEditForm;

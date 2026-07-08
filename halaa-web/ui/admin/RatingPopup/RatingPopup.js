"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { MdStar, MdClose, MdStarBorder } from "react-icons/md";
import { useAdminVendorMutation } from "@/hooks/admin";
import styles from "./RatingPopup.module.css";

const RatingPopup = ({ data, onClose, onSuccess }) => {
  const { t } = useTranslation("adminVendors");
  const [rating, setRating] = useState(data?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const updateRating = useAdminVendorMutation("updateRating");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error(t("rating.required", "Please select a rating"));
      return;
    }

    setLoading(true);
    try {
      await updateRating.mutateAsync({
        vendorId: data.id || data._id,
        rating,
      });
      toast.success(t("rating.success", "Rating updated successfully"));
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error updating rating:", error);
      toast.error(t("rating.error", "Failed to update rating"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.popup}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {t("actions.giveRating", "تقييم التاجر")}
        </h2>
        <button type="button" className={styles.closeButton} onClick={onClose}>
          <MdClose size={24} />
        </button>
      </div>

      <div className={styles.vendorInfo}>
        <p className={styles.vendorName}>
          {data?.brandName || data?.username || "Unknown Vendor"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={styles.starButton}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
            >
              {star <= (hoverRating || rating) ? (
                <MdStar className={styles.starFilled} size={40} />
              ) : (
                <MdStarBorder className={styles.starEmpty} size={40} />
              )}
            </button>
          ))}
        </div>
        <p className={styles.ratingText}>
          {rating > 0 ? `${rating} / 5` : t("rating.select", "Select Rating")}
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
          >
            {t("actions.cancel", "إلغاء")}
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading || rating === 0}
          >
            {loading ? t("actions.saving", "جاري الحفظ...") : t("actions.save", "حفظ")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RatingPopup;

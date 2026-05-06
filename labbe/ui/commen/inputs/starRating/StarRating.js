"use client";
import React, { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaStar } from "react-icons/fa";
import styles from "./StarRating.module.css";

const RATING_LABELS = ["veryPoor", "poor", "average", "good", "excellent"];

const getRatingLabel = (val, t) => {
  if (val >= 1 && val <= 5) {
    const key = RATING_LABELS[val - 1];
    return t(`rating.${key}`);
  }
  return "";
};

/**
 * Inner component to safely use useState inside Controller render.
 * Hooks must be called in a proper React component, not a render-prop callback.
 */
const StarRatingInput = ({ value, onChange, disabled, size, showLabels, t }) => {
  const [hoveredRating, setHoveredRating] = useState(0);

  return (
    <div className={styles.ratingWrapper}>
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`${styles.starButton} ${styles[size]}`}
            onMouseEnter={() => !disabled && setHoveredRating(star)}
            onMouseLeave={() => !disabled && setHoveredRating(0)}
            onClick={() => !disabled && onChange(star)}
            disabled={disabled}
            aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
          >
            <FaStar
              className={`${styles.star} ${
                star <= (hoveredRating || value) ? styles.filled : ""
              }`}
            />
          </button>
        ))}
      </div>

      {showLabels && value > 0 && (
        <span className={styles.ratingLabel}>{getRatingLabel(value, t)}</span>
      )}
    </div>
  );
};

const StarRating = ({
  name,
  label,
  required = false,
  disabled = false,
  size = "large",
  showLabels = true,
}) => {
  const { t } = useTranslation("ticketRating");
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const error = errors?.[name]?.message;

  return (
    <div className={styles.container}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      <Controller
        name={name}
        control={control}
        render={({ field: { value, onChange } }) => (
          <StarRatingInput
            value={value}
            onChange={onChange}
            disabled={disabled}
            size={size}
            showLabels={showLabels}
            t={t}
          />
        )}
      />

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default StarRating;

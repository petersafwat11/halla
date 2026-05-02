"use client";
import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { FaStar } from "react-icons/fa";
import styles from "./StarRating.module.css";

const RATING_LABELS = ["veryPoor", "poor", "average", "good", "excellent"];

const StarRating = ({
  name,
  label,
  required = false,
  disabled = false,
  size = "large",
  showLabels = true,
}) => {
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
        render={({ field: { value, onChange } }) => {
          const [hoveredRating, setHoveredRating] = React.useState(0);

          const getRatingLabel = (val) => {
            if (val >= 1 && val <= 5) return RATING_LABELS[val - 1];
            return "";
          };

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
                <span className={styles.ratingLabel}>
                  {getRatingLabel(value)}
                </span>
              )}
            </div>
          );
        }}
      />

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default StarRating;

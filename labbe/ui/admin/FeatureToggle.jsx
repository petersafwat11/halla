"use client";
import React, { useState } from "react";
import styles from "./FeatureToggle.module.css";

/**
 * FeatureToggle Component
 *
 * Toggle switch for enabling/disabling features for white-label tenants
 * Admin-only access with feature name, description, and status display
 *
 * @param {Object} props
 * @param {string} props.featureKey - Unique feature identifier
 * @param {string} props.featureName - Display name of the feature
 * @param {string} props.description - Feature description
 * @param {boolean} props.enabled - Current enabled status
 * @param {Function} props.onToggle - Callback when toggle is changed
 * @param {boolean} props.disabled - Whether toggle is disabled
 * @param {boolean} props.loading - Whether toggle is in loading state
 * @param {string} props.className - Additional CSS classes
 */
const FeatureToggle = ({
  featureKey,
  featureName,
  description = "",
  enabled = false,
  onToggle,
  disabled = false,
  loading = false,
  className = "",
}) => {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    if (disabled || loading || isToggling) return;

    setIsToggling(true);
    try {
      await onToggle?.(featureKey, !enabled);
    } finally {
      setIsToggling(false);
    }
  };

  const isDisabled = disabled || loading || isToggling;

  return (
    <div className={`${styles.feature_toggle_container} ${className}`}>
      <div className={styles.feature_info}>
        <div className={styles.feature_header}>
          <h4 className={styles.feature_name}>{featureName}</h4>
          <span
            className={`${styles.status_badge} ${
              enabled ? styles.status_enabled : styles.status_disabled
            }`}
          >
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        {description && (
          <p className={styles.feature_description}>{description}</p>
        )}
      </div>

      <div className={styles.toggle_wrapper}>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`Toggle ${featureName}`}
          className={`${styles.toggle_button} ${
            enabled ? styles.toggle_enabled : styles.toggle_disabled
          } ${isDisabled ? styles.toggle_loading : ""}`}
          onClick={handleToggle}
          disabled={isDisabled}
        >
          <span
            className={`${styles.toggle_slider} ${
              enabled ? styles.slider_enabled : styles.slider_disabled
            }`}
          >
            {isToggling && (
              <svg
                className={styles.loading_spinner}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  className={styles.spinner_circle}
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </span>
        </button>
      </div>
    </div>
  );
};

/**
 * FeatureToggleGroup Component
 *
 * Groups multiple feature toggles with a section title
 *
 * @param {Object} props
 * @param {string} props.title - Group title
 * @param {string} props.description - Group description
 * @param {Array} props.features - Array of feature objects
 * @param {Function} props.onToggle - Callback when any toggle is changed
 * @param {string} props.className - Additional CSS classes
 */
export const FeatureToggleGroup = ({
  title,
  description = "",
  features = [],
  onToggle,
  className = "",
}) => {
  return (
    <div className={`${styles.feature_group} ${className}`}>
      <div className={styles.group_header}>
        <h3 className={styles.group_title}>{title}</h3>
        {description && (
          <p className={styles.group_description}>{description}</p>
        )}
      </div>
      <div className={styles.features_list}>
        {features.map((feature) => (
          <FeatureToggle
            key={feature.key}
            featureKey={feature.key}
            featureName={feature.name}
            description={feature.description}
            enabled={feature.enabled}
            onToggle={onToggle}
            disabled={feature.disabled}
            loading={feature.loading}
          />
        ))}
      </div>
    </div>
  );
};

export default FeatureToggle;

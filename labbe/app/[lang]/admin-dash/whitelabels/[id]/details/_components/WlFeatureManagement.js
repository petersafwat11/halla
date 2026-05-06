"use client";
import FeatureToggle from "@/ui/admin/FeatureToggle";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./WhitelabelDetailsWrapper.module.css";

export default function WlFeatureManagement({ features, loadingFeatures, onToggle, t }) {
  return (
    <div className={styles.card} style={{ gridColumn: "1 / -1" }}>
      <h2 className={styles.cardTitle}>{t("sections.featureManagement", "Feature Management")}</h2>
      <div className={styles.cardContent}>
        {loadingFeatures ? (
          <SimpleLoading />
        ) : features.length > 0 ? (
          <div className={styles.featuresGrid}>
            {features.map((feature) => (
              <FeatureToggle key={feature.name} feature={feature} onToggle={onToggle} />
            ))}
          </div>
        ) : (
          <p className={styles.noData}>{t("messages.noFeatures", "No features available")}</p>
        )}
      </div>
    </div>
  );
}

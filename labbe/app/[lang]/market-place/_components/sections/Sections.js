"use client";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import styles from "./sections.module.css";
import { useVendorCategories } from "@/hooks/reactQueryHooks/useVendors";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

const Sections = ({ selectedSection, onSectionChange }) => {
  const { t } = useTranslation("marketplace");
  const { data: categoriesData, isLoading: loading } = useVendorCategories();

  const serviceTypes = useMemo(() => {
    const allOption = { id: "all", key: "all", name: t("sections.all") };
    const categories = categoriesData?.data?.categories || [];
    const mapped = categories.map((cat) => ({
      id: cat.key,
      key: cat.key,
      name: cat.nameAr || cat.nameEn,
    }));
    return [allOption, ...mapped];
  }, [categoriesData, t]);

  if (loading) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>{t("sections.title")}</h3>
        <SimpleLoading />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{t("sections.title")}</h3>
      <div className={styles.filter}>
        <div className={styles.category}>
          {serviceTypes.map((section) => (
            <div
              key={section.id}
              className={`${styles.categoryItem} ${
                selectedSection === section.key ? styles.active : ""
              }`}
              onClick={() => onSectionChange && onSectionChange(section.key)}
            >
              <span className={styles.categoryLabel}>{section.name}</span>
              <div className={styles.radio}>
                {selectedSection === section.key && (
                  <div className={styles.radioInner} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sections;

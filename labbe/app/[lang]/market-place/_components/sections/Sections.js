"use client";
import React, { useMemo } from "react";
import styles from "./sections.module.css";
import { useVendorCategories } from "@/hooks/reactQueryHooks/useVendors";

const Sections = ({ selectedSection, onSectionChange }) => {
  const { data: categoriesData, isLoading: loading } = useVendorCategories();

  const serviceTypes = useMemo(() => {
    const allOption = { id: "all", key: "all", name: "الكل" };
    const categories = categoriesData?.data?.categories || [];
    const mapped = categories.map((cat) => ({
      id: cat.key,
      key: cat.key,
      name: cat.nameAr || cat.nameEn,
    }));
    return [allOption, ...mapped];
  }, [categoriesData]);

  if (loading) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>الأقسام</h3>
        <div className={styles.loading}>جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>الأقسام</h3>
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

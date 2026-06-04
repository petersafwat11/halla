"use client";
import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import styles from "./EventTemplatesSection.module.css";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/use-media-query";
import UseLanguageChange from "@/hooks/UseLanguageChange";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import {
  useHostTemplates,
  useTemplateCategories,
} from "@/hooks/templates";

function EventTemplatesSection() {
  const { t } = useTranslation("home-events");
  const { currentLocale } = UseLanguageChange();
  const isAr = currentLocale === "ar";

  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const isMobile = useMediaQuery("(max-width: 550px)");
  const isTablet = useMediaQuery("(max-width: 768px)");

  // Mobile + tablet use the 3-column grid defined in
  // EventTemplatesSection.module.css, so pages must hold 3 cards.
  // Desktop reverts to 4 per page (single row).
  const itemsPerPage = isMobile || isTablet ? 3 : 4;

  const { data: catData } = useTemplateCategories({ admin: false });
  const { data: tplData, isLoading } = useHostTemplates({
    category: selectedCategory,
  });

  const categories = catData?.data?.categories || [];
  const templates = useMemo(
    () => tplData?.data?.templates || [],
    [tplData],
  );

  const totalPages = Math.max(1, Math.ceil(templates.length / itemsPerPage));
  const startIndex = currentPage * itemsPerPage;
  const currentTemplates = templates.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [isMobile, isTablet, selectedCategory, templates.length]);

  return (
    <div className={styles.templatesContainer}>
      <div className={styles.templatesCard}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("templates.title")}</h2>
          <p className={styles.subtitle}>{t("templates.subtitle")}</p>
        </div>

        <div className={styles.content}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${
                selectedCategory === "" ? styles.active : ""
              }`}
              onClick={() => setSelectedCategory("")}
            >
              {t("templates.all")}
            </button>
            {categories.map((c) => (
              <button
                key={c._id || c.code}
                type="button"
                className={`${styles.tab} ${
                  selectedCategory === c.code ? styles.active : ""
                }`}
                onClick={() => setSelectedCategory(c.code)}
              >
                {isAr ? c.nameAr : c.nameEn}
              </button>
            ))}
          </div>

          {isLoading ? (
            <SimpleLoading />
          ) : templates.length === 0 ? (
            <p className={styles.emptyMessage}>
              {t("templates.empty")}
            </p>
          ) : (
            <div className={styles.templatesGrid}>
              {currentTemplates.map((tpl) => {
                const src = tpl.thumbnailUrl || tpl.imageUrl;
                const alt = isAr ? tpl.nameAr : tpl.nameEn;
                return (
                  <div key={tpl._id} className={styles.templateCard}>
                    <div className={styles.templateCardInner}>
                      {src ? (
                        <Image
                          src={src}
                          alt={alt || "template"}
                          width={129}
                          height={172}
                          className={styles.templateImage}
                          unoptimized={
                            src.startsWith("blob:") || src.startsWith("data:")
                          }
                        />
                      ) : (
                        <div className={styles.templateImage} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className={styles.pagination}>
              {Array.from({ length: totalPages }).map((_, index) => (
                <div
                  key={index}
                  className={`${styles.dot} ${
                    index === currentPage ? styles.activeDot : ""
                  }`}
                  onClick={() => setCurrentPage(index)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventTemplatesSection;

"use client";
import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import styles from "./EventTemplatesSection.module.css";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/use-media-query";
import UseLanguageChange from "@/hooks/UseLanguageChange";
import useCarouselSnap from "@/ui/landing/_shared/useCarouselSnap";
import CarouselDots from "@/ui/landing/_shared/CarouselDots";

const LOCAL_CATEGORIES = [
  { code: "birthday",      nameEn: "Birthday Invitation",   nameAr: "دعوة عيد ميلاد" },
  { code: "wedding",       nameEn: "Wedding Invitation",    nameAr: "دعوة زفاف" },
  { code: "baby_shower",   nameEn: "Newborn Invitation",    nameAr: "دعوة مولود" },
  { code: "special_event", nameEn: "Special Occasion",      nameAr: "مناسبة خاصة" },
  { code: "ramadan",       nameEn: "Ramadan Invitation",    nameAr: "دعوة رمضان" },
  { code: "graduation",    nameEn: "Graduation Invitation", nameAr: "دعوة تخرج" },
];

const LOCAL_TEMPLATES = [
  {
    id: "tpl-1",
    nameEn: "Royal Groom",
    nameAr: "زفاف ملكي",
    categories: ["wedding"],
    src: "/template-cards/1.png",
  },
  {
    id: "tpl-2",
    nameEn: "Pearl Da'wah Wedding",
    nameAr: "دعوة زفاف لؤلؤية",
    categories: ["wedding"],
    src: "/template-cards/2.png",
  },
  {
    id: "tpl-3",
    nameEn: "Royal Da'wah Wedding",
    nameAr: "دعوة الفرح الملكي",
    categories: ["wedding"],
    src: "/template-cards/3.png",
  },
  {
    id: "tpl-4",
    nameEn: "Gulf Groom",
    nameAr: "زفاف الخليج",
    categories: ["wedding"],
    src: "/template-cards/4.png",
  },
  {
    id: "tpl-5",
    nameEn: "Rose Garden Wedding",
    nameAr: "زفاف الورد",
    categories: ["wedding"],
    src: "/template-cards/5.png",
  },
  {
    id: "tpl-6",
    nameEn: "Burgundy Bloom Wedding",
    nameAr: "زفاف الورد الأرجواني",
    categories: ["wedding"],
    src: "/template-cards/6.png",
  },
  {
    id: "tpl-7",
    nameEn: "Floral Arch Wedding",
    nameAr: "قوس الزهور",
    categories: ["wedding"],
    src: "/template-cards/7.png",
  },
  {
    id: "tpl-8",
    nameEn: "Candle Engagement",
    nameAr: "خطوبة الشموع",
    categories: ["wedding"],
    src: "/template-cards/8.png",
  },
  {
    id: "tpl-9",
    nameEn: "Sacred Vows",
    nameAr: "عقد قران مبارك",
    categories: ["wedding"],
    src: "/template-cards/9.png",
  },
  {
    id: "tpl-10",
    nameEn: "Eid Al-Adha",
    nameAr: "عيد الأضحى",
    categories: ["special_event"],
    src: "/template-cards/10.png",
  },
  {
    id: "tpl-11",
    nameEn: "Ramadan Iftar",
    nameAr: "سفرة إفطار رمضان",
    categories: ["ramadan"],
    src: "/template-cards/11.png",
  },
  {
    id: "tpl-12",
    nameEn: "Birthday Party",
    nameAr: "حفلة عيد ميلاد",
    categories: ["birthday"],
    src: "/template-cards/12.png",
  },
  {
    id: "tpl-13",
    nameEn: "Newborn Boy",
    nameAr: "بشارة المولود",
    categories: ["baby_shower"],
    src: "/template-cards/13.png",
  },
  {
    id: "tpl-14",
    nameEn: "Newborn Girl",
    nameAr: "بشارة الأميرة",
    categories: ["baby_shower"],
    src: "/template-cards/14.jpg",
  },
  {
    id: "tpl-15",
    nameEn: "Graduation Celebration",
    nameAr: "حفل تخرج",
    categories: ["graduation"],
    src: "/template-cards/15.png",
  },
  {
    id: "tpl-16",
    nameEn: "Pearl Promise",
    nameAr: "وعد لؤلؤي",
    categories: ["special_event"],
    src: "/template-cards/16.png",
  },
];

function EventTemplatesSection() {
  const { t } = useTranslation("home-events");
  const { currentLocale } = UseLanguageChange();
  const isAr = currentLocale === "ar";

  const [selectedCategory, setSelectedCategory] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const isMobile = useMediaQuery("(max-width: 550px)");
  const isTablet = useMediaQuery("(max-width: 768px)");

  const categories = LOCAL_CATEGORIES;
  
  const templates = useMemo(() => {
    if (selectedCategory === "") {
      return LOCAL_TEMPLATES;
    }
    return LOCAL_TEMPLATES.filter((tpl) =>
      tpl.categories.includes(selectedCategory)
    );
  }, [selectedCategory]);

  const GAP = isMobile || isTablet ? 12 : 24;

  const { trackRef, idx, maxIdx, scrollToIdx, goPrev, goNext, handleScroll } = useCarouselSnap({
    gap: GAP,
    totalItems: templates.length,
  });

  // Reset slider index to 0 when category changes
  useEffect(() => {
    scrollToIdx(0);
  }, [selectedCategory, templates.length, scrollToIdx]);

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
                key={c.code}
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

          {templates.length === 0 ? (
            <p className={styles.emptyMessage}>
              {t("templates.empty")}
            </p>
          ) : (
            <div
              className={styles.templatesTrack}
              ref={trackRef}
              onScroll={handleScroll}
            >
              {templates.map((tpl) => {
                const src = tpl.src;
                const alt = t("templates.cardAlt");
                return (
                  <div
                    key={tpl.id}
                    className={styles.templateCard}
                    onClick={() => setPreviewTemplate(tpl)}
                  >
                    <div className={styles.templateCardInner}>
                      {src ? (
                        <Image
                          src={src}
                          alt={alt || "template"}
                          width={129}
                          height={172}
                          className={styles.templateImage}
                          unoptimized={true}
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

          {templates.length > 1 && (
            <CarouselDots
              idx={idx}
              maxIdx={maxIdx}
              onChange={scrollToIdx}
              onPrev={goPrev}
              onNext={goNext}
              classes={{
                controls: styles.controls,
                ctrlBtn: styles.ctrlBtn,
                dots: styles.dots,
                dot: styles.dot,
                dotActive: styles.dotActive,
              }}
            />
          )}
        </div>
      </div>

      {previewTemplate && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setPreviewTemplate(null)}
        >
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{t("templates.preview")}</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setPreviewTemplate(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </header>
            <div className={styles.modalBody}>
              <div className={styles.previewImageWrapper}>
                <Image
                  src={previewTemplate.src}
                  alt={t("templates.cardAlt")}
                  width={340}
                  height={412}
                  className={styles.previewImage}
                  unoptimized={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventTemplatesSection;


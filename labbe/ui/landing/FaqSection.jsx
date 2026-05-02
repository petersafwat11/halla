"use client";
import styles from "./FaqSection.module.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function FaqSection({ lang = "ar" }) {
  const { t } = useTranslation("landing");
  const items = t("faq.items", { returnObjects: true });
  const [open, setOpen] = useState(null);

  return (
    <>
      <section id="faq" className={styles.faqRoot}>
        <div className={styles.faqInner}>
          <div className={styles.faqHdr}>
            <span className={styles.faqEyebrow}>{t("faq.eyebrow")}</span>
          </div>
          <div className={styles.faqList}>
            {items.map((item, i) => (
              <div key={i} className={`${styles.faqItem}${open === i ? ` ${styles.open}` : ""}`}>
                <button
                  className={styles.faqQ}
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                >
                  <span>{item.q}</span>
                  <span className={styles.faqIcon} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
                <div className={styles.faqBody} role="region">
                  <div className={styles.faqBodyInner}>
                    <div className={styles.faqA}>{item.a}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

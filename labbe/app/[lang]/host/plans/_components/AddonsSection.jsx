"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCheck } from "react-icons/fa";
import styles from "./AddonsSection.module.css";

const EXTRA_INVITES_TIERS = [
  { quantity: 10, price: 40 },
  { quantity: 20, price: 75 },
  { quantity: 30, price: 105 },
  { quantity: 40, price: 130 },
  { quantity: 50, price: 150 },
];

const EXTRA_REMINDERS_TIERS = [
  { quantity: 1, price: 25 },
  { quantity: 2, price: 45 },
  { quantity: 3, price: 60 },
  { quantity: 4, price: 70 },
  { quantity: 5, price: 75 },
];

const DESIGN_TEMPLATE_TIERS = [
  { type: "ready_made",    nameAr: "تصميم جاهز (رجالي/نسائي)",         nameEn: "Ready-made design", price: 200 },
  { type: "custom_male",   nameAr: "تصميم رجالي مخصص",                 nameEn: "Custom male design", price: 200 },
  { type: "custom_themed", nameAr: "تصميم حسب ثيم المناسبة",           nameEn: "Themed design",      price: 275 },
  { type: "animated",      nameAr: "تصميم بخلفيات متحركة",             nameEn: "Animated design",    price: 350 },
  { type: "3d",            nameAr: "تصميم ثلاثي الأبعاد (3D)",         nameEn: "3D design",          price: 500 },
];

const AddonsSection = ({ onAddonsChange }) => {
  const { t, i18n } = useTranslation("plans");
  const isAr = i18n.language === "ar";

  const [extraInvites, setExtraInvites] = useState(null);
  const [extraReminders, setExtraReminders] = useState(null);
  const [designTemplate, setDesignTemplate] = useState(null);

  const notify = (inv, rem, des) => {
    const total = (inv?.price || 0) + (rem?.price || 0) + (des?.price || 0);
    const items = [];
    if (inv) items.push({ type: "extra_invites", quantity: inv.quantity, price: inv.price });
    if (rem) items.push({ type: "extra_reminders", quantity: rem.quantity, price: rem.price });
    if (des) items.push({ type: "design_template", templateType: des.type, quantity: 1, price: des.price });
    onAddonsChange && onAddonsChange(items, total);
  };

  const setInv = (tier) => { setExtraInvites(tier); notify(tier, extraReminders, designTemplate); };
  const setRem = (tier) => { setExtraReminders(tier); notify(extraInvites, tier, designTemplate); };
  const setDes = (tier) => { setDesignTemplate(tier); notify(extraInvites, extraReminders, tier); };

  return (
    <div className={styles.addonsSection}>
      <h3 className={styles.addonsTitle}>{t("addons.title")}</h3>
      <p className={styles.addonsSubtitle}>{t("addons.subtitle")}</p>

      {/* Extra Invites */}
      <div className={styles.addonCard}>
        <div className={styles.addonHeader}>
          <span className={styles.addonName}>{t("addons.extraInvites.title")}</span>
          <span className={styles.addonDesc}>{t("addons.extraInvites.description")}</span>
        </div>
        <div className={styles.tierRow}>
          {EXTRA_INVITES_TIERS.map((tier) => (
            <button
              key={tier.quantity}
              className={`${styles.tierBtn} ${extraInvites?.quantity === tier.quantity ? styles.active : ""}`}
              onClick={() => setInv(extraInvites?.quantity === tier.quantity ? null : tier)}
            >
              +{tier.quantity}
              <span className={styles.tierPrice}>{tier.price} {isAr ? "ر.س" : "SAR"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Extra Reminders */}
      <div className={styles.addonCard}>
        <div className={styles.addonHeader}>
          <span className={styles.addonName}>{t("addons.extraReminders.title")}</span>
          <span className={styles.addonDesc}>{t("addons.extraReminders.description")}</span>
        </div>
        <div className={styles.tierRow}>
          {EXTRA_REMINDERS_TIERS.map((tier) => (
            <button
              key={tier.quantity}
              className={`${styles.tierBtn} ${extraReminders?.quantity === tier.quantity ? styles.active : ""}`}
              onClick={() => setRem(extraReminders?.quantity === tier.quantity ? null : tier)}
            >
              +{tier.quantity}
              <span className={styles.tierPrice}>{tier.price} {isAr ? "ر.س" : "SAR"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Design Template */}
      <div className={styles.addonCard}>
        <div className={styles.addonHeader}>
          <span className={styles.addonName}>{t("addons.designTemplate.title")}</span>
          <span className={styles.addonDesc}>{t("addons.designTemplate.description")}</span>
        </div>
        <div className={styles.templateList}>
          {DESIGN_TEMPLATE_TIERS.map((tier) => (
            <button
              key={tier.type}
              className={`${styles.templateBtn} ${designTemplate?.type === tier.type ? styles.active : ""}`}
              onClick={() => setDes(designTemplate?.type === tier.type ? null : tier)}
            >
              <span>{isAr ? tier.nameAr : tier.nameEn}</span>
              <span className={styles.tierPrice}>{tier.price} {isAr ? "ر.س" : "SAR"}</span>
              {designTemplate?.type === tier.type && <FaCheck className={styles.checkIcon} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddonsSection;

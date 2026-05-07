"use client";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCheck } from "react-icons/fa";
import { useAvailableAddons } from "@/hooks/reactQueryHooks/useAddons";
import styles from "./AddonsSection.module.css";

/**
 * Addon picker. Selections are bubbled up via `onAddonsChange` — purchases
 * happen inside the bundled checkout (Summary → useCheckout). This component
 * never calls the addons-purchase endpoint directly.
 */
const AddonsSection = ({ onAddonsChange }) => {
  const { t, i18n } = useTranslation("plans");
  const isAr = i18n.language === "ar";

  const { data: catalogResponse, isLoading, error } = useAvailableAddons();
  const catalog = catalogResponse?.data || catalogResponse?.data?.data || null;

  const tiers = useMemo(
    () => ({
      extraInvites: catalog?.extra_invites || [],
      extraReminders: catalog?.extra_reminders || [],
      designTemplate: catalog?.design_template || [],
    }),
    [catalog]
  );

  const [extraInvites, setExtraInvites] = useState(null);
  const [extraReminders, setExtraReminders] = useState(null);
  const [designTemplate, setDesignTemplate] = useState(null);

  const notify = (inv, rem, des) => {
    const total = (inv?.price || 0) + (rem?.price || 0) + (des?.price || 0);
    const items = [];
    if (inv) {
      items.push({
        addonType: "extra_invites",
        type: "extra_invites",
        quantity: inv.quantity,
        price: inv.price,
      });
    }
    if (rem) {
      items.push({
        addonType: "extra_reminders",
        type: "extra_reminders",
        quantity: rem.quantity,
        price: rem.price,
      });
    }
    if (des) {
      items.push({
        addonType: "design_template",
        type: "design_template",
        templateType: des.type,
        quantity: 1,
        price: des.price,
      });
    }
    onAddonsChange && onAddonsChange(items, total);
  };

  const setInv = (tier) => {
    setExtraInvites(tier);
    notify(tier, extraReminders, designTemplate);
  };
  const setRem = (tier) => {
    setExtraReminders(tier);
    notify(extraInvites, tier, designTemplate);
  };
  const setDes = (tier) => {
    setDesignTemplate(tier);
    notify(extraInvites, extraReminders, tier);
  };

  const designLabel = (tier) =>
    t(`addons.designTypes.${tier.type}`, isAr ? tier.nameAr : tier.nameEn);

  if (isLoading) {
    return (
      <div className={styles.addonsSection}>
        <h3 className={styles.addonsTitle}>{t("addons.title")}</h3>
        <p className={styles.addonsSubtitle}>{t("addons.loading", { defaultValue: "..." })}</p>
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className={styles.addonsSection}>
        <h3 className={styles.addonsTitle}>{t("addons.title")}</h3>
        <p className={styles.addonsSubtitle}>
          {t("addons.loadFailed", { defaultValue: "Could not load add-ons." })}
        </p>
      </div>
    );
  }

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
          {tiers.extraInvites.map((tier) => (
            <button
              key={tier.quantity}
              className={`${styles.tierBtn} ${
                extraInvites?.quantity === tier.quantity ? styles.active : ""
              }`}
              onClick={() =>
                setInv(extraInvites?.quantity === tier.quantity ? null : tier)
              }
            >
              +{tier.quantity}
              <span className={styles.tierPrice}>
                {tier.price} {t("common.currency.sar", { defaultValue: isAr ? "ر.س" : "SAR" })}
              </span>
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
          {tiers.extraReminders.map((tier) => (
            <button
              key={tier.quantity}
              className={`${styles.tierBtn} ${
                extraReminders?.quantity === tier.quantity ? styles.active : ""
              }`}
              onClick={() =>
                setRem(extraReminders?.quantity === tier.quantity ? null : tier)
              }
            >
              +{tier.quantity}
              <span className={styles.tierPrice}>
                {tier.price} {t("common.currency.sar", { defaultValue: isAr ? "ر.س" : "SAR" })}
              </span>
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
          {tiers.designTemplate.map((tier) => (
            <button
              key={tier.type}
              className={`${styles.templateBtn} ${
                designTemplate?.type === tier.type ? styles.active : ""
              }`}
              onClick={() =>
                setDes(designTemplate?.type === tier.type ? null : tier)
              }
            >
              <span>{designLabel(tier)}</span>
              <span className={styles.tierPrice}>
                {tier.price} {t("common.currency.sar", { defaultValue: isAr ? "ر.س" : "SAR" })}
              </span>
              {designTemplate?.type === tier.type && (
                <FaCheck className={styles.checkIcon} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddonsSection;

"use client";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaPaperPlane, FaBell, FaPalette, FaCheck, FaTimes } from "react-icons/fa";
import { useAvailableAddons } from "@/hooks/addons";
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
  const catalog = catalogResponse?.data || null;

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

  const selectedCount =
    (extraInvites ? 1 : 0) + (extraReminders ? 1 : 0) + (designTemplate ? 1 : 0);
  const total =
    (extraInvites?.price || 0) +
    (extraReminders?.price || 0) +
    (designTemplate?.price || 0);

  const notify = (inv, rem, des) => {
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
    const sum = (inv?.price || 0) + (rem?.price || 0) + (des?.price || 0);
    onAddonsChange?.(items, sum);
  };

  const toggleInv = (tier) => {
    const next = extraInvites?.quantity === tier.quantity ? null : tier;
    setExtraInvites(next);
    notify(next, extraReminders, designTemplate);
  };
  const toggleRem = (tier) => {
    const next = extraReminders?.quantity === tier.quantity ? null : tier;
    setExtraReminders(next);
    notify(extraInvites, next, designTemplate);
  };
  const toggleDes = (tier) => {
    const next = designTemplate?.type === tier.type ? null : tier;
    setDesignTemplate(next);
    notify(extraInvites, extraReminders, next);
  };

  const clearAll = () => {
    setExtraInvites(null);
    setExtraReminders(null);
    setDesignTemplate(null);
    onAddonsChange?.([], 0);
  };

  if (isLoading) {
    return (
      <section className={styles.section} aria-busy="true">
        <SectionHeader t={t} selectedCount={0} total={0} />
        <div className={styles.skeletonGrid}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      </section>
    );
  }

  if (error || !catalog) {
    return (
      <section className={styles.section}>
        <SectionHeader t={t} selectedCount={0} total={0} />
        <div className={styles.errorState} role="alert">
          <FaTimes className={styles.errorIcon} aria-hidden="true" />
          <p>{t("addons.loadFailed", { defaultValue: "Could not load add-ons." })}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <SectionHeader
        t={t}
        selectedCount={selectedCount}
        total={total}
        onClear={clearAll}
      />

      <div className={styles.grid}>
        <AddonCard
          icon={<FaPaperPlane />}
          iconClass={styles.iconInvites}
          title={t("addons.extraInvites.title")}
          description={t("addons.extraInvites.description")}
          isActive={!!extraInvites}
          activePrice={extraInvites?.price}
          t={t}
        >
          <div className={styles.tierGrid}>
            {tiers.extraInvites.map((tier) => (
              <TierTile
                key={tier.quantity}
                active={extraInvites?.quantity === tier.quantity}
                onClick={() => toggleInv(tier)}
                quantity={tier.quantity}
                price={tier.price}
                t={t}
              />
            ))}
          </div>
        </AddonCard>

        <AddonCard
          icon={<FaBell />}
          iconClass={styles.iconReminders}
          title={t("addons.extraReminders.title")}
          description={t("addons.extraReminders.description")}
          isActive={!!extraReminders}
          activePrice={extraReminders?.price}
          t={t}
        >
          <div className={styles.tierGrid}>
            {tiers.extraReminders.map((tier) => (
              <TierTile
                key={tier.quantity}
                active={extraReminders?.quantity === tier.quantity}
                onClick={() => toggleRem(tier)}
                quantity={tier.quantity}
                price={tier.price}
                t={t}
              />
            ))}
          </div>
        </AddonCard>
      </div>

      <AddonCard
        wide
        icon={<FaPalette />}
        iconClass={styles.iconDesign}
        title={t("addons.designTemplate.title")}
        description={t("addons.designTemplate.description")}
        isActive={!!designTemplate}
        activePrice={designTemplate?.price}
        t={t}
      >
        <div className={styles.designList}>
          {tiers.designTemplate.map((tier) => {
            const active = designTemplate?.type === tier.type;
            const label = t(
              `addons.designTypes.${tier.type}`,
              isAr ? tier.nameAr : tier.nameEn
            );
            return (
              <button
                key={tier.type}
                type="button"
                className={`${styles.designRow} ${active ? styles.designRowActive : ""}`}
                onClick={() => toggleDes(tier)}
                aria-pressed={active}
              >
                <span className={styles.designRadio} aria-hidden="true">
                  {active ? <FaCheck /> : null}
                </span>
                <span className={styles.designName}>{label}</span>
                <span className={styles.designPrice}>
                  {tier.price}
                  <small>{t("common.currency.sar")}</small>
                </span>
              </button>
            );
          })}
        </div>
      </AddonCard>
    </section>
  );
};

const SectionHeader = ({ t, selectedCount, total, onClear }) => (
  <header className={styles.sectionHead}>
    <div className={styles.sectionHeadText}>
      <h3 className={styles.sectionTitle}>{t("addons.title")}</h3>
      <p className={styles.sectionSubtitle}>{t("addons.subtitle")}</p>
    </div>
    {selectedCount > 0 ? (
      <div className={styles.summaryChip}>
        <span className={styles.summaryCount}>
          {t("addons.selectedCount", {
            count: selectedCount,
            defaultValue: `${selectedCount} selected`,
          })}
        </span>
        <span className={styles.summaryDivider} aria-hidden="true" />
        <span className={styles.summaryTotal}>
          {total}
          <small>{t("common.currency.sar")}</small>
        </span>
        {onClear ? (
          <button
            type="button"
            className={styles.summaryClear}
            onClick={onClear}
            aria-label={t("addons.clearAll", { defaultValue: "Clear all" })}
          >
            <FaTimes />
          </button>
        ) : null}
      </div>
    ) : null}
  </header>
);

const AddonCard = ({
  icon,
  iconClass,
  title,
  description,
  isActive,
  activePrice,
  children,
  wide,
  t,
}) => (
  <article
    className={`${styles.card} ${isActive ? styles.cardActive : ""} ${wide ? styles.cardWide : ""}`}
  >
    <header className={styles.cardHead}>
      <span className={`${styles.iconBadge} ${iconClass}`} aria-hidden="true">
        {icon}
      </span>
      <div className={styles.cardHeadText}>
        <h4 className={styles.cardTitle}>{title}</h4>
        <p className={styles.cardDesc}>{description}</p>
      </div>
      {isActive && activePrice != null ? (
        <span className={styles.selectedChip} aria-hidden="true">
          <FaCheck />
          {activePrice}
          <small>{t("common.currency.sar")}</small>
        </span>
      ) : null}
    </header>
    {children}
  </article>
);

const TierTile = ({ active, onClick, quantity, price, t }) => (
  <button
    type="button"
    className={`${styles.tile} ${active ? styles.tileActive : ""}`}
    onClick={onClick}
    aria-pressed={active}
  >
    <span className={styles.tileQty}>+{quantity}</span>
    <span className={styles.tilePrice}>
      {price}
      <small>{t("common.currency.sar")}</small>
    </span>
  </button>
);

export default AddonsSection;

"use client";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaPaperPlane, FaPalette, FaCheck, FaTimes, FaInfoCircle } from "react-icons/fa";
import { useAvailableAddons } from "@/hooks/addons";
import styles from "./AddonsSection.module.css";

/**
 * Addon picker. Selections are bubbled up via `onAddonsChange` — purchases
 * happen inside the bundled checkout (Summary → useCheckout). This component
 * never calls the addons-purchase endpoint directly.
 *
 * Extra invites STACK: the user can select multiple tiers and they add up.
 * `extraInvites` is therefore an array of selected tier objects
 * (`[{ quantity, price }]`); each becomes its own `extra_invites` line item.
 */
const AddonsSection = ({ onAddonsChange }) => {
  const { t, i18n } = useTranslation("plans");
  const isAr = i18n.language === "ar";

  const { data: catalogResponse, isLoading, error } = useAvailableAddons();
  const catalog = catalogResponse?.data || null;

  const tiers = useMemo(
    () => ({
      extraInvites: catalog?.extra_invites || [],
      designTemplate: catalog?.design_template || [],
    }),
    [catalog]
  );

  // Stacked: array of selected extra-invite tiers ([{ quantity, price }]).
  const [extraInvites, setExtraInvites] = useState([]);
  const [designTemplate, setDesignTemplate] = useState(null);

  const extraInvitesTotal = extraInvites.reduce(
    (sum, tier) => sum + (tier.price || 0),
    0
  );
  const extraInvitesQuantity = extraInvites.reduce(
    (sum, tier) => sum + (tier.quantity || 0),
    0
  );

  const selectedCount = extraInvites.length + (designTemplate ? 1 : 0);
  const total = extraInvitesTotal + (designTemplate?.price || 0);

  const notify = (invList, des) => {
    const items = invList.map((inv) => ({
      addonType: "extra_invites",
      type: "extra_invites",
      quantity: inv.quantity,
      price: inv.price,
    }));
    if (des) {
      items.push({
        addonType: "design_template",
        type: "design_template",
        templateType: des.type,
        quantity: 1,
        price: des.price,
      });
    }
    const sum =
      invList.reduce((s, inv) => s + (inv.price || 0), 0) + (des?.price || 0);
    onAddonsChange?.(items, sum);
  };

  // Add or remove a tier from the stack (toggles each tier independently).
  const toggleInv = (tier) => {
    const exists = extraInvites.some((sel) => sel.quantity === tier.quantity);
    const next = exists
      ? extraInvites.filter((sel) => sel.quantity !== tier.quantity)
      : [...extraInvites, { quantity: tier.quantity, price: tier.price }];
    setExtraInvites(next);
    notify(next, designTemplate);
  };
  const toggleDes = (tier) => {
    const next = designTemplate?.type === tier.type ? null : tier;
    setDesignTemplate(next);
    notify(extraInvites, next);
  };

  const clearAll = () => {
    setExtraInvites([]);
    setDesignTemplate(null);
    onAddonsChange?.([], 0);
  };

  if (isLoading) {
    return (
      <section className={styles.section} aria-busy="true">
        <SectionHeader t={t} />
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
        <SectionHeader t={t} />
        <div className={styles.errorState} role="alert">
          <FaTimes className={styles.errorIcon} aria-hidden="true" />
          <p>{t("addons.loadFailed", { defaultValue: "Could not load add-ons." })}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <SectionHeader t={t} />

      <div className={styles.grid}>
        <AddonCard
          icon={<FaPaperPlane />}
          iconClass={styles.iconInvites}
          title={t("addons.extraInvites.title")}
          description={t("addons.extraInvites.description")}
          isActive={extraInvites.length > 0}
          activePrice={extraInvites.length > 0 ? extraInvitesTotal : null}
          t={t}
        >
          <div className={styles.tierGrid}>
            {tiers.extraInvites.map((tier) => (
              <TierTile
                key={tier.quantity}
                active={extraInvites.some((sel) => sel.quantity === tier.quantity)}
                onClick={() => toggleInv(tier)}
                quantity={tier.quantity}
                price={tier.price}
                t={t}
              />
            ))}
          </div>
          <p className={styles.cardHint}>
            <FaInfoCircle className={styles.cardHintIcon} aria-hidden="true" />
            {extraInvites.length > 0
              ? t("addons.extraInvites.stackHintSelected", {
                  count: extraInvitesQuantity,
                  defaultValue: `Stacked: +${extraInvitesQuantity} extra invites. Extra invite packages don't earn compensation.`,
                })
              : t("addons.extraInvites.stackHint", {
                  defaultValue:
                    "Select multiple packages to stack them — they add up. Extra invite packages don't earn compensation.",
                })}
          </p>
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

      <SummaryBar
        t={t}
        selectedCount={selectedCount}
        total={total}
        onClear={clearAll}
      />
    </section>
  );
};

const SectionHeader = ({ t }) => (
  <header className={styles.sectionHead}>
    <div className={styles.sectionHeadText}>
      <h3 className={styles.sectionTitle}>{t("addons.title")}</h3>
      <p className={styles.sectionSubtitle}>{t("addons.subtitle")}</p>
    </div>
  </header>
);

// Selected count + running total, shown at the bottom of the section (just
// above the page's continue button) so the user sees the tally where they act.
const SummaryBar = ({ t, selectedCount, total, onClear }) =>
  selectedCount > 0 ? (
    <div className={styles.summaryBar}>
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
    </div>
  ) : null;

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

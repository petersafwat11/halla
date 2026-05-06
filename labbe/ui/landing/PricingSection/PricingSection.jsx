"use client";
import { useState } from "react";
import Link from "next/link";
import styles from "./pricingSection.module.css";
import { useTranslation } from "react-i18next";

const WA_LINK = "https://wa.me/966500000000";
const COMPENSATION_PCT = 15;

// ─── Host — Per Event ────────────────────────────────────────────────────────
const BASIC_EVENT_TIERS = [
  { invites: 25,  price: 95   },
  { invites: 50,  price: 185  },
  { invites: 75,  price: 270  },
  { invites: 100, price: 350  },
  { invites: 150, price: 525  },
  { invites: 200, price: 700  },
  { invites: 250, price: 875  },
  { invites: 300, price: 1050 },
];

const PREMIUM_EVENT_TIERS = [
  { invites: 25,  price: 120  },
  { invites: 50,  price: 235  },
  { invites: 75,  price: 345  },
  { invites: 100, price: 450  },
  { invites: 150, price: 675  },
  { invites: 200, price: 900  },
  { invites: 250, price: 1125 },
  { invites: 300, price: 1350 },
];

// ─── Host — Monthly Pool ─────────────────────────────────────────────────────
const BASIC_MONTHLY_TIERS = [
  { pool: 100, price: 450  },
  { pool: 150, price: 675  },
  { pool: 200, price: 900  },
  { pool: 250, price: 1125 },
  { pool: 300, price: 1350 },
];

const PREMIUM_MONTHLY_TIERS = [
  { pool: 100, price: 540  },
  { pool: 150, price: 810  },
  { pool: 200, price: 1080 },
  { pool: 250, price: 1350 },
  { pool: 300, price: 1620 },
];

// ─── Business — Per Event ────────────────────────────────────────────────────
const BUSINESS_EVENT_TIERS = [
  { invites: 100, price: 370  },
  { invites: 150, price: 540  },
  { invites: 200, price: 700  },
  { invites: 300, price: 1050 },
  { invites: 400, price: 1400 },
  { invites: 500, price: 1750 },
];

// ─── Business — Pool Plans ───────────────────────────────────────────────────
const BUSINESS_QUARTERLY = { pool: 500,  price: 3500,  days: 90,  templates: 3 };
const BUSINESS_ANNUAL    = { pool: 2000, price: 10000, days: 365, templates: 5 };

// ─── WhatsApp SVG ─────────────────────────────────────────────────────────────
const WaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
    style={{ display: "inline", verticalAlign: "middle", marginInlineEnd: "0.4rem" }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// ─── Reusable feature list ────────────────────────────────────────────────────
function FeatureList({ features }) {
  if (!Array.isArray(features)) return null;
  return (
    <div className={styles.prFeatGrid}>
      {features.map((f, i) => (
        <div key={i} className={styles.prFeatItem}>
          <span className={styles.prFeatCheck}>✓</span>
          <span>{f}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Compensation row ─────────────────────────────────────────────────────────
function CompRow({ count, t }) {
  return (
    <div className={styles.prComp}>
      <span className={styles.prCompIcon}>🎁</span>
      <div>
        <span className={styles.prCompLabel}>{t("pricing.compensationTitle")}</span>
        <span className={styles.prCompVal}>{t("pricing.compensationSingle", { count })}</span>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PricingSection({ lang = "ar" }) {
  const { t } = useTranslation("landing");

  const basicFeatures   = t("pricing.basicFeatures",   { returnObjects: true });
  const premiumFeatures = t("pricing.premiumFeatures",  { returnObjects: true });
  const bizFeatures     = t("pricing.businessFeatures", { returnObjects: true });

  // ── State ──
  const [audience,      setAudience]      = useState("host");
  const [billingType,   setBillingType]   = useState("event");     // event | monthly
  const [selInvites,    setSelInvites]    = useState(50);
  const [selPool,       setSelPool]       = useState(100);
  const [bizType,       setBizType]       = useState("event");     // event | quarterly | annual
  const [selBizInvites, setSelBizInvites] = useState(100);

  const resetToHost     = (next) => { setAudience(next); setBillingType("event"); setBizType("event"); };

  // ── Derived ──
  const currentEventTier    = BASIC_EVENT_TIERS.find(x => x.invites === selInvites)   || BASIC_EVENT_TIERS[1];
  const currentPremiumEvent = PREMIUM_EVENT_TIERS.find(x => x.invites === selInvites) || PREMIUM_EVENT_TIERS[1];
  const currentMonthlyTier  = BASIC_MONTHLY_TIERS.find(x => x.pool === selPool)       || BASIC_MONTHLY_TIERS[0];
  const currentPremiumMonthly = PREMIUM_MONTHLY_TIERS.find(x => x.pool === selPool)   || PREMIUM_MONTHLY_TIERS[0];
  const currentBizEventTier = BUSINESS_EVENT_TIERS.find(x => x.invites === selBizInvites) || BUSINESS_EVENT_TIERS[0];

  const eventComp     = Math.floor(currentEventTier.invites         * COMPENSATION_PCT / 100);
  const premiumEventComp = Math.floor(currentPremiumEvent.invites   * COMPENSATION_PCT / 100);
  const monthlyComp   = Math.floor(currentMonthlyTier.pool          * COMPENSATION_PCT / 100);
  const premiumMonthlyComp = Math.floor(currentPremiumMonthly.pool  * COMPENSATION_PCT / 100);
  const bizEventComp  = Math.floor(currentBizEventTier.invites      * COMPENSATION_PCT / 100);
  const quarterlyComp = Math.floor(BUSINESS_QUARTERLY.pool          * COMPENSATION_PCT / 100);
  const annualComp    = Math.floor(BUSINESS_ANNUAL.pool             * COMPENSATION_PCT / 100);

  return (
    <section id="pricing" className={styles.prRoot}>
      <div className={styles.prInner}>

        {/* ── Header ── */}
        <div className={styles.prHdr}>
          <h2 className={styles.prTitle}>{t("pricing.title")}</h2>
          <p className={styles.prSub}>{t("pricing.sub")}</p>
        </div>

        {/* ── Selector card ── */}
        <div className={styles.prSelector}>

          {/* Row 1 — audience */}
          <div className={styles.prSegWrap}>
            <div className={styles.prSegTrack}>
              <button
                className={`${styles.prSegBtn}${audience === "host" ? ` ${styles.active}` : ""}`}
                onClick={() => resetToHost("host")}
              >
                <span className={styles.prSegIcon}>{t("pricing.tabHostIcon")}</span>
                <span className={styles.prSegBody}>
                  <span className={styles.prSegLabel}>{t("pricing.tabHost")}</span>
                  <span className={styles.prSegSub}>{t("pricing.tabHostSub")}</span>
                </span>
              </button>
              <button
                className={`${styles.prSegBtn}${audience === "business" ? ` ${styles.active}` : ""}`}
                onClick={() => resetToHost("business")}
              >
                <span className={styles.prSegIcon}>{t("pricing.tabEnterpriseIcon")}</span>
                <span className={styles.prSegBody}>
                  <span className={styles.prSegLabel}>{t("pricing.tabEnterprise")}</span>
                  <span className={styles.prSegSub}>{t("pricing.tabEnterpriseSub")}</span>
                </span>
              </button>
            </div>
          </div>

          <div className={styles.prSep} />

          {/* Row 2 — biz type (business only) */}
          {audience === "business" && (
            <div className={styles.prBillRow}>
              <div className={styles.prBillTrack}>
                <button
                  className={`${styles.prBillBtn}${bizType === "event" ? ` ${styles.active}` : ""}`}
                  onClick={() => { setBizType("event"); setSelBizInvites(100); }}
                >
                  {t("pricing.bizEventTab")}
                </button>
                <button
                  className={`${styles.prBillBtn}${bizType === "quarterly" ? ` ${styles.active}` : ""}`}
                  onClick={() => setBizType("quarterly")}
                >
                  {t("pricing.bizQuarterlyTab")}
                </button>
                <button
                  className={`${styles.prBillBtn}${bizType === "annual" ? ` ${styles.active}` : ""}`}
                  onClick={() => setBizType("annual")}
                >
                  {t("pricing.bizAnnualTab")}
                </button>
              </div>
            </div>
          )}

          {/* Row 3 — billing type (host only) */}
          {audience === "host" && (
            <div className={styles.prBillRow}>
              <div className={styles.prBillTrack}>
                <button
                  className={`${styles.prBillBtn}${billingType === "event" ? ` ${styles.active}` : ""}`}
                  onClick={() => { setBillingType("event"); setSelInvites(50); }}
                >
                  {t("pricing.perEventTab")}
                </button>
                <button
                  className={`${styles.prBillBtn}${billingType === "monthly" ? ` ${styles.active}` : ""}`}
                  onClick={() => { setBillingType("monthly"); setSelPool(100); }}
                >
                  {t("pricing.monthlyTab")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            HOST — PER EVENT (Basic + Premium side-by-side)
        ══════════════════════════════════════════════════════════════════════ */}
        {audience === "host" && billingType === "event" && (
          <div className={styles.prGrid}>
            {/* Basic Card */}
            <div className={styles.prCard}>
              <div className={styles.prCardTop}>
                <div>
                  <h3 className={styles.prCardName}>{t("pricing.basic")}</h3>
                </div>
                <div className={styles.prPrice}>
                  <div className={styles.prPriceRow}>
                    <span className={styles.prPriceNum}>{currentEventTier.price.toLocaleString()}</span>
                    <span className={styles.prPriceCur}>{t("pricing.sar")}</span>
                  </div>
                  <span className={styles.prPricePer}>{t("pricing.pricePerEvent")}</span>
                </div>
              </div>

              <div>
                <div className={styles.prGuestLabel}>{t("pricing.selectInvites")}</div>
                <div className={styles.prGuestTrack}>
                  {BASIC_EVENT_TIERS.map(item => (
                    <button
                      key={item.invites}
                      className={`${styles.prGuestBtn}${selInvites === item.invites ? ` ${styles.active}` : ""}`}
                      onClick={() => setSelInvites(item.invites)}
                    >
                      <span className={styles.prGuestNum}>{item.invites}</span>
                      <span className={styles.prGuestUnit}>{t("pricing.inviteUnit")}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.prManaged}>
                <div className={styles.prManagedTextWrap}>
                  <span className={styles.prManagedTitle}>{t("pricing.validDays90")}</span>
                </div>
              </div>

              <div className={styles.prFeatSection}>
                <div className={styles.prFeatTitle}>{t("pricing.featuresTitle")}</div>
                <FeatureList features={basicFeatures} />
              </div>

              <div className={styles.prCardFooter}>
                <CompRow count={eventComp} t={t} />
                <Link href={`/${lang}/signup`} className={styles.prBtn}>{t("pricing.subscribe")}</Link>
              </div>
            </div>

            {/* Premium Card */}
            <div className={`${styles.prCard} ${styles.popular}`}>
              <div className={styles.prPopularBadge}>{t("pricing.premium")}</div>
              <div className={styles.prCardTop}>
                <div>
                  <h3 className={styles.prCardName}>{t("pricing.premium")}</h3>
                </div>
                <div className={styles.prPrice}>
                  <div className={styles.prPriceRow}>
                    <span className={styles.prPriceNum}>{currentPremiumEvent.price.toLocaleString()}</span>
                    <span className={styles.prPriceCur}>{t("pricing.sar")}</span>
                  </div>
                  <span className={styles.prPricePer}>{t("pricing.pricePerEvent")}</span>
                </div>
              </div>

              <div>
                <div className={styles.prGuestLabel}>{t("pricing.selectInvites")}</div>
                <div className={styles.prGuestTrack}>
                  {PREMIUM_EVENT_TIERS.map(item => (
                    <button
                      key={item.invites}
                      className={`${styles.prGuestBtn}${selInvites === item.invites ? ` ${styles.active}` : ""}`}
                      onClick={() => setSelInvites(item.invites)}
                    >
                      <span className={styles.prGuestNum}>{item.invites}</span>
                      <span className={styles.prGuestUnit}>{t("pricing.inviteUnit")}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.prManaged}>
                <div className={styles.prManagedTextWrap}>
                  <span className={styles.prManagedTitle}>{t("pricing.validDays90")}</span>
                </div>
              </div>

              <div className={styles.prFeatSection}>
                <div className={styles.prFeatTitle}>{t("pricing.featuresTitle")}</div>
                <FeatureList features={premiumFeatures} />
              </div>

              <div className={styles.prCardFooter}>
                <CompRow count={premiumEventComp} t={t} />
                <Link href={`/${lang}/signup`} className={styles.prBtn}>{t("pricing.subscribe")}</Link>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            HOST — MONTHLY POOL (Basic + Premium side-by-side)
        ══════════════════════════════════════════════════════════════════════ */}
        {audience === "host" && billingType === "monthly" && (
          <div className={styles.prGrid}>
            {/* Basic Card */}
            <div className={styles.prCard}>
              <div className={styles.prCardTop}>
                <div>
                  <h3 className={styles.prCardName}>{t("pricing.basic")}</h3>
                </div>
                <div className={styles.prPrice}>
                  <div className={styles.prPriceRow}>
                    <span className={styles.prPriceNum}>{currentMonthlyTier.price.toLocaleString()}</span>
                    <span className={styles.prPriceCur}>{t("pricing.sar")}</span>
                  </div>
                  <span className={styles.prPricePer}>{t("pricing.pricePerMonth")}</span>
                </div>
              </div>

              <div>
                <div className={styles.prGuestLabel}>{t("pricing.selectPool")}</div>
                <div className={styles.prGuestTrack}>
                  {BASIC_MONTHLY_TIERS.map(item => (
                    <button
                      key={item.pool}
                      className={`${styles.prGuestBtn}${selPool === item.pool ? ` ${styles.active}` : ""}`}
                      onClick={() => setSelPool(item.pool)}
                    >
                      <span className={styles.prGuestNum}>{item.pool}</span>
                      <span className={styles.prGuestUnit}>{t("pricing.inviteUnit")}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.prManaged}>
                <div className={styles.prManagedTextWrap}>
                  <span className={styles.prManagedTitle}>
                    {t("pricing.unlimitedEvents")} · {t("pricing.validDays30")}
                  </span>
                </div>
              </div>

              <div className={styles.prFeatSection}>
                <div className={styles.prFeatTitle}>{t("pricing.featuresTitle")}</div>
                <FeatureList features={basicFeatures} />
              </div>

              <div className={styles.prCardFooter}>
                <CompRow count={monthlyComp} t={t} />
                <Link href={`/${lang}/signup`} className={styles.prBtn}>{t("pricing.subscribe")}</Link>
              </div>
            </div>

            {/* Premium Card */}
            <div className={`${styles.prCard} ${styles.popular}`}>
              <div className={styles.prPopularBadge}>{t("pricing.premium")}</div>
              <div className={styles.prCardTop}>
                <div>
                  <h3 className={styles.prCardName}>{t("pricing.premium")}</h3>
                </div>
                <div className={styles.prPrice}>
                  <div className={styles.prPriceRow}>
                    <span className={styles.prPriceNum}>{currentPremiumMonthly.price.toLocaleString()}</span>
                    <span className={styles.prPriceCur}>{t("pricing.sar")}</span>
                  </div>
                  <span className={styles.prPricePer}>{t("pricing.pricePerMonth")}</span>
                </div>
              </div>

              <div>
                <div className={styles.prGuestLabel}>{t("pricing.selectPool")}</div>
                <div className={styles.prGuestTrack}>
                  {PREMIUM_MONTHLY_TIERS.map(item => (
                    <button
                      key={item.pool}
                      className={`${styles.prGuestBtn}${selPool === item.pool ? ` ${styles.active}` : ""}`}
                      onClick={() => setSelPool(item.pool)}
                    >
                      <span className={styles.prGuestNum}>{item.pool}</span>
                      <span className={styles.prGuestUnit}>{t("pricing.inviteUnit")}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.prManaged}>
                <div className={styles.prManagedTextWrap}>
                  <span className={styles.prManagedTitle}>
                    {t("pricing.unlimitedEvents")} · {t("pricing.validDays30")}
                  </span>
                </div>
              </div>

              <div className={styles.prFeatSection}>
                <div className={styles.prFeatTitle}>{t("pricing.featuresTitle")}</div>
                <FeatureList features={premiumFeatures} />
              </div>

              <div className={styles.prCardFooter}>
                <CompRow count={premiumMonthlyComp} t={t} />
                <Link href={`/${lang}/signup`} className={styles.prBtn}>{t("pricing.subscribe")}</Link>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            BUSINESS — PER EVENT
        ══════════════════════════════════════════════════════════════════════ */}
        {audience === "business" && bizType === "event" && (
          <div className={styles.prHostCard}>
            <div>
              <div className={styles.prGuestLabel}>{t("pricing.selectInvites")}</div>
              <div className={styles.prGuestTrack}>
                {BUSINESS_EVENT_TIERS.map(item => (
                  <button
                    key={item.invites}
                    className={`${styles.prGuestBtn}${selBizInvites === item.invites ? ` ${styles.active}` : ""}`}
                    onClick={() => setSelBizInvites(item.invites)}
                  >
                    <span className={styles.prGuestNum}>{item.invites}</span>
                    <span className={styles.prGuestUnit}>{t("pricing.inviteUnit")}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.prHostPrice}>
              <span className={styles.prHostPriceNum}>{currentBizEventTier.price.toLocaleString()}</span>
              <span className={styles.prHostPriceCur}>{t("pricing.sar")}</span>
              <span className={styles.prHostPricePer}>{t("pricing.pricePerEvent")}</span>
            </div>

            <div className={styles.prManaged}>
              <div className={styles.prManagedTextWrap}>
                <span className={styles.prManagedTitle}>{t("pricing.setupFeeNote")}</span>
              </div>
            </div>

            <div className={styles.prFeatSection}>
              <div className={styles.prFeatTitle}>{t("pricing.featuresTitle")}</div>
              <FeatureList features={bizFeatures} />
            </div>

            <div className={styles.prCardFooter}>
              <CompRow count={bizEventComp} t={t} />
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className={`${styles.prBtn} ${styles.prBtnDark}`}>
                <WaIcon />{t("pricing.contact")}
              </a>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            BUSINESS — QUARTERLY (500 pool, 90 days, 3500 SAR)
        ══════════════════════════════════════════════════════════════════════ */}
        {audience === "business" && bizType === "quarterly" && (
          <div className={styles.prHostCard}>
            <div className={styles.prHostPrice}>
              <span className={styles.prHostPriceNum}>{BUSINESS_QUARTERLY.price.toLocaleString()}</span>
              <span className={styles.prHostPriceCur}>{t("pricing.sar")}</span>
              <span className={styles.prHostPricePer}>{t("pricing.pricePerQuarter")}</span>
            </div>

            <div className={styles.prManaged}>
              <div className={styles.prManagedTextWrap}>
                <span className={styles.prManagedTitle}>
                  {t("pricing.poolLabel")}: {BUSINESS_QUARTERLY.pool.toLocaleString()} {t("pricing.inviteUnit")}
                  {" · "}{t("pricing.validDays90")}
                  {" · "}{t("pricing.whatsappTemplates", { count: BUSINESS_QUARTERLY.templates })}
                  {" · "}{t("pricing.setupFeeIncluded")}
                </span>
              </div>
            </div>

            <div className={styles.prFeatSection}>
              <div className={styles.prFeatTitle}>{t("pricing.featuresTitle")}</div>
              <FeatureList features={bizFeatures} />
            </div>

            <div className={styles.prCardFooter}>
              <CompRow count={quarterlyComp} t={t} />
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className={`${styles.prBtn} ${styles.prBtnDark}`}>
                <WaIcon />{t("pricing.contact")}
              </a>
            </div>

            <div className={styles.prManaged}>
              <div className={styles.prManagedTextWrap}>
                <span className={styles.prManagedTitle}>{t("pricing.contactNote")}</span>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            BUSINESS — ANNUAL (2000 pool, 365 days, 10000 SAR)
        ══════════════════════════════════════════════════════════════════════ */}
        {audience === "business" && bizType === "annual" && (
          <div className={styles.prHostCard}>
            <div className={styles.prHostPrice}>
              <span className={styles.prHostPriceNum}>{BUSINESS_ANNUAL.price.toLocaleString()}</span>
              <span className={styles.prHostPriceCur}>{t("pricing.sar")}</span>
              <span className={styles.prHostPricePer}>{t("pricing.pricePerYear")}</span>
            </div>

            <div className={styles.prManaged}>
              <div className={styles.prManagedTextWrap}>
                <span className={styles.prManagedTitle}>
                  {t("pricing.poolLabel")}: {BUSINESS_ANNUAL.pool.toLocaleString()} {t("pricing.inviteUnit")}
                  {" · "}{t("pricing.validDays365")}
                  {" · "}{t("pricing.whatsappTemplates", { count: BUSINESS_ANNUAL.templates })}
                  {" · "}{t("pricing.setupFeeIncluded")}
                </span>
              </div>
            </div>

            <div className={styles.prFeatSection}>
              <div className={styles.prFeatTitle}>{t("pricing.featuresTitle")}</div>
              <FeatureList features={bizFeatures} />
            </div>

            <div className={styles.prCardFooter}>
              <CompRow count={annualComp} t={t} />
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className={`${styles.prBtn} ${styles.prBtnDark}`}>
                <WaIcon />{t("pricing.contact")}
              </a>
            </div>

            <div className={styles.prManaged}>
              <div className={styles.prManagedTextWrap}>
                <span className={styles.prManagedTitle}>{t("pricing.contactNote")}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}

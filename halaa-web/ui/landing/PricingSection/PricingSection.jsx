"use client";
import { useState, useMemo, useEffect } from "react";
import styles from "./pricingSection.module.css";
import { useTranslation } from "react-i18next";
import { useLandingPlans } from "@/hooks/plans";
import PlanDescription from "@/ui/plans/PlanDescription/PlanDescription";
import SarIcon from "@/ui/commen/SarIcon/SarIcon";
import PlanCard from "@/ui/plans/PlanCard/PlanCard";
import useCarouselSnap from "../_shared/useCarouselSnap";
import CarouselDots from "../_shared/CarouselDots";
import { formatNumber } from "@halaa/shared/utils/locale";
import { safeJsonLd } from '@halaa/shared/brand';
import { buildLandingSchema, planOffers } from '../landingSchema';
import { planPrice, usablePlanSnapshot, PLAN_REFRESH_SECONDS } from '../landingPlansData';

const WA_LINK = "https://wa.me/966552619282";

const formatPrice = (n, l = "ar") => formatNumber(n || 0, l);

const SarSymbol = () => <SarIcon size="1.5rem" />;

const WaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
    style={{ display: "inline", verticalAlign: "middle", marginInlineEnd: "0.4rem" }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const getInviteValue = (plan, billingType) => {
  if (billingType === "monthly") return plan.invitePool ?? 0;
  return plan.invites ?? 0;
};

const PLAN_CAROUSEL_GAP = 20;
const PLAN_CAROUSEL_ITEMS = 2;

export default function PricingSection({ lang = "ar", initialPlans = null }) {
  const { t } = useTranslation("landing");
  const { t: tPlans } = useTranslation("plans");
  const getTagline = (plan) => {
    const family = plan?.planFamily;
    if (!family) return "";
    return tPlans(`taglines.${family}`, { defaultValue: "" });
  };

  const [now, setNow] = useState(() => Date.now());
  const setupFeeLine = (plan) => plan?.setupFeeAmount > 0
    ? <p className={styles.prCardTagline}>{t('pricing.setupFeeRow', { amount: formatNumber(plan.setupFeeAmount, lang) })}</p>
    : null;
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const { data: landingData, error } = useLandingPlans({
    initialData: initialPlans || undefined,
    initialDataUpdatedAt: initialPlans?.fetchedAt,
    refetchInterval: PLAN_REFRESH_SECONDS * 1000,
  });
  const plans = usablePlanSnapshot(landingData, Math.max(now, landingData?.fetchedAt || 0)) ? landingData.data : null;
  const hostPlans = plans?.host ?? null;
  const businessPlans = plans?.business ?? null;

  const basicEvent = hostPlans?.basic?.event ?? [];
  const basicMonthly = hostPlans?.basic?.monthly ?? [];
  const premiumEvent = hostPlans?.premium?.event ?? [];
  const premiumMonthly = hostPlans?.premium?.monthly ?? [];
  const bizEventPlans = businessPlans?.event ?? [];
  const bizQuarterlyPlans = businessPlans?.quarterly ?? [];
  const bizAnnualPlans = businessPlans?.annual ?? [];

  const hasHostEvent = basicEvent.length > 0 || premiumEvent.length > 0;
  const hasHostMonthly = basicMonthly.length > 0 || premiumMonthly.length > 0;
  const hasHost = hasHostEvent || hasHostMonthly;
  const hasBusiness = bizEventPlans.length > 0 || bizQuarterlyPlans.length > 0 || bizAnnualPlans.length > 0;

  const [audience, setAudience] = useState(!hasHost && hasBusiness ? 'business' : 'host');
  const [billingType, setBillingType] = useState(hasHostEvent ? 'event' : 'monthly');
  const [selInvites, setSelInvites] = useState(null);
  const [selPool, setSelPool] = useState(null);
  const [bizType, setBizType] = useState(bizEventPlans.length ? 'event' : bizQuarterlyPlans.length ? 'quarterly' : 'annual');
  const [selBizInvites, setSelBizInvites] = useState(null);

  const resetToHost = (next) => { setAudience(next); };

  useEffect(() => {
    if (!hasHost && hasBusiness) setAudience("business");
    else if (hasHost) setAudience("host");
  }, [hasHost, hasBusiness]);

  useEffect(() => {
    if (billingType === 'event' && !hasHostEvent && hasHostMonthly) setBillingType('monthly');
    if (billingType === 'monthly' && !hasHostMonthly && hasHostEvent) setBillingType('event');
    const available = { event: bizEventPlans.length, quarterly: bizQuarterlyPlans.length, annual: bizAnnualPlans.length };
    if (!available[bizType]) setBizType(available.event ? 'event' : available.quarterly ? 'quarterly' : 'annual');
  }, [billingType, hasHostEvent, hasHostMonthly, bizType, bizEventPlans.length, bizQuarterlyPlans.length, bizAnnualPlans.length]);

  useEffect(() => {
    const ref = basicEvent[0];
    if (ref && selInvites === null) setSelInvites(getInviteValue(ref, "event"));
  }, [basicEvent]);

  useEffect(() => {
    const ref = basicMonthly[0];
    if (ref && selPool === null) setSelPool(getInviteValue(ref, "monthly"));
  }, [basicMonthly]);

  useEffect(() => {
    const ref = bizEventPlans[0];
    if (ref && selBizInvites === null) setSelBizInvites(getInviteValue(ref, "event"));
  }, [bizEventPlans]);

  const currentHostEventPlan = useMemo(() =>
    basicEvent.find((p) => getInviteValue(p, "event") === selInvites) || basicEvent[0] || null,
    [basicEvent, selInvites]
  );
  const currentPremiumEventPlan = useMemo(() =>
    premiumEvent.find((p) => getInviteValue(p, "event") === selInvites) || premiumEvent[0] || null,
    [premiumEvent, selInvites]
  );
  const currentHostMonthlyPlan = useMemo(() =>
    basicMonthly.find((p) => getInviteValue(p, "monthly") === selPool) || basicMonthly[0] || null,
    [basicMonthly, selPool]
  );
  const currentPremiumMonthlyPlan = useMemo(() =>
    premiumMonthly.find((p) => getInviteValue(p, "monthly") === selPool) || premiumMonthly[0] || null,
    [premiumMonthly, selPool]
  );
  const currentBizEventPlan = useMemo(() =>
    bizEventPlans.find((p) => getInviteValue(p, "event") === selBizInvites) || bizEventPlans[0] || null,
    [bizEventPlans, selBizInvites]
  );

  const bizQuarterlyPlan = bizQuarterlyPlans[0] || null;
  const bizAnnualPlan = bizAnnualPlans[0] || null;
  // Describe exactly the cards rendered for the current audience, billing
  // period and invitation selection, using the same server/query snapshot.
  const visiblePlans = audience === 'host'
    ? (billingType === 'event'
      ? [currentHostEventPlan, currentPremiumEventPlan]
      : [currentHostMonthlyPlan, currentPremiumMonthlyPlan])
    : [bizType === 'event' ? currentBizEventPlan : bizType === 'quarterly' ? bizQuarterlyPlan : bizAnnualPlan];
  const schema = <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(buildLandingSchema({
    lang, faq: t('faq.items', { returnObjects: true }), offers: planOffers(visiblePlans, lang),
  })) }} />;

  const { trackRef, idx, maxIdx, scrollToIdx, goPrev, goNext, handleScroll } = useCarouselSnap({
    gap: PLAN_CAROUSEL_GAP,
    totalItems: PLAN_CAROUSEL_ITEMS,
  });

  if ((error && !plans) || (!hasHost && !hasBusiness)) {
    return (
      <section id="pricing" className={styles.prRoot}>
        {schema}
        <div className={styles.prInner}>
          <div className={styles.prHdr}>
            <h2 className={styles.prTitle}>{t("pricing.title")}</h2>
          </div>
          <p role="status">{t('pricing.unavailable')}</p>
          <a href={WA_LINK} className={`${styles.prBtn} ${styles.prBtnDark}`}>{t('pricing.contact')}</a>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className={styles.prRoot}>
      {schema}
      <div className={styles.prInner}>

        <div className={styles.prHdr}>
          <h2 className={styles.prTitle}>{t("pricing.title")}</h2>
        </div>
        {(error || now - landingData.fetchedAt > PLAN_REFRESH_SECONDS * 1000) && <p role="status">{t('pricing.refreshUnavailable')}</p>}

        <div className={styles.prSelector}>

          <div className={styles.prSegWrap}>
            <div className={styles.prSegTrack}>
              {hasHost && (
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
              )}
              {hasBusiness && (
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
              )}
            </div>
          </div>

          <div className={styles.prSep} />

          {audience === "business" && (
            <div className={styles.prBillRow}>
              <div className={styles.prBillTrack}>
                {bizEventPlans.length > 0 && (
                  <button
                    className={`${styles.prBillBtn}${bizType === "event" ? ` ${styles.active}` : ""}`}
                    onClick={() => setBizType("event")}
                  >
                    {t("pricing.bizEventTab")}
                  </button>
                )}
                {bizQuarterlyPlans.length > 0 && (
                  <button
                    className={`${styles.prBillBtn}${bizType === "quarterly" ? ` ${styles.active}` : ""}`}
                    onClick={() => setBizType("quarterly")}
                  >
                    {t("pricing.bizQuarterlyTab")}
                  </button>
                )}
                {bizAnnualPlans.length > 0 && (
                  <button
                    className={`${styles.prBillBtn}${bizType === "annual" ? ` ${styles.active}` : ""}`}
                    onClick={() => setBizType("annual")}
                  >
                    {t("pricing.bizAnnualTab")}
                  </button>
                )}
              </div>
            </div>
          )}

          {audience === "host" && (
            <div className={styles.prBillRow}>
              <div className={styles.prBillTrack}>
                <button
                  className={`${styles.prBillBtn}${billingType === "event" ? ` ${styles.active}` : ""}`}
                  disabled={!hasHostEvent}
                  onClick={() => setBillingType("event")}
                >
                  {t("pricing.perEventTab")}
                </button>
                <button
                  className={`${styles.prBillBtn}${billingType === "monthly" ? ` ${styles.active}` : ""}`}
                  disabled={!hasHostMonthly}
                  onClick={() => setBillingType("monthly")}
                >
                  {t("pricing.monthlyTab")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══ HOST — PER EVENT (Basic + Premium side-by-side) ═══ */}
        {audience === "host" && billingType === "event" && (
          <div className={styles.carouselWrapper}>
            <div className={styles.prGrid} ref={trackRef} onScroll={handleScroll}>
              {currentHostEventPlan && <PlanCard
                planFamily="basic"
                matchedPlan={currentHostEventPlan}
                plans={basicEvent}
                billingType="event"
                selectedInvites={selInvites}
                onInviteChange={setSelInvites}
                lang={lang}
                ctaLabel={t("pricing.subscribe")}
                ctaHref={`/${lang}/signup`}
              />}
              {currentPremiumEventPlan && <PlanCard
                planFamily="premium"
                matchedPlan={currentPremiumEventPlan}
                plans={premiumEvent}
                billingType="event"
                selectedInvites={selInvites}
                onInviteChange={setSelInvites}
                isPopular
                lang={lang}
                ctaLabel={t("pricing.subscribe")}
                ctaHref={`/${lang}/signup`}
              />}
            </div>
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
          </div>
        )}

        {/* ═══ HOST — MONTHLY POOL (Basic + Premium side-by-side) ═══ */}
        {audience === "host" && billingType === "monthly" && (
          <div className={styles.carouselWrapper}>
            <div className={styles.prGrid} ref={trackRef} onScroll={handleScroll}>
              {currentHostMonthlyPlan && <PlanCard
                planFamily="basic"
                matchedPlan={currentHostMonthlyPlan}
                plans={basicMonthly}
                billingType="monthly"
                selectedInvites={selPool}
                onInviteChange={setSelPool}
                lang={lang}
                ctaLabel={t("pricing.subscribe")}
                ctaHref={`/${lang}/signup`}
              />}
              {currentPremiumMonthlyPlan && <PlanCard
                planFamily="premium"
                matchedPlan={currentPremiumMonthlyPlan}
                plans={premiumMonthly}
                billingType="monthly"
                selectedInvites={selPool}
                onInviteChange={setSelPool}
                isPopular
                lang={lang}
                ctaLabel={t("pricing.subscribe")}
                ctaHref={`/${lang}/signup`}
              />}
            </div>
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
          </div>
        )}

        {/* ═══ BUSINESS — PER EVENT ═══ */}
        {audience === "business" && bizType === "event" && currentBizEventPlan && (
          <div className={styles.prHostCard}>
            <div className={styles.prHostCardTop}>
              <div className={styles.prHostPrice}>
                <span className={styles.prHostPriceNum}>{formatPrice(planPrice(currentBizEventPlan), lang)}</span>
                <SarSymbol />
              </div>
              {getTagline(currentBizEventPlan) ? (
                <p className={styles.prCardTagline}>{getTagline(currentBizEventPlan)}</p>
              ) : null}
            </div>

            <div className={styles.prGuestTrack}>
              {bizEventPlans.map((plan) => {
                const v = getInviteValue(plan, "event");
                return (
                  <button
                    key={plan.code}
                    className={`${styles.prGuestBtn}${selBizInvites === v ? ` ${styles.active}` : ""}`}
                    onClick={() => setSelBizInvites(v)}
                  >
                    <span className={styles.prGuestNum}>{v}</span>
                    <span className={styles.prGuestUnit}>{t("pricing.inviteUnit")}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.prFeatSection}>
              {setupFeeLine(currentBizEventPlan)}
              <PlanDescription
                plan={currentBizEventPlan}
                lang={lang}
                selectedInviteCount={selBizInvites}
                showTagline={false}
                showDuration={false}
                size="large"
                inlineExtras
              />
            </div>

            <div className={styles.prCardFooter}>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className={`${styles.prBtn} ${styles.prBtnDark}`}>
                <WaIcon />{t("pricing.contact")}
              </a>
            </div>
          </div>
        )}

        {/* ═══ BUSINESS — QUARTERLY ═══ */}
        {audience === "business" && bizType === "quarterly" && bizQuarterlyPlan && (
          <div className={styles.prHostCard}>
            <div className={styles.prHostCardTop}>
              <div className={styles.prHostPrice}>
                <span className={styles.prHostPriceNum}>{formatPrice(planPrice(bizQuarterlyPlan), lang)}</span>
                <SarSymbol />
              </div>
              {getTagline(bizQuarterlyPlan) ? (
                <p className={styles.prCardTagline}>{getTagline(bizQuarterlyPlan)}</p>
              ) : null}
            </div>

            <div className={styles.prFeatSection}>
              {setupFeeLine(bizQuarterlyPlan)}
              <PlanDescription plan={bizQuarterlyPlan} lang={lang} showTagline={false} showDuration={false} size="large" inlineExtras />
            </div>

            <div className={styles.prCardFooter}>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className={`${styles.prBtn} ${styles.prBtnDark}`}>
                <WaIcon />{t("pricing.contact")}
              </a>
            </div>
          </div>
        )}

        {/* ═══ BUSINESS — ANNUAL ═══ */}
        {audience === "business" && bizType === "annual" && bizAnnualPlan && (
          <div className={styles.prHostCard}>
            <div className={styles.prHostCardTop}>
              <div className={styles.prHostPrice}>
                <span className={styles.prHostPriceNum}>{formatPrice(planPrice(bizAnnualPlan), lang)}</span>
                <SarSymbol />
              </div>
              {getTagline(bizAnnualPlan) ? (
                <p className={styles.prCardTagline}>{getTagline(bizAnnualPlan)}</p>
              ) : null}
            </div>

            <div className={styles.prFeatSection}>
              {setupFeeLine(bizAnnualPlan)}
              <PlanDescription plan={bizAnnualPlan} lang={lang} showTagline={false} showDuration={false} size="large" inlineExtras />
            </div>

            <div className={styles.prCardFooter}>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className={`${styles.prBtn} ${styles.prBtnDark}`}>
                <WaIcon />{t("pricing.contact")}
              </a>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}

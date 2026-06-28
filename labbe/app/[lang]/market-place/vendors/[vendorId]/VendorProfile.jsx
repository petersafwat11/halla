"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Facebook, FileText, Globe2, Instagram, Link2, Mail, MapPin,
  MessageCircle, Phone, Star, Twitter,
} from "lucide-react";
import { buildVendorContactMessage, buildWhatsAppUrl } from "@halla/shared/utils/marketplace";
import en from "@/localization/locales/en/marketplace.json";
import ar from "@/localization/locales/ar/marketplace.json";
import ShareButton from "./ShareButton";
import ReportVendorButton from "./ReportVendorButton";
import SafeImage from "./SafeImage";
import styles from "./page.module.css";

const SOCIAL_ICONS = { instagram: Instagram, facebook: Facebook, twitter: Twitter };

const isSafeUrl = (value) => {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
};

// "https://www.ebdaastudio.com" → "www.ebdaastudio.com"
const displayHost = (value) => {
  try { return new URL(value).hostname; } catch { return value; }
};

// "https://instagram.com/ebdaastudio" → "@ebdaastudio"; falls back to host.
const displayHandle = (value) => {
  try {
    const url = new URL(value);
    const segment = url.pathname.split("/").filter(Boolean).pop();
    return segment ? `@${segment}` : url.hostname;
  } catch { return value; }
};

/**
 * Presentational public vendor profile. Data fetching, metadata and JSON-LD
 * stay in the server page; this renders the reference layout:
 * hero → [about | contact] → full-width services → full-width portfolio.
 */
export default function VendorProfile({
  vendor,
  lang,
  vendorUrl,
  marketplaceHref = `/${lang}/market-place`,
}) {
  const copy = lang === "ar" ? ar : en;
  const rtl = lang === "ar";
  const BackIcon = rtl ? ArrowRight : ArrowLeft;

  const locationData = vendor.location || vendor.serviceLocation;
  const district = locationData?.districtNames?.[0];
  const location = [
    rtl ? district?.nameAr : district?.nameEn,
    rtl ? locationData?.cityNameAr : locationData?.cityNameEn,
    rtl ? locationData?.regionNameAr : locationData?.regionNameEn,
  ].filter(Boolean).join("، ");

  const categoryNames = (vendor.categories || []).map((key) => copy.sections?.[key] || key);
  const contact = vendor.contact || {};
  const services = vendor.services || [];
  const portfolio = vendor.portfolio || [];

  const vendorMessage = buildVendorContactMessage({ language: lang, vendorName: vendor.brandName, vendorUrl });
  const whatsapp = buildWhatsAppUrl(contact.whatsapp, vendorMessage);
  const telHref = contact.phone ? `tel:${contact.phone}` : null;
  const primaryFallback = telHref || (contact.email ? `mailto:${contact.email}` : vendor.socialLinks?.website || null);
  const initial = vendor.brandName?.charAt(0);
  const websiteUrl = vendor.socialLinks?.website && isSafeUrl(vendor.socialLinks.website) ? vendor.socialLinks.website : null;
  const socialEntries = Object.entries(vendor.socialLinks || {}).filter(([key, value]) => key !== "website" && value && isSafeUrl(value));
  const displayPhone = contact.phone ? (contact.phone.startsWith("+") ? contact.phone : `+${contact.phone}`) : null;

  return (
    <main className={styles.page} dir={rtl ? "rtl" : "ltr"}>
      <div className={styles.topbar}>
        <Link href={marketplaceHref} className={styles.backLink}><BackIcon size={18} />{copy.vendor?.backToMarketplace}</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ShareButton label={copy.vendor?.share} copiedLabel={copy.vendor?.linkCopied} title={vendor.brandName} />
          <ReportVendorButton vendorId={vendor.id || vendor._id} lang={lang} label={copy.vendor?.report} />
        </div>
      </div>

      <section className={styles.hero}>
        <SafeImage src={vendor.heroImage || vendor.coverImage} alt={vendor.brandName} fill priority sizes="(max-width: 1280px) 100vw, 1240px" className={styles.coverImage} fallbackClassName={styles.coverFallback} fallbackText="" />
        <div className={styles.coverShade} />
        <div className={styles.heroInner}>
          <div className={styles.heroLogo}>
            <SafeImage src={vendor.logo} alt={`${vendor.brandName} logo`} fill sizes="120px" fallbackClassName={styles.logoFallback} fallbackText={initial} />
          </div>
          <div className={styles.heroText}>
            <h1>{vendor.brandName}</h1>
            {vendor.tagline && <p className={styles.heroTagline}>{vendor.tagline}</p>}
            <div className={styles.heroMeta}>
              {vendor.rating ? <span className={styles.heroRating}><Star size={15} fill="currentColor" />{Number(vendor.rating).toFixed(1)}</span> : null}
              {categoryNames.slice(0, 2).map((name) => <span key={name} className={styles.heroChip}>{name}</span>)}
              {location && <span className={styles.heroChip}><MapPin size={14} />{location}</span>}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.infoCard}>
        <div className={styles.aboutBlock}>
          <p className={styles.kicker}>{copy.vendor?.aboutVendor}</p>
          <h2>{copy.vendor?.meetVendor?.replace("{{name}}", vendor.brandName)}</h2>
          <p className={styles.about}>{vendor.about || vendor.tagline}</p>
        </div>

        <div className={styles.contactBlock}>
          <div className={styles.contactHead}>
            <h3>{copy.vendor?.contactHeadline}</h3>
            <p className={styles.contactIntro}>{copy.vendor?.contactDescription}</p>
          </div>
          <div className={styles.primaryActions}>
            {whatsapp && <a className={styles.waButton} href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={18} />{copy.vendor?.whatsapp}</a>}
            {telHref && <a className={styles.callButton} href={telHref}><Phone size={18} />{copy.card?.callNow}</a>}
            {whatsapp && <a className={styles.quoteButton} href={whatsapp} target="_blank" rel="noreferrer"><FileText size={17} />{copy.vendor?.requestQuote}</a>}
            {!whatsapp && !telHref && contact.email && <a className={styles.callButton} href={`mailto:${contact.email}`}><Mail size={18} />{contact.email}</a>}
          </div>
          <div className={styles.contactLinks}>
            {displayPhone && <a href={telHref}><Phone size={18} /><span dir="ltr">{displayPhone}</span></a>}
            {contact.email && <a href={`mailto:${contact.email}`}><Mail size={18} /><span dir="ltr">{contact.email}</span></a>}
            {websiteUrl && <a href={websiteUrl} target="_blank" rel="noreferrer"><Globe2 size={18} /><span dir="ltr">{displayHost(websiteUrl)}</span></a>}
            {socialEntries.map(([key, value]) => {
              const Icon = SOCIAL_ICONS[key] || Link2;
              return <a key={key} href={value} target="_blank" rel="noreferrer"><Icon size={18} /><span dir="ltr">{displayHandle(value)}</span></a>;
            })}
          </div>
          {location && <p className={styles.coverage}><MapPin size={16} />{location}</p>}
        </div>
      </section>

      <section className={styles.block}>
        <div className={styles.blockHead}>
          <div><p className={styles.kicker}>{copy.vendor?.ourServices}</p><h2>{copy.vendor?.servicesHeadline}</h2></div>
          {services.length > 0 && <span className={styles.countBadge}>{services.length}</span>}
        </div>
        {services.length ? (
          <div className={styles.servicesGrid}>
            {services.map((service) => {
              const name = rtl ? service.nameAr || service.name : service.name || service.nameAr;
              const description = rtl ? service.descriptionAr || service.description : service.description || service.descriptionAr;
              const message = buildVendorContactMessage({ language: lang, vendorName: vendor.brandName, serviceName: name, price: service.price, currency: service.currency, vendorUrl });
              const contactHref = buildWhatsAppUrl(contact.whatsapp, message) || primaryFallback;
              return (
                <article key={service.id} className={styles.serviceCard}>
                  <div className={styles.serviceImageWrap}>
                    <SafeImage src={service.image} alt={name} fill sizes="(max-width: 700px) 100vw, 360px" fallbackClassName={styles.serviceFallback} fallbackText={name?.charAt(0)} />
                  </div>
                  <div className={styles.serviceBody}>
                    <span className={styles.serviceCategory}>{copy.sections?.[service.category] || service.category}</span>
                    <h3>{name}</h3>
                    {description && <p>{description}</p>}
                    {service.tags?.length > 0 && <div className={styles.serviceTags}>{service.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>}
                    <div className={styles.serviceFooter}>
                      <div className={styles.servicePrice}>
                        {service.price != null ? (
                          <>
                            <span>{copy.vendor?.startsFrom}</span>
                            <strong>{service.price} {service.currency}</strong>
                          </>
                        ) : <strong>{copy.card?.priceOnRequest}</strong>}
                      </div>
                      {contactHref && <a className={styles.serviceCta} href={contactHref} target={contactHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer"><MessageCircle size={16} /><span>{copy.vendor?.requestService}</span></a>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <p className={styles.emptyCopy}>{copy.vendor?.noServices}</p>}
      </section>

      {portfolio.length > 0 && (
        <section className={styles.block}>
          <div className={styles.blockHead}><div><p className={styles.kicker}>{copy.vendor?.portfolio}</p><h2>{copy.vendor?.portfolioHeadline}</h2></div></div>
          <div className={styles.portfolioGrid}>
            {portfolio.map((image, index) => (
              <a key={`${index}-${image}`} href={image} target="_blank" rel="noreferrer" className={styles.portfolioItem}>
                <SafeImage src={image} alt={`${copy.vendor?.portfolio} ${index + 1}`} fill sizes="(max-width: 700px) 50vw, 280px" fallbackClassName={styles.portfolioFallback} fallbackText={initial} />
              </a>
            ))}
          </div>
        </section>
      )}

      {(whatsapp || primaryFallback) && (
        <div className={styles.mobileCta}>
          {whatsapp ? <a className={styles.waButton} href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={18} />{copy.vendor?.whatsapp}</a> : <a className={styles.callButton} href={primaryFallback}><Phone size={18} />{copy.card?.callNow}</a>}
          {telHref && whatsapp && <a className={styles.callButton} href={telHref}><Phone size={18} />{copy.card?.callNow}</a>}
        </div>
      )}
    </main>
  );
}

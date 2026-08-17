"use client";

import React from "react";
import Image from "next/image";
import { Search, X } from "lucide-react";
import styles from "./hero.module.css";

/**
 * Editorial marketplace hero: a platform-owned event image with a warm
 * gradient scrim, localized headline/subtitle, and an inline search field.
 * Purely presentational so it can be reused and previewed in isolation.
 */
export default function MarketplaceHero({
  eyebrow,
  title,
  subtitle,
  searchValue,
  onSearchChange,
  onSearchClear,
  searchPlaceholder,
  searchLabel,
  clearLabel,
}) {
  return (
    <section className={styles.hero}>
      <Image
        src="/marketplace/hero.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className={styles.image}
      />
      <div className={styles.scrim} />
      <div className={styles.inner}>
        <div className={styles.copy}>
          {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          {onSearchChange && (
            <div className={styles.search} role="search">
              <Search size={20} aria-hidden="true" />
              <input
                type="search"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchLabel || searchPlaceholder}
              />
              {searchValue ? (
                <button type="button" onClick={onSearchClear} aria-label={clearLabel}>
                  <X size={18} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useSearchParams } from "next/navigation";
import { format, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import styles from "./header.module.css";
import Image from "next/image";
import DateRange from "@/ui/admin/dateRange/DateRange";
import Button from "@/ui/commen/button/Button";

const Header = ({
  selectedDateRange,
  setSelectedDateRange,
  title,
  subtitle,
  actions,
  addButtonTitle,
  addButtonIcon,
  onAddButtonClick,
  wholeDays = false,
}) => {
  const { t, i18n } = useTranslation("adminModerators");
  // Fallbacks for pages that don't load the `adminModerators` namespace —
  // without them t(...) returns the raw key as the button label.
  const isArabic = i18n.language === "ar";
  const labelFallback = {
    dateRange: isArabic ? "حدد مدة زمنية" : "Select time period",
    all: isArabic ? "الكل" : "All",
  };
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);

  const handleDateRangeToggle = () => {
    setIsDateRangeOpen(!isDateRangeOpen);
  };

  const handleDateRangeClose = () => {
    setIsDateRangeOpen(false);
  };

  const handleDateRangeSelect = (range) => {
    setSelectedDateRange(range);

    // Update URL params to trigger server-side refetch
    const params = new URLSearchParams(searchParams.toString());

    if (range?.from) {
      params.set("from", (wholeDays ? startOfDay(range.from) : range.from).toISOString());
    } else {
      params.delete("from");
    }

    const through = range?.to || (wholeDays ? range?.from : null);
    if (through) {
      params.set("to", (wholeDays ? endOfDay(through) : through).toISOString());
    } else {
      params.delete("to");
    }

    // Navigate with new params - triggers server component refetch
    params.set("page", "1");
    const newUrl = params.toString()
      ? `?${params.toString()}`
      : window.location.pathname;
    router.push(newUrl);
  };

  const formatDateRangeText = () => {
    if (!selectedDateRange) {
      return t("header.dateRange", labelFallback.dateRange);
    }

    if (!selectedDateRange?.from) {
      return t("dateRange.all", labelFallback.all);
    }

    const fromDate = format(selectedDateRange.from, "d MMM yyyy", {
      locale: isArabic ? ar : undefined,
    });

    if (
      !selectedDateRange.to ||
      selectedDateRange.to === selectedDateRange.from
    ) {
      return fromDate;
    }

    const toDate = format(selectedDateRange.to, "d MMM yyyy", { locale: isArabic ? ar : undefined });
    return `${fromDate} - ${toDate}`;
  };

  return (
    <>
      <div className={styles.header}>
        <div className={styles.first}>
          <h1 className={styles.headerTitle}>{title}</h1>
          {subtitle && <p className={styles.headerSubtitle}>{subtitle}</p>}
        </div>
        <div className={styles.second}>
          <button className={styles.dateRange} onClick={handleDateRangeToggle}>
            <Image
              width={24}
              height={24}
              src="/svg/admin/date.svg"
              alt=""
            />
            <p className={styles.dateRangeText}>{formatDateRangeText()}</p>
          </button>
          {actions && actions}
          {addButtonTitle && (
            <Button
              title={addButtonTitle}
              icon={addButtonIcon}
              onClick={onAddButtonClick}
            />
          )}
        </div>
      </div>

      <DateRange
        isOpen={isDateRangeOpen}
        onClose={handleDateRangeClose}
        onDateRangeChange={handleDateRangeSelect}
        selectedRange={selectedDateRange}
      />
    </>
  );
};

export default Header;

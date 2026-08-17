"use client";
import React, { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import styles from "./dateRange.module.css";
import { useTranslation } from "react-i18next";
import { ar } from "date-fns/locale";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

// Localized fallbacks. DateRange lives in the shared admin header, which
// renders on admin pages that don't all load the `adminModerators` namespace.
// When that namespace is missing, t(...) returns the raw key (and the months
// lookup returns a string, not an array — crashing .map). These fallbacks keep
// the picker working and readable regardless of the page's loaded namespaces.
const MONTHS_FALLBACK = {
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

const LABELS_FALLBACK = {
  ar: { allTime: "الكل", today: "اليوم", lastWeek: "آخر أسبوع", lastMonth: "آخر شهر", lastQuarter: "آخر 3 أشهر", lastYear: "آخر سنة", cancel: "إلغاء", apply: "تطبيق" },
  en: { allTime: "All Time", today: "Today", lastWeek: "Last Week", lastMonth: "Last Month", lastQuarter: "Last Quarter", lastYear: "Last Year", cancel: "Cancel", apply: "Apply" },
};

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // ISO week: Monday start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function startOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function DateRange({
  isOpen,
  onClose,
  onDateRangeChange,
  selectedRange,
}) {
  const { t, i18n } = useTranslation("adminModerators");
  const [range, setRange] = useState(selectedRange || undefined);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
      setRange(selectedRange || undefined);
    }
  }, [isOpen, selectedRange]);

  const isArabic = i18n.language === "ar";
  const fb = isArabic ? LABELS_FALLBACK.ar : LABELS_FALLBACK.en;
  const monthsFallback = isArabic ? MONTHS_FALLBACK.ar : MONTHS_FALLBACK.en;

  const monthsRaw = t("dateRange.months", {
    returnObjects: true,
    defaultValue: monthsFallback,
  });
  const months = Array.isArray(monthsRaw) ? monthsRaw : monthsFallback;

  const years = Array.from({ length: 21 }, (_, i) => 2015 + i);

  // Presets matching backend getDateRange function: today, week, month, quarter, year
  const presets = useMemo(() => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    // Today - from start of today to end of today
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    // Week - last 7 days
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    // Month - last 30 days
    const monthStart = new Date(now);
    monthStart.setMonth(monthStart.getMonth() - 1);
    monthStart.setHours(0, 0, 0, 0);

    // Quarter - last 3 months
    const quarterStart = new Date(now);
    quarterStart.setMonth(quarterStart.getMonth() - 3);
    quarterStart.setHours(0, 0, 0, 0);

    // Year - last 12 months
    const yearStart = new Date(now);
    yearStart.setFullYear(yearStart.getFullYear() - 1);
    yearStart.setHours(0, 0, 0, 0);

    // All time - no date filter (null values)
    const allTime = { from: null, to: null };

    return [
      {
        key: "all",
        label: t("dateRange.allTime", fb.allTime),
        value: allTime,
      },
      {
        key: "today",
        label: t("dateRange.today", fb.today),
        value: { from: todayStart, to: todayEnd },
      },
      {
        key: "week",
        label: t("dateRange.lastWeek", fb.lastWeek),
        value: { from: weekStart, to: endDate },
      },
      {
        key: "month",
        label: t("dateRange.lastMonth", fb.lastMonth),
        value: { from: monthStart, to: endDate },
      },
      {
        key: "quarter",
        label: t("dateRange.lastQuarter", fb.lastQuarter),
        value: { from: quarterStart, to: endDate },
      },
      {
        key: "year",
        label: t("dateRange.lastYear", fb.lastYear),
        value: { from: yearStart, to: endDate },
      },
    ];
  }, [t, fb]);

  const handlePreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const handleMonthChange = (e) => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), parseInt(e.target.value))
    );
  };

  const handleYearChange = (e) => {
    setCurrentMonth(
      new Date(parseInt(e.target.value), currentMonth.getMonth())
    );
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Quick Select Buttons */}
        <div className={styles.quickSelect}>
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              className={styles.quickBtn}
              onClick={() => setRange(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Month/Year Navigation */}
        <div className={styles.navigation}>
          <button
            type="button"
            className={styles.navArrow}
            onClick={handlePreviousMonth}
          >
            <FiChevronRight size={20} />
          </button>

          <select
            className={styles.monthSelect}
            value={currentMonth.getMonth()}
            onChange={handleMonthChange}
          >
            {months.map((month, index) => (
              <option key={index} value={index}>
                {month}
              </option>
            ))}
          </select>

          <select
            className={styles.yearSelect}
            value={currentMonth.getFullYear()}
            onChange={handleYearChange}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={styles.navArrow}
            onClick={handleNextMonth}
          >
            <FiChevronLeft size={20} />
          </button>
        </div>

        {/* Calendar */}
        <div className={styles.calendarWrapper}>
          <DayPicker
            mode="range"
            selected={range}
            onSelect={setRange}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            locale={isArabic ? ar : undefined}
            weekStartsOn={0}
            showOutsideDays
            hideNavigation
            classNames={{
              day_selected: styles.daySelected,
              day_today: styles.dayToday,
              day: styles.day,
              month_caption: styles.hiddenCaption,
            }}
          />
        </div>

        {/* Footer Buttons */}
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            {t("dateRange.cancel", fb.cancel)}
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={() => {
              if (onDateRangeChange) {
                onDateRangeChange(range);
              }
              onClose();
            }}
          >
            {t("dateRange.apply", fb.apply)}
          </button>
        </div>
      </div>
    </div>
  );
}

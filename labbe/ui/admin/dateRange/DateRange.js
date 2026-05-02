"use client";
import React, { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import styles from "./dateRange.module.css";
import { useTranslation } from "react-i18next";
import { ar } from "date-fns/locale";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

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
  const { t } = useTranslation("adminModerators");
  const [range, setRange] = useState(selectedRange || undefined);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
      setRange(selectedRange || undefined);
    }
  }, [isOpen, selectedRange]);

  const { i18n } = useTranslation("adminModerators");
  const isArabic = i18n.language === "ar";

  const months = isArabic
    ? [
        "يناير",
        "فبراير",
        "مارس",
        "أبريل",
        "مايو",
        "يونيو",
        "يوليو",
        "أغسطس",
        "سبتمبر",
        "أكتوبر",
        "نوفمبر",
        "ديسمبر",
      ]
    : [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

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
        label: isArabic ? "الكل" : "All Time",
        value: allTime,
      },
      {
        key: "today",
        label: isArabic ? "اليوم" : "Today",
        value: { from: todayStart, to: todayEnd },
      },
      {
        key: "week",
        label: isArabic ? "آخر أسبوع" : "Last Week",
        value: { from: weekStart, to: endDate },
      },
      {
        key: "month",
        label: isArabic ? "آخر شهر" : "Last Month",
        value: { from: monthStart, to: endDate },
      },
      {
        key: "quarter",
        label: isArabic ? "آخر 3 أشهر" : "Last Quarter",
        value: { from: quarterStart, to: endDate },
      },
      {
        key: "year",
        label: isArabic ? "آخر سنة" : "Last Year",
        value: { from: yearStart, to: endDate },
      },
    ];
  }, [isArabic]);

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
            {isArabic ? "إلغاء" : "Cancel"}
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
            {isArabic ? "تطبيق" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

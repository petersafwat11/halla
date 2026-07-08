"use client";
import React from "react";
import { DayPicker } from "react-day-picker";
import styles from "./Calendar.module.css";
import Image from "next/image";

const Calendar = ({
  className,
  classNames,
  showOutsideDays = true,
  layout = "horizontal",
  ...props
}) => {
  const IconRight = () => (
    <Image
      src="/svg/events/back-arrow.svg"
      alt="previous"
      width={16}
      height={16}
    />
  );

  const IconLeft = () => (
    <Image src="/svg/events/right.svg" alt="next" width={16} height={16} />
  );

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      //   className={`${styles.calendar} ${className || ''}`}
      classNames={{
        months: `${styles.months} ${
          layout === "horizontal" ? styles.months_horizontal : ""
        }`,
        month: styles.month,
        month_caption: styles.caption,
        caption_label: styles.caption_label,
        nav: styles.nav,
        nav_button: styles.nav_button,
        button_previous: styles.nav_button_previous,
        button_next: styles.nav_button_next,
        month_grid: styles.table,
        weekdays: styles.head_row,
        weekday: styles.head_cell,
        week: styles.row,
        day: styles.day,
        day_button: styles.day_button,
        selected: styles.day_selected,
        today: styles.day_today,
        outside: styles.day_outside,
        disabled: styles.day_disabled,
        range_middle: styles.day_range_middle,
        hidden: styles.day_hidden,
        ...classNames,
      }}
      // components={{
      //   IconLeft,
      //   IconRight,
      // }}
      {...props}
    />
  );
};

Calendar.displayName = "Calendar";

export default Calendar;

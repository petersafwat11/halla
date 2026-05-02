"use client";
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./stepOne.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import DatePicker from "@/ui/commen/inputs/datePicker";
import TimePicker from "@/ui/commen/inputs/TimePicker";
import MapInput from "@/ui/commen/inputs/MapInput";

const StepOne = () => {
  const { watch } = useFormContext();
  const { t } = useTranslation("createEvent");

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 2);

  // Event type options with translations
  const eventTypeOptions = [
    { value: "wedding", label: t("event_types.wedding") },
    { value: "birthday", label: t("event_types.birthday") },
    { value: "graduation", label: t("event_types.graduation") },
    { value: "engagement", label: t("event_types.engagement") },
    { value: "conference", label: t("event_types.conference") },
    { value: "other", label: t("event_types.other") },
  ];

  return (
    <div className={styles.step_one}>
      <div className={styles.form_container}>
        {/* First Row: Event Type and Event Name */}
        <div className={styles.form_row}>
          <InputSelect
            name="eventType"
            label={t("event_type_label")}
            placeholder={t("event_type_placeholder")}
            required={true}
            options={eventTypeOptions}
          />
          <InputGroup
            name="eventName"
            label={t("event_name_label")}
            placeholder={t("event_name_placeholder")}
            type="text"
            required={true}
          />
        </div>

        {/* Second Row: Date and Time */}
        <div className={styles.form_row}>
          <TimePicker name="eventTime" label={t("event_time_label")} required={true} />
          <DatePicker
            name="eventDate"
            label={t("event_date_label")}
            placeholder={t("event_date_placeholder")}
            required={true}
            minDate={minDate}
          />
        </div>

        {/* Address Section */}
        <div className={styles.address_section}>
          <MapInput name="address" label={t("address_label")} required={true} />
        </div>
      </div>
    </div>
  );
};

export default StepOne;

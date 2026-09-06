"use client";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import styles from "./stepOne.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import DatePicker from "@/ui/commen/inputs/datePicker";
import TimePicker from "@/ui/commen/inputs/TimePicker";
import MapInput from "@/ui/commen/inputs/MapInput";
import { useEventSubscriptionInfo } from "@/hooks/events";
import { EVENT_CATEGORIES } from "@halaa/shared/constants/eventCategories";

const StepOne = ({ constraints } = {}) => {
  const { t } = useTranslation("createEvent");
  const { data: subscriptionData } = useEventSubscriptionInfo();
  const isTrial = subscriptionData?.data?.planCode === "trial";

  // Earliest selectable event date enforces the backend event-date floor:
  //   event date ≥ now + minLead + 3d  (trial minLead = 15min → ~now+3d,
  //   paid minLead = 24h → now+4d). The picker is day-granular, so we floor
  //   to the calendar day; the backend (assertEventDateFloor) is the source
  //   of truth and rejects EVENT_DATE_TOO_SOON for boundary cases.
  const minDate = useMemo(() => {
    if (constraints?.minEventDate) return new Date(constraints.minEventDate);
    const days = isTrial ? 3 : 4;
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [isTrial, constraints]);

  // Event type options with translations
  const eventTypeOptions = useMemo(
    () =>
      EVENT_CATEGORIES.map(({ code, labelKey }) => ({
        value: code,
        label: t(labelKey),
      })),
    [t]
  );

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
            allowedDate={constraints?.canKeepExistingDate ? constraints.existingDate : undefined}
          />
        </div>
        <p className={styles.date_hint}>
          {isTrial
            ? t(
                "event_date_hint_trial",
                "Earlier dates are disabled — your event must be at least 3 days away so invitations and the reminder have time to send."
              )
            : t(
                "event_date_hint",
                "Earlier dates are disabled — your event must be at least 4 days away so invitations and the reminder have time to send."
              )}
        </p>

        {/* Address Section */}
        <div className={styles.address_section}>
          <MapInput name="address" label={t("address_label")} required={true} />
        </div>
      </div>
    </div>
  );
};

export default StepOne;

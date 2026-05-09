"use client";

import React from "react";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import DatePicker from "@/ui/commen/inputs/datePicker";
import ColorPickerGroup from "@/ui/commen/inputs/inputGroup/ColorPickerGroup";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import TimePicker from "@/ui/commen/inputs/TimePicker";
import styles from "./templateForm.module.css";

const FONT_OPTIONS = [
  { value: "inter", label: "Inter" },
  { value: "cairo", label: "Cairo" },
  { value: "lato", label: "Lato" },
];

export default function LegacyTemplateFields({ t }) {
  return (
    <div className={styles.formGrid}>
      <div className={styles.fullWidth}>
        <TextArea
          label={t("message_text")}
          placeholder={t("message_text_placeholder")}
          name="messageText"
          maxLength={150}
          rows={3}
        />
      </div>
      <InputGroup
        label={t("bride_name")}
        placeholder={t("bride_name_placeholder")}
        name="brideName"
        maxLength={14}
      />
      <InputGroup
        label={t("groom_name")}
        placeholder={t("groom_name_placeholder")}
        name="groomName"
        maxLength={14}
      />
      <div className={styles.fullWidth}>
        <InputGroup
          name="guestMessage"
          label={t("guest_message")}
          placeholder={t("guest_message_placeholder")}
          maxLength={100}
        />
      </div>
      <DatePicker
        label={t("event_date")}
        placeholder={t("event_date_placeholder")}
        name="entryDate"
      />
      <TimePicker label={t("event_time")} name="entryTime" />
      <InputGroup
        label={t("address")}
        placeholder={t("address_placeholder")}
        name="address"
        maxLength={65}
      />
      <InputGroup
        label={t("end_message")}
        placeholder={t("end_message_placeholder")}
        name="endMessage"
        maxLength={100}
      />
      <InputSelect
        label={t("font_type")}
        placeholder={t("font_type_placeholder")}
        name="fontType"
        options={FONT_OPTIONS}
      />
      <ColorPickerGroup label={t("primary_color")} name="primaryColor" />
    </div>
  );
}

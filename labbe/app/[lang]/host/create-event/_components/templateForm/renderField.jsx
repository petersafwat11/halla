"use client";
/**
 * renderField — Phase 4c W1-VISUAL (per v4.1 §E)
 *
 * Maps a Template field-def (from `template.fields[]`) to the catalogued
 * input component. Each component already integrates with RHF via
 * `useFormContext()` so we don't wrap in `<Controller>` — that would
 * double-register per v4.1 §8.7 forbidden patterns.
 */

import React from "react";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import DatePicker from "@/ui/commen/inputs/datePicker";
import TimePicker from "@/ui/commen/inputs/TimePicker";
import ColorPickerGroup from "@/ui/commen/inputs/inputGroup/ColorPickerGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";

export function renderField(field, locale, fontOptions = []) {
  const label = locale === "ar" ? field.labelAr : field.labelEn;
  const placeholder = locale === "ar" ? field.placeholderAr : field.placeholderEn;
  const name = field.key;

  switch (field.type) {
    case "text":
      return (
        <InputGroup
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          type="text"
          required={field.required}
          maxLength={field.maxLength}
        />
      );

    case "textarea":
      return (
        <TextArea
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          required={field.required}
          maxLength={field.maxLength}
          rows={field.rows ?? 3}
        />
      );

    case "date":
      return (
        <DatePicker
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          required={field.required}
        />
      );

    case "time":
      return <TimePicker key={name} name={name} label={label} required={field.required} />;

    case "color":
      return (
        <ColorPickerGroup
          key={name}
          name={name}
          label={label}
          customColorPlaceholder={placeholder}
          options={true}
        />
      );

    case "font":
      return (
        <InputSelect
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          required={field.required}
          options={fontOptions}
        />
      );

    case "number":
      return (
        <InputGroup
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          type="number"
          required={field.required}
        />
      );

    case "email":
      return (
        <InputGroup
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          type="email"
          required={field.required}
          maxLength={field.maxLength}
        />
      );

    case "password":
      return (
        <InputGroup
          key={name}
          name={name}
          label={label}
          placeholder={placeholder}
          type="password"
          required={field.required}
          maxLength={field.maxLength}
        />
      );

    default:
      return null;
  }
}

export default renderField;

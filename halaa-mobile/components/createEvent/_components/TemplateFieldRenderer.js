import React from "react";
import { Platform } from "react-native";
import TextInput from "../../commen/TextInput";
import TextAreaInput from "../../commen/TextAreaInput";
import DatePicker from "../../commen/DatePicker";
import TimePicker from "../../commen/TimePicker";
import ColorPicker from "../../commen/colorPicker";
import DropdownInput from "../../commen/DropdownInput";

const INPUT_MODE_TO_KEYBOARD = {
  text: "default",
  numeric: "numeric",
  decimal: "decimal-pad",
  tel: "phone-pad",
  email: "email-address",
  url: Platform.OS === "ios" ? "url" : "default",
};

// The mobile app renders in Cairo only, so Cairo is the sole font option.
const FONT_OPTIONS = [{ label: "Cairo", value: "cairo" }];

export const renderTemplateField = (field, locale, t) => {
  const label = locale === "ar" ? field.labelAr : field.labelEn;
  const placeholder = locale === "ar" ? field.placeholderAr : field.placeholderEn;
  const name = field.key;
  const contentDirection = field.dir === "ltr" ? "ltr" : field.dir === "rtl" ? "rtl" : "localized";

  switch (field.type) {
    case "text":
      return (
        <TextInput key={name} name={name} label={label} placeholder={placeholder} keyboardType={INPUT_MODE_TO_KEYBOARD[field.inputMode] ?? "default"} autoCapitalize={field.autoCapitalize ?? "sentences"} contentDirection={contentDirection} />
      );
    case "textarea":
      return (
        <TextAreaInput key={name} name={name} label={label} placeholder={placeholder} numberOfLines={field.rows ?? 3} maxLength={field.maxLength} autoCapitalize={field.autoCapitalize ?? "sentences"} contentDirection={contentDirection} />
      );
    case "date":
      return <DatePicker key={name} name={name} label={label} placeholder={placeholder} />;
    case "time":
      return <TimePicker key={name} name={name} label={label} />;
    case "color":
      return <ColorPicker key={name} name={name} label={label} showPresets={true} />;
    case "font":
      return <DropdownInput key={name} name={name} label={label} placeholder={placeholder} options={FONT_OPTIONS} />;
    case "number":
      return <TextInput key={name} name={name} label={label} placeholder={placeholder} keyboardType={INPUT_MODE_TO_KEYBOARD[field.inputMode] ?? "numeric"} contentDirection="ltr" />;
    case "email":
      return <TextInput key={name} name={name} label={label} placeholder={placeholder} keyboardType="email-address" autoCapitalize="none" contentDirection="ltr" />;
    case "password":
      return <TextInput key={name} name={name} label={label} placeholder={placeholder} secureTextEntry={true} autoCapitalize="none" contentDirection="ltr" />;
    default:
      return null;
  }
};

import React from "react";
import { Ionicons } from "@expo/vector-icons";
import TextInput from "./TextInput";

// Emails are intrinsically LTR ASCII tokens: drop anything that is not an
// allowed address character (Arabic script, spaces, symbols) so the field can
// never hold RTL content that would flip its alignment on iOS.
const sanitizeEmail = (text) => text.replace(/[^A-Za-z0-9@._+-]/g, "");

const EmailInput = ({
  name,
  label,
  placeholder,
  disabled,
  rules,
  ...props
}) => {
  return (
    <TextInput
      name={name}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      rules={rules}
      keyboardType="email-address"
      autoCapitalize="none"
      autoComplete="email"
      contentDirection="ltr"
      sanitize={sanitizeEmail}
      icon={<Ionicons name="mail-outline" size={20} color="#999" />}
      {...props}
    />
  );
};

export default EmailInput;

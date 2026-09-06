import React from "react";
import { Ionicons } from "@expo/vector-icons";
import TextInput from "./TextInput";

// Preserve the address as entered, as on web; the schema validates it.
// Direction is explicit, so invalid text cannot change field alignment.

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
      placeholder="ahmed@gmail.com"
      disabled={disabled}
      rules={rules}
      keyboardType="email-address"
      autoCapitalize="none"
      autoComplete="email"
      contentDirection="ltr"
      autoCorrect={false}
      icon={<Ionicons name="mail-outline" size={20} color="#999" />}
      {...props}
    />
  );
};

export default EmailInput;

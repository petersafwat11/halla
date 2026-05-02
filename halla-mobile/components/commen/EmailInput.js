import React from "react";
import { Ionicons } from "@expo/vector-icons";
import TextInput from "./TextInput";

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
      style={{ textAlign: "left", writingDirection: "ltr" }}
      icon={<Ionicons name="mail-outline" size={20} color="#999" />}
      {...props}
    />
  );
};

export default EmailInput;

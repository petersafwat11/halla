import React from "react";
import { Ionicons } from "@expo/vector-icons";
import TextInput from "./TextInput";
import { resolveInputDirection } from "../../hooks/useInputDirection";

const EmailInput = ({
  name,
  label,
  placeholder,
  disabled,
  rules,
  ...props
}) => {
  // Email is an intrinsically LTR token class.
  const directionStyle = resolveInputDirection("ltr");

  return (
    <TextInput
      name={name}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      rules={rules}
      keyboardType="email-address"
      autoCapitalize="none"
      style={[directionStyle, { textAlign: "left" }]}
      icon={<Ionicons name="mail-outline" size={20} color="#999" />}
      {...props}
    />
  );
};

export default EmailInput;

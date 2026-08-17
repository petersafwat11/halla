import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import styles from "./otpInput.module.css";

const otpSchema = z.object({
  otp: z
    .string()
    .length(6, "Please enter all digits")
    .regex(/^\d+$/, "Only numbers are allowed"),
});

const OtpInput = ({ onChange, value = "" }) => {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: value,
    },
  });

  // Watch for changes and notify parent
  React.useEffect(() => {
    const subscription = watch((values) => {
      if (onChange) {
        onChange(values.otp || "");
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange]);

  // Update form when value prop changes
  React.useEffect(() => {
    setValue("otp", value);
  }, [value, setValue]);

  const handleInput = (e, index) => {
    const input = e.target;
    const newValue = input.value.replace(/\D/g, "").slice(-1); // Get only the last digit

    if (newValue) {
      // Update the OTP value at the current index
      const currentOtp = watch("otp") || "";
      const newOtp = currentOtp.split("");
      newOtp[index] = newValue;
      setValue("otp", newOtp.join(""));

      // Move focus to next input
      const inputs = input.parentElement?.querySelectorAll("input");
      if (inputs && index < 5) {
        inputs[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (e, index) => {
    const currentOtp = watch("otp") || "";

    if (e.key === "Backspace") {
      e.preventDefault();

      // If current input is empty and we're not at the first input,
      // clear previous input and move focus back
      if (!currentOtp[index] && index > 0) {
        const newOtp = currentOtp.slice(0, -1);
        setValue("otp", newOtp);
        const inputs = e.target.parentElement?.querySelectorAll("input");
        inputs[index - 1]?.focus();
      } else {
        // Clear current input
        const newOtp = currentOtp.split("");
        newOtp[index] = "";
        setValue("otp", newOtp.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      const inputs = e.target.parentElement?.querySelectorAll("input");
      inputs[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      const inputs = e.target.parentElement?.querySelectorAll("input");
      inputs[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    setValue("otp", pastedData);

    // Focus the next empty input
    const inputs = e.target.parentElement?.querySelectorAll("input");
    const nextIndex = pastedData.length < 6 ? pastedData.length : 5;
    inputs[nextIndex]?.focus();
  };

  return (
    <div style={{ direction: "ltr" }} className={styles.input_container}>
      {Array.from({ length: 6 }, (_, index) => (
        <input
          key={index}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={(watch("otp") || "")[index] || ""}
          onChange={(e) => handleInput(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          placeholder="_"
          className={`${styles.input} ${errors.otp ? styles.error : ""}`}
        />
      ))}
      {errors.otp && (
        <span className={styles.error_message}>{errors.otp.message}</span>
      )}
    </div>
  );
};

export default OtpInput;

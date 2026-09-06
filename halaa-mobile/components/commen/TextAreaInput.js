import React from "react";
import {
  View,
  Text,
  TextInput as RNTextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { useFormContext, Controller } from "react-hook-form";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { useFieldDirection } from "../../hooks/useInputDirection";
import LocalizedText from "./LocalizedText";

/**
 * Inner renderer hoisted out of the Controller `render` prop so the
 * `useState` hook lives at the top level of a real component. Calling hooks
 * inside the render prop was a Rules-of-Hooks violation that desynchronised
 * focus state under heavy parent re-renders (e.g. inside StepThree's template
 * modal where the live canvas watches every field change), causing the
 * input to refuse focus.
 */
const TextAreaField = ({
  label,
  placeholder,
  isDisabled,
  numberOfLines,
  autoCapitalize,
  maxLength,
  helper,
  contentDirection,
  labelDirection,
  value,
  error,
  onChange,
  onBlur,
  fieldRef,
  sanitize,
  style,
  extraProps,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef(null);
  const formValue = value ?? "";
  // The raw value is required so `adaptive` mode recomputes its first-strong
  // writing direction on every controlled change (blueprint §5.1).
  const fieldDirection = useFieldDirection(contentDirection, {
    hasValue: formValue.length > 0,
    value: formValue,
  });
  const labelStyle = useFieldDirection(labelDirection || "localized");

  return (
    <View style={styles.container}>
      {!!label && <Text style={[styles.label, labelDirection ? { ...labelStyle.input, textAlign: labelDirection === "rtl" ? "right" : "left" } : fieldDirection.text]}>{label}</Text>}
      {/* The whole box is pressable so a tap anywhere inside (padding included,
          not just the text node) focuses the input. */}
      <Pressable
        onPress={() => !isDisabled && inputRef.current?.focus()}
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          isDisabled && styles.inputContainerDisabled,
        ]}
      >
        <RNTextInput
          {...extraProps}
          ref={(node) => {
            inputRef.current = node;
            fieldRef?.(node);
          }}
          style={[styles.textArea, fieldDirection.input, style]}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={formValue}
          onChangeText={(text) => onChange(sanitize ? sanitize(text) : text)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          onFocus={() => setIsFocused(true)}
          autoCapitalize={autoCapitalize}
          editable={!isDisabled}
          multiline
          numberOfLines={numberOfLines}
          textAlign={fieldDirection.input.writingDirection === "rtl" ? "right" : "left"}
          textAlignVertical="top"
          maxLength={maxLength}
        />
      </Pressable>
      {error && (
        <LocalizedText role="error" style={styles.errorText}>{error.message}</LocalizedText>
      )}
      {!error && helper ? (
        <LocalizedText role="hint" style={styles.helperText}>{helper}</LocalizedText>
      ) : null}
      {maxLength && (
        <Text style={[styles.charCount, fieldDirection.counter]}>
          {isolateLtr(`${formValue.length} / ${maxLength}`)}
        </Text>
      )}
    </View>
  );
};

const TextAreaInput = ({
  name,
  label,
  placeholder,
  autoCapitalize = "sentences",
  editable = true,
  disabled = false,
  numberOfLines = 3,
  maxLength,
  helper,
  contentDirection = "localized",
  labelDirection,
  sanitize,
  rules,
  style,
  ...props
}) => {
  const { control } = useFormContext();
  const isDisabled = disabled || !editable;

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({
        field: { onChange, onBlur, value, ref },
        fieldState: { error },
      }) => (
        <TextAreaField
          label={label}
          placeholder={placeholder}
          isDisabled={isDisabled}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          helper={helper}
          contentDirection={contentDirection}
          labelDirection={labelDirection}
          value={value}
          error={error}
          onChange={onChange}
          onBlur={onBlur}
          fieldRef={ref}
          sanitize={sanitize}
          style={style}
          extraProps={props}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 8,
    width: "100%",
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "100%",
  },
  inputContainerFocused: {
    borderColor: "#c28e5c",
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: "#e74c3c",
  },
  inputContainerDisabled: {
    backgroundColor: "#f5f5f5",
  },
  textArea: {
    padding: 0,
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    minHeight: 80,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#999",
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#767676",
    marginTop: 4,
  },
});

export default TextAreaInput;

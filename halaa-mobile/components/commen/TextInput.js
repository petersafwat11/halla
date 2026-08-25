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

/**
 * Inner field renderer. Hoisted out of the Controller `render` prop so the
 * `useState` hook lives at the top level of a real component — calling the
 * hook inside the render prop function is a Rules-of-Hooks violation that
 * desynchronises focus state when the parent form re-renders heavily (e.g.
 * inside StepThree's template modal where the live canvas watches every
 * field change), with the symptom that inputs refuse focus.
 */
const TextInputField = ({
  label,
  required,
  placeholder,
  isDisabled,
  multiline,
  numberOfLines,
  icon,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  value,
  error,
  helper,
  maxLength,
  showCounter,
  contentDirection,
  sanitize,
  onChange,
  onBlur,
  style,
  extraProps,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef(null);
  // The raw value is required so `adaptive` mode recomputes its first-strong
  // writing direction on every controlled change (blueprint §5.1).
  const resolvedFieldDirection = useFieldDirection(contentDirection, {
    hasValue: String(value ?? "").length > 0,
    value,
  });
  // iOS (new architecture): flipping a FOCUSED input's writingDirection
  // mid-composition rebuilds the attributed string and freshly typed
  // characters stop rendering until the field loses focus. Freeze the
  // resolved direction for the whole focus session; it refreshes on blur.
  const frozenFieldDirectionRef = React.useRef(resolvedFieldDirection);
  if (!isFocused || frozenFieldDirectionRef.current == null) {
    frozenFieldDirectionRef.current = resolvedFieldDirection;
  }
  const fieldDirection = isFocused
    ? frozenFieldDirectionRef.current
    : resolvedFieldDirection;

  return (
    <View style={styles.container}>
      {/* The required marker is a nested run, never string-concatenated,
          so punctuation stays inside the localized label's direction. */}
      {!!label && (
        <Text style={[styles.label, fieldDirection.text]}>
          {label}
          {required ? <Text> *</Text> : null}
        </Text>
      )}
      {/* The whole box is pressable so a tap anywhere inside (padding included,
          not just the text node) focuses the input. */}
      <Pressable
        onPress={() => !isDisabled && inputRef.current?.focus()}
        style={[
          styles.inputContainer,
          multiline && styles.inputContainerMultiline,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          isDisabled && styles.inputContainerDisabled,
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <RNTextInput
          {...extraProps}
          ref={inputRef}
          style={[styles.input, fieldDirection.input, multiline && styles.inputMultiline, style]}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value ?? ""}
          onChangeText={(text) => onChange(sanitize ? sanitize(text) : text)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          onFocus={() => setIsFocused(true)}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={!isDisabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          textAlign="auto"
        />
      </Pressable>
      {error && (
        <Text style={[styles.errorText, fieldDirection.text]}>{error.message}</Text>
      )}
      {!error && helper ? (
        <Text style={[styles.helperText, fieldDirection.text]}>{helper}</Text>
      ) : null}
      {maxLength && showCounter ? (
        <Text style={[styles.counterText, fieldDirection.counter]}>
          {isolateLtr(`${String(value ?? "").length} / ${maxLength}`)}
        </Text>
      ) : null}
    </View>
  );
};

const TextInput = ({
  name,
  label,
  required = false,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
  editable = true,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  icon,
  helper,
  maxLength,
  showCounter = false,
  contentDirection = "localized",
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
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <TextInputField
          label={label}
          required={required}
          placeholder={placeholder}
          isDisabled={isDisabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          icon={icon}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          value={value}
          error={error}
          helper={helper}
          maxLength={maxLength}
          showCounter={showCounter}
          contentDirection={contentDirection}
          sanitize={sanitize}
          onChange={onChange}
          onBlur={onBlur}
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
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 50,
    paddingHorizontal: 16,
    width: "100%",
  },
  inputContainerMultiline: {
    alignItems: "stretch",
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
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  iconContainer: {
    marginEnd: 8,
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
  counterText: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#767676",
    marginTop: 4,
  },
});

export default TextInput;

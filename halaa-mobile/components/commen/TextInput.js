import React from "react";
import {
  View,
  Text,
  TextInput as RNTextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { useFormContext, Controller } from "react-hook-form";

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
  onChange,
  onBlur,
  style,
  extraProps,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef(null);

  return (
    <View style={styles.container}>
      {!!label && <Text style={styles.label}>{label}</Text>}
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
          style={[styles.input, multiline && styles.inputMultiline, style]}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value ?? ""}
          onChangeText={onChange}
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
          textAlign="auto"
        />
      </Pressable>
      {error && <Text style={styles.errorText}>{error.message}</Text>}
    </View>
  );
};

const TextInput = ({
  name,
  label,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
  editable = true,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  icon,
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
    marginRight: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 4,
  },
});

export default TextInput;

import React from "react";
import { TextInput as RNTextInput } from "react-native";
import {
  CONTENT_DIRECTIONS,
  useFieldDirection,
} from "../../hooks/useInputDirection";

/**
 * Direction-aware replacement for direct React Native TextInput usage.
 *
 * Form-bound fields should normally use TextInput/TextAreaInput/etc. This
 * lower-level primitive exists for controlled search boxes, modal fields and
 * other inputs that cannot use react-hook-form. Direction can be explicit,
 * or is inferred for common intrinsically-LTR keyboard/token classes. Pass
 * contentDirection="adaptive" for arbitrary user text (names, titles,
 * categories, addresses, search): the empty placeholder follows the UI locale
 * while a filled value follows its first strong character.
 */
const inferContentDirection = ({
  contentDirection,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
}) => {
  if (contentDirection) return contentDirection;
  if (secureTextEntry) return CONTENT_DIRECTIONS.LTR;
  if (keyboardType === "phone-pad") return CONTENT_DIRECTIONS.PHONE;
  if (
    [
      "email-address",
      "url",
      "number-pad",
      "numeric",
      "decimal-pad",
      "ascii-capable",
    ].includes(keyboardType) ||
    autoCapitalize === "characters"
  ) {
    return CONTENT_DIRECTIONS.LTR;
  }
  return CONTENT_DIRECTIONS.LOCALIZED;
};

const DirectionalTextInput = React.forwardRef(
  (
    {
      contentDirection,
      keyboardType,
      secureTextEntry,
      autoCapitalize,
      value,
      defaultValue,
      style,
      ...props
    },
    ref
  ) => {
    const resolvedDirection = inferContentDirection({
      contentDirection,
      keyboardType,
      secureTextEntry,
      autoCapitalize,
    });
    const currentValue = String(value ?? defaultValue ?? "");
    const [isFocused, setIsFocused] = React.useState(false);
    const resolvedFieldDirection = useFieldDirection(resolvedDirection, {
      hasValue: currentValue.length > 0,
      // Adaptive mode resolves the first-strong direction from the raw value.
      value: value ?? defaultValue,
    });
    // Same iOS freeze as TextInputField: never flip writingDirection while
    // the input holds focus — mid-composition flips stop rendering typed
    // characters until blur.
    const frozenFieldDirectionRef = React.useRef(resolvedFieldDirection);
    if (!isFocused || frozenFieldDirectionRef.current == null) {
      frozenFieldDirectionRef.current = resolvedFieldDirection;
    }
    const fieldDirection = isFocused
      ? frozenFieldDirectionRef.current
      : resolvedFieldDirection;

    return (
      <RNTextInput
        {...props}
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        style={[fieldDirection.input, style]}
        textAlign="auto"
        onFocus={(event) => {
          setIsFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          props.onBlur?.(event);
        }}
      />
    );
  }
);

DirectionalTextInput.displayName = "DirectionalTextInput";

export default DirectionalTextInput;

import React, { useState } from "react";
import { Keyboard, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import FormField from "./FormField";
import CategoryPickerSheet from "./CategoryPickerSheet";

/**
 * Creatable category picker field — the mobile counterpart of web's
 * CategorySelect. A trigger button shows the current value (or placeholder)
 * with a trailing chevron, and opens the shared CategoryPickerSheet. Controlled
 * via value/onChange (plain string), so it drops into local state or RHF alike.
 *
 * `onPickerVisibleChange` lets a hosting sheet suspend its own native Modal
 * window while this picker is presented — only one modal window may be up
 * at a time (§6.4) or touch/keyboard routing breaks on device.
 *
 * Direction contract (blueprint §5): the label and empty placeholder follow
 * the UI locale; a selected user-created category renders adaptively by its
 * first strong character; the chevron stays in its logical trailing slot via
 * plain JSX order — no physical mirroring anywhere.
 */
const CategorySelect = ({
  value = "",
  onChange,
  options = [],
  label,
  placeholder,
  searchPlaceholder,
  noneLabel,
  createLabel,
  disabled = false,
  onPickerVisibleChange,
}) => {
  const { t } = useTranslation("createEvent");
  const [isOpen, setIsOpen] = useState(false);

  const openPicker = () => {
    if (disabled) return;
    Keyboard.dismiss();
    setIsOpen(true);
    onPickerVisibleChange?.(true);
  };

  const closePicker = () => {
    setIsOpen(false);
    onPickerVisibleChange?.(false);
  };

  return (
    <View style={styles.container}>
      <FormField
        label={label}
        value={value}
        placeholder={placeholder ?? t("category_placeholder")}
        contentDirection="adaptive"
        disabled={disabled}
        onPress={openPicker}
        trailing={<Ionicons name="chevron-down" size={20} color="#656565" />}
      />

      <CategoryPickerSheet
        visible={isOpen}
        onClose={closePicker}
        onSelect={(val) => onChange?.(val)}
        value={value}
        options={options}
        searchPlaceholder={searchPlaceholder}
        noneLabel={noneLabel}
        createLabel={createLabel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: "100%" },
});

export default CategorySelect;

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { useFormContext, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";

/**
 * Hoisted field renderer to satisfy Rules-of-Hooks.
 */
const DropdownInputField = ({
  label,
  placeholder,
  options,
  disabled,
  modalTitle,
  renderItem,
  value,
  error,
  onChange,
}) => {
  const { t } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value) || null;

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const displayValue = selectedOption?.label;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[
          styles.inputContainer,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-down" size={20} color="#656565" />
        <Text
          style={[
            styles.inputText,
            !displayValue && styles.placeholderText,
          ]}
        >
          {displayValue || placeholder}
        </Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error.message}</Text>}

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setIsOpen(false)}
        >
          <Pressable
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>{modalTitle || t("select", "اختر")}</Text>
              </View>
            </View>

            {/* Options List */}
            <FlatList
              data={options}
              keyExtractor={(item, index) =>
                item.id || item.value || index.toString()
              }
              renderItem={({ item }) =>
                renderItem ? (
                  renderItem(item, () => handleSelect(item))
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      selectedOption?.value === item.value &&
                        styles.optionItemSelected,
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionContent}>
                      <Text style={styles.optionText}>{item.label}</Text>
                      {item.icon && (
                        <View style={styles.optionIcon}>{item.icon}</View>
                      )}
                    </View>
                  </TouchableOpacity>
                )
              }
              contentContainerStyle={styles.optionsList}
            />

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>{t("cancel", "إلغاء")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !selectedOption && styles.confirmButtonDisabled,
                ]}
                onPress={() => setIsOpen(false)}
                disabled={!selectedOption}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.confirmButtonText,
                    !selectedOption && styles.confirmButtonTextDisabled,
                  ]}
                >
                  {t("confirm", "تأكيد")}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const DropdownInput = ({
  name,
  label,
  placeholder,
  options = [],
  disabled = false,
  modalTitle,
  renderItem,
  rules,
}) => {
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <DropdownInputField
          label={label}
          placeholder={placeholder}
          options={options}
          disabled={disabled}
          modalTitle={modalTitle}
          renderItem={renderItem}
          value={value}
          error={error}
          onChange={onChange}
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
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#DFDFDF",
    borderRadius: 12,
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 50,
  },
  inputContainerError: {
    borderColor: "#e74c3c",
  },
  inputContainerDisabled: {
    backgroundColor: "#f5f5f5",
    opacity: 0.6,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    lineHeight: 24,
    letterSpacing: 0.08,
  },
  placeholderText: {
    color: "#767676",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 4,
    paddingHorizontal: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 24,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: "flex-start",
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 32,
  },
  optionsList: {
    paddingHorizontal: 24,
  },
  optionItem: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  optionItemSelected: {
    backgroundColor: "#F5ECE4",
    borderRadius: 12,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
    lineHeight: 24,
    letterSpacing: 0.024,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 40,
    overflow: "hidden",
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F2",
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6B392",
    backgroundColor: "#FFF",
    minWidth: 100,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
    lineHeight: 24,
    letterSpacing: 0.08,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#C28E5C",
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#F5ECE4",
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    lineHeight: 24,
    letterSpacing: 0.08,
  },
  confirmButtonTextDisabled: {
    color: "#CEA57D",
  },
});

export default DropdownInput;

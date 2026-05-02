import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable
} from "react-native";
import TextInput from "../commen/TextInput";
import Button from "../commen/Button";
import Svg, { Path } from "react-native-svg";

const CloseIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke="#656565"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const EditGuestOrModeratorsModal = ({
  visible,
  onClose,
  item,
  type = "guest",
  onSave
}) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (item) {
      setName(item.name || "");
      setPhone(item.phone || item.mobile || "");
      setErrors({});
    }
  }, [item]);

  const handleSave = () => {
    const result = onSave(item.id, { name, phone });

    if (result && !result.success && result.errors) {
      setErrors(result.errors);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {type === "guest" ? "تعديل بيانات الضيف" : "تعديل بيانات المشرف"}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <CloseIcon />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label={type === "guest" ? "اسم الضيف" : "اسم المشرف"}
              placeholder={type === "guest" ? "أدخل اسم الضيف" : "أدخل اسم المشرف"}
              value={name}
              onChangeText={(text) => {
                setName(text);
                setErrors({ ...errors, name: null });
              }}
              error={errors.name}
            />

            <TextInput
              label="رقم الجوال"
              placeholder="5xxxxxxxx"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setErrors({ ...errors, phone: null });
              }}
              keyboardType="phone-pad"
              error={errors.phone}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              text="حفظ التعديلات"
              onPress={handleSave}
              disabled={!name.trim() || !phone.trim()}
            />
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0"
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    flex: 1,
    textAlign: "right"
  },  closeButton: {
    padding: 4
  },
  form: {
    padding: 24
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center"
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#656565"
  }
});

export default EditGuestOrModeratorsModal;

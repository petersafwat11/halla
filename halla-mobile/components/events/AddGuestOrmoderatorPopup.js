import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import TextInput from "../commen/TextInput";
import MobileInput from "../commen/MobileInput";

// Validation schemas
const guestSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  phone: z.string().min(9, "رقم الجوال غير صحيح")
});

const moderatorSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  phone: z.string().min(9, "رقم الجوال غير صحيح")
});

const AddGuestOrModeratorPopup = ({
  visible,
  onClose,
  onSave,
  type, // "guest" or "moderator"
  initialData = null,
  loading = false
}) => {
  const isGuest = type === "guest";
  const isEdit = !!initialData;

  const methods = useForm({
    resolver: zodResolver(isGuest ? guestSchema : moderatorSchema),
    defaultValues: initialData || {
      name: "",
      phone: ""
    }
  });

  const { handleSubmit, reset } = methods;

  React.useEffect(() => {
    if (visible) {
      reset(initialData || { name: "", phone: "" });
    }
  }, [visible, initialData]);

  const onSubmit = (data) => {
    onSave(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEdit
                ? isGuest
                  ? "تعديل ضيف"
                  : "تعديل مشرف"
                : isGuest
                ? "إضافة ضيف جديد"
                : "إضافة مشرف جديد"}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={loading}
            >
              <Ionicons name="close" size={24} color="#2C2C2C" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <FormProvider {...methods}>
              <TextInput
                name="name"
                label={isGuest ? "اسم الضيف" : "اسم المشرف"}
                placeholder="أدخل الاسم الكامل"
                disabled={loading}
              />

              <MobileInput
                name="phone"
                label="رقم الجوال"
                placeholder="5xxxxxxxx"
                disabled={loading}
                countryCode="+966"
              />
            </FormProvider>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                إلغاء
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                loading && styles.saveButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={[styles.buttonText, styles.saveButtonText]}>
                  {isEdit ? "حفظ التعديلات" : "إضافة"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  container: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8
  },header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0"
  },title: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    flex: 1
  },closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center"
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 20
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0"
  },  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center"
  },
  cancelButton: {
    backgroundColor: "#F5F5F5"
  },
  saveButton: {
    backgroundColor: "#C28E5C"
  },
  saveButtonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold"
  },
  cancelButtonText: {
    color: "#656565"
  },
  saveButtonText: {
    color: "#FFF"
  }
});

export default AddGuestOrModeratorPopup;

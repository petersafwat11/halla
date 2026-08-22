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
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import TextInput from "../commen/TextInput";
import MobileInput from "../commen/MobileInput";
import { useTranslation } from "../../localization";

// Validation schemas factory functions
const buildGuestSchema = (t) => z.object({
  name: z.string().min(2, t("guest_name_error_min", "الاسم يجب أن يكون حرفين على الأقل")),
  phone: z.string().min(9, t("guest_phone_error_invalid", "رقم الجوال غير صحيح"))
});

const buildModeratorSchema = (t) => z.object({
  name: z.string().min(2, t("staff_name_error_min", "الاسم يجب أن يكون حرفين على الأقل")),
  phone: z.string().min(9, t("staff_phone_error_invalid", "رقم الجوال غير صحيح"))
});

const AddGuestOrModeratorPopup = ({
  visible,
  onClose,
  onSave,
  type, // "guest" or "moderator"
  initialData = null,
  loading = false,
  // Existing entries (guests OR moderators) already saved for this
  // event. Rendered above the form as a compact list with edit/delete
  // so the popup matches the web `StaffPopup` UX, where the host can
  // see everyone they've added without closing the modal first.
  itemsList = [],
  onEditItem,
  onDeleteItem
}) => {
  const { t } = useTranslation(["createEvent", "common"]);
  const isGuest = type === "guest";
  const isEdit = !!initialData;

  const schema = React.useMemo(() => {
    return isGuest ? buildGuestSchema(t) : buildModeratorSchema(t);
  }, [isGuest, t]);

  const methods = useForm({
    resolver: zodResolver(schema),
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
                  ? t("edit_guest", "تعديل ضيف")
                  : t("edit_moderator", "تعديل مشرف")
                : isGuest
                ? t("add_guest_new", "إضافة ضيف جديد")
                : t("add_moderator", "إضافة مشرف جديد")}
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
                label={isGuest ? t("guest_name", "اسم الضيف") : t("moderator_name", "اسم المشرف")}
                placeholder={t("enter_full_name", "أدخل الاسم الكامل")}
                disabled={loading}
              />

              <MobileInput
                name="phone"
                label={t("staff_phone", "رقم الجوال")}
                placeholder={t("staff_phone_placeholder", "5xxxxxxxx")}
                disabled={loading}
                countryCode="+966"
              />
            </FormProvider>

            {itemsList.length > 0 && (
              <View style={styles.listSection}>
                <Text style={styles.listTitle}>
                  {isGuest ? t("current_guests", "الضيوف الحاليون") : t("current_moderators", "مشرفين البوابة الحالي")} ({itemsList.length})
                </Text>
                {itemsList.map((item) => {
                  const itemId = item._id || item.id;
                  const isCurrent = initialData && (initialData._id === itemId);
                  return (
                    <View
                      key={itemId}
                      style={[styles.listRow, isCurrent && styles.listRowActive]}
                    >
                      <View style={styles.listInfo}>
                        <Text style={styles.listName} numberOfLines={1}>
                          {item.name || "—"}
                        </Text>
                        <Text style={styles.listPhone} numberOfLines={1}>
                          {isolateLtr(item.phone || item.mobile || "—")}
                        </Text>
                      </View>
                      <View style={styles.listActions}>
                        {onEditItem && (
                          <TouchableOpacity
                            onPress={() => onEditItem(item)}
                            style={styles.listIconBtn}
                            disabled={loading}
                          >
                            <Ionicons name="create-outline" size={18} color="#6B4E33" />
                          </TouchableOpacity>
                        )}
                        {onDeleteItem && (
                          <TouchableOpacity
                            onPress={() => onDeleteItem(item)}
                            style={styles.listIconBtn}
                            disabled={loading}
                          >
                            <Ionicons name="trash-outline" size={18} color="#C0392B" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                {t("buttons.cancel", "إلغاء")}
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
                  {isEdit ? t("save_changes", "حفظ التعديلات") : t("buttons.add", "إضافة")}
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
    // NOT `flex: 1`. The parent `container` has only `maxHeight: "80%"` with no
    // fixed height, so it sizes to its content. A `flex: 1` child in an
    // auto-height column has no definite height to grow into and collapses to
    // 0 — which hid the entire form, leaving just the header + footer buttons.
    // `flexShrink: 1` lets the ScrollView size to its content and grow the
    // modal naturally, then shrink + scroll once content exceeds the 80% cap.
    flexShrink: 1
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
  },
  listSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    gap: 8
  },
  listTitle: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    marginBottom: 4
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F9F4EF",
    borderWidth: 1,
    borderColor: "#F5ECE4"
  },
  listRowActive: {
    borderColor: "#C28E5C",
    backgroundColor: "#F5ECE4"
  },
  listInfo: {
    flex: 1,
    gap: 2
  },
  listName: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C"
  },
  listPhone: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    writingDirection: "ltr"
  },
  listActions: {
    flexDirection: "row",
    gap: 4
  },
  listIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF"
  }
});

export default AddGuestOrModeratorPopup;

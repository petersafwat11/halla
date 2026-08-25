import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { formatCount } from "@halaa/shared/utils/locale";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import TextInput from "../commen/TextInput";
import MobileInput from "../commen/MobileInput";
import LocalizedText from "../commen/LocalizedText";
import { useTranslation } from "../../localization";
import AdaptiveText from "../commen/AdaptiveText";
import KeyboardSafeModalSheet from "../commen/keyboard/KeyboardSafeModalSheet";
import { saudiPhone } from "@halaa/shared/schemas/_shared";
import { DEFAULT_PHONE_PLACEHOLDER } from "@halaa/shared/utils/phone";

// Validation schemas factory functions
const buildGuestSchema = (t) =>
  z.object({
    name: z
      .string()
      .min(2, t("guest_name_error_min")),
    phone: saudiPhone(t),
  });

const buildModeratorSchema = (t) =>
  z.object({
    name: z
      .string()
      .min(2, t("staff_name_error_min")),
    phone: saudiPhone(t),
  });

const AddGuestOrModeratorPopup = ({
  visible,
  onClose,
  onSave,
  type, // "guest" or "moderator"
  initialData = null,
  loading = false,
  itemsList = [],
  onEditItem,
  onDeleteItem,
}) => {
  const { t, currentLanguage } = useTranslation(["createEvent", "common"]);
  const isGuest = type === "guest";
  const isEdit = !!initialData;

  const schema = React.useMemo(() => {
    return isGuest ? buildGuestSchema(t) : buildModeratorSchema(t);
  }, [isGuest, t]);

  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      name: "",
      phone: "",
    },
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

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>
        {isEdit
          ? isGuest
            ? t("edit_guest")
            : t("edit_moderator")
          : isGuest
          ? t("add_guest_new")
          : t("add_moderator")}
      </Text>
      <TouchableOpacity
        onPress={handleClose}
        style={styles.closeButton}
        disabled={loading}
      >
        <Ionicons name="close" size={24} color="#2C2C2C" />
      </TouchableOpacity>
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      <TouchableOpacity
        style={[styles.button, styles.cancelButton]}
        onPress={handleClose}
        disabled={loading}
      >
        <Text style={[styles.buttonText, styles.cancelButtonText]}>
          {t("common:buttons.cancel")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          styles.saveButton,
          loading && styles.saveButtonDisabled,
        ]}
        onPress={handleSubmit(onSubmit)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={[styles.buttonText, styles.saveButtonText]}>
            {isEdit
              ? t("save_changes")
              : t("common:buttons.add")}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    // Small centered card (§6.4): the shared avoiding owner moves/resizes the
    // card with the keyboard; the form body scrolls if font scaling needs it.
    // No backdrop dismissal — matches the previous overlay behavior.
    <KeyboardSafeModalSheet
      visible={visible}
      onClose={handleClose}
      onRequestClose={handleClose}
      header={header}
      footer={footer}
      centered
      dismissOnBackdropPress={false}
      animationType="fade"
      sheetStyle={styles.container}
    >
      <FormProvider {...methods}>
        <View style={styles.contentContainer}>
          <TextInput
            name="name"
            contentDirection="adaptive"
            label={
              isGuest
                ? t("guest_name")
                : t("moderator_name")
            }
            placeholder={t("enter_full_name")}
            disabled={loading}
          />

          <MobileInput
            name="phone"
            label={t("staff_phone")}
            placeholder={t(
              "staff_phone_placeholder",
              DEFAULT_PHONE_PLACEHOLDER
            )}
            disabled={loading}
            countryCode="+966"
          />
        </View>
      </FormProvider>

      {itemsList.length > 0 && (
        <View style={styles.listSection}>
          {/* Count lives inside the translated string so parentheses
              cannot BiDi-spill in Arabic; digits follow the locale. */}
          <LocalizedText style={styles.listTitle}>
            {isGuest
              ? t("current_guests_count", {
                  count: formatCount(itemsList.length, currentLanguage),
                })
              : t("current_moderators_count", {
                  count: formatCount(itemsList.length, currentLanguage),
                })}
          </LocalizedText>
          {itemsList.map((item) => {
            const itemId = item._id || item.id;
            const isCurrent =
              initialData && initialData._id === itemId;
            return (
              <View
                key={itemId}
                style={[
                  styles.listRow,
                  isCurrent && styles.listRowActive,
                ]}
              >
                <View style={styles.listInfo}>
                  <AdaptiveText style={styles.listName} numberOfLines={1}>
                    {item.name || "—"}
                  </AdaptiveText>
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
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color="#6B4E33"
                      />
                    </TouchableOpacity>
                  )}
                  {onDeleteItem && (
                    <TouchableOpacity
                      onPress={() => onDeleteItem(item)}
                      style={styles.listIconBtn}
                      disabled={loading}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#C0392B"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </KeyboardSafeModalSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  title: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    padding: 20,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
  },
  saveButton: {
    backgroundColor: "#C28E5C",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
  },
  cancelButtonText: {
    color: "#656565",
  },
  saveButtonText: {
    color: "#FFF",
  },
  listSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    gap: 8,
  },
  listTitle: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    marginBottom: 4,
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
    borderColor: "#F5ECE4",
  },
  listRowActive: {
    borderColor: "#C28E5C",
    backgroundColor: "#F5ECE4",
  },
  listInfo: {
    flex: 1,
    gap: 2,
  },
  listName: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
  },
  listPhone: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    writingDirection: "ltr",
  },
  actions: {
    flexDirection: "row",
    gap: 4,
  },
  listIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
});

export default AddGuestOrModeratorPopup;

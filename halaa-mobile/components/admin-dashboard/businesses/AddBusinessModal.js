import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { useForm, FormProvider } from "react-hook-form";
import KeyboardSafeModalSheet from "../../commen/keyboard/KeyboardSafeModalSheet";
import {
  Button,
  TextInput,
  EmailInput,
  PasswordInput,
  MobileInput,
  TextAreaInput,
  ImageInput,
} from "../../commen";
import LocalizedText from "../../commen/LocalizedText";
import { CONTENT_DIRECTIONS } from "../../../hooks/useInputDirection";
import { useCreateBusiness } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";

/**
 * Admin "Add Business" modal — the mobile equivalent of web's
 * AddBusinessPopup. Builds a multipart FormData (the `logo` field is the
 * same one the backend's multer upload expects) and submits via
 * useCreateBusiness. Logo is optional; name/email/phone/password mirror the
 * web UI's required fields.
 */
const AddBusinessModal = ({ visible, onClose, onSaved }) => {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const createBusiness = useCreateBusiness();
  const cb = (key, fallback) => t(`businesses.create.${key}`, fallback);

  const methods = useForm({
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      password: "",
      description: "",
      logo: null,
    },
  });

  const close = () => {
    methods.reset();
    onClose();
  };

  const onSubmit = async (values) => {
    try {
      const formData = new FormData();
      formData.append("name", (values.name || "").trim());
      formData.append("phoneNumber", (values.phoneNumber || "").trim());
      if (values.email && values.email.trim()) {
        formData.append("email", values.email.trim().toLowerCase());
      }
      if (values.password && values.password.trim()) {
        formData.append("password", values.password.trim());
      }
      if (values.description && values.description.trim()) {
        formData.append("description", values.description.trim());
      }
      if (values.logo?.uri) {
        formData.append("logo", {
          uri: values.logo.uri,
          name:
            values.logo.fileName ||
            values.logo.uri.split("/").pop() ||
            "logo.jpg",
          type: values.logo.type || "image/jpeg",
        });
      }
      await createBusiness.mutateAsync(formData);
      toast.success(cb("success", "Business created."));
      methods.reset();
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error.message || cb("error", "Could not create business."));
    }
  };

  if (!visible) return null;

  const isSubmitting = createBusiness.isPending;

  const header = (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <LocalizedText style={styles.kicker}>{cb("kicker", "Business")}</LocalizedText>
        <LocalizedText style={styles.title}>{cb("title", "Add Business")}</LocalizedText>
      </View>
      <TouchableOpacity onPress={close} style={styles.closeButton}>
        <Ionicons name="close" size={24} color={colors.natural[900]} />
      </TouchableOpacity>
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      <View style={styles.buttonWrapper}>
        <Button
          text={t("common.cancel")}
          onPress={close}
          variant="outline"
          size="small"
          disabled={isSubmitting}
        />
      </View>
      <View style={styles.buttonWrapper}>
        <Button
          text={
            isSubmitting
              ? cb("saving", "Saving...")
              : cb("submit", "Add business")
          }
          onPress={methods.handleSubmit(onSubmit)}
          variant="primary"
          size="small"
          loading={isSubmitting}
          disabled={isSubmitting}
        />
      </View>
    </View>
  );

  return (
    // Shared sheet (§8.2 admin row): aware scroll body owns focus scrolling;
    // actions stay attached above the keyboard.
    <KeyboardSafeModalSheet
      visible={visible}
      onClose={close}
      onRequestClose={close}
      header={header}
      footer={footer}
      contentContainerStyle={styles.contentPadding}
    >
      <FormProvider {...methods}>
        <TextInput
          name="name"
          label={cb("name", "Name")}
          placeholder={cb("namePlaceholder", "Business name")}
          contentDirection={CONTENT_DIRECTIONS.ADAPTIVE}
          rules={{ required: cb("nameRequired", "Name is required") }}
        />
        <EmailInput
          name="email"
          label={cb("email", "Email")}
          placeholder={cb("emailPlaceholder", "name@example.com")}
          rules={{ required: cb("emailRequired", "Email is required") }}
        />
        <MobileInput
          name="phoneNumber"
          label={cb("phone", "Phone number")}
          placeholder={cb("phonePlaceholder", "5xxxxxxxx")}
          rules={{ required: cb("phoneRequired", "Phone is required") }}
        />
        <PasswordInput
          name="password"
          label={cb("password", "Password")}
          placeholder={cb("passwordPlaceholder", "Leave blank to auto-generate")}
          rules={{
            validate: (v) =>
              !v || v.length >= 8 || cb("passwordMin", "Password must be at least 8 characters"),
          }}
        />
        <TextAreaInput
          name="description"
          label={cb("description", "Description")}
          placeholder={cb("descriptionPlaceholder", "Optional")}
          contentDirection={CONTENT_DIRECTIONS.ADAPTIVE}
          maxLength={2000}
        />
        <ImageInput
          name="logo"
          label={cb("logo", "Logo")}
          placeholder={cb("logoPlaceholder", "Choose an image")}
        />
      </FormProvider>
    </KeyboardSafeModalSheet>
  );
};

AddBusinessModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func,
};

const styles = StyleSheet.create({
  modalSheetBg: {
    backgroundColor: backgrounds.card[1],
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing[20],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
  },
  kicker: {
    fontSize: typography.fontSize.body.small,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 2,
  },
  title: {
    ...textStyles.titleLarge,
    color: colors.natural[900],
  },
  closeButton: {
    padding: spacing[4],
  },
  contentPadding: {
    padding: spacing[20],
    gap: spacing[12],
  },
  footer: {
    flexDirection: "row",
    padding: spacing[20],
    gap: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colors.natural[200],
    backgroundColor: backgrounds.card[1],
  },
  buttonWrapper: {
    flex: 1,
  },
});

export default AddBusinessModal;

import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { useForm, FormProvider } from "react-hook-form";
import {
  Button,
  TextInput,
  EmailInput,
  PasswordInput,
  MobileInput,
  TextAreaInput,
  ImageInput,
} from "../../commen";
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
      formData.append("name", values.name || "");
      formData.append("phoneNumber", values.phoneNumber || "");
      formData.append("email", values.email || "");
      formData.append("password", values.password || "");
      formData.append("description", values.description || "");
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>{cb("kicker", "Business")}</Text>
              <Text style={styles.title}>{cb("title", "Add Business")}</Text>
            </View>
            <TouchableOpacity onPress={close} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.natural[900]} />
            </TouchableOpacity>
          </View>

          <FormProvider {...methods}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                name="name"
                label={cb("name", "Name")}
                placeholder={cb("namePlaceholder", "Business name")}
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
                placeholder={cb("passwordPlaceholder", "At least 8 characters")}
                rules={{ required: cb("passwordRequired", "Password is required") }}
              />
              <TextAreaInput
                name="description"
                label={cb("description", "Description")}
                placeholder={cb("descriptionPlaceholder", "Optional")}
                maxLength={2000}
              />
              <ImageInput
                name="logo"
                label={cb("logo", "Logo")}
                placeholder={cb("logoPlaceholder", "Choose an image")}
              />
            </ScrollView>
          </FormProvider>

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
        </View>
      </View>
    </Modal>
  );
};

AddBusinessModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func,
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: backgrounds.card[1],
    borderTopLeftRadius: borderRadius[20],
    borderTopRightRadius: borderRadius[20],
    maxHeight: "92%",
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
  scroll: {
    flexGrow: 0,
  },
  content: {
    padding: spacing[20],
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

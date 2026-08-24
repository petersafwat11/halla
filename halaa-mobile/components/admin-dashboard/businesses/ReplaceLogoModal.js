import React from "react";
import { View, Modal, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { useForm, FormProvider } from "react-hook-form";
import { Button, ImageInput } from "../../commen";
import LocalizedText from "../../commen/LocalizedText";
import AdaptiveText from "../../commen/AdaptiveText";
import { useUpdateBusinessLogo } from "../../../hooks";
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
 * Admin "Replace Logo" modal — the mobile equivalent of web's
 * ReplaceLogoPopup. Requires a picked image, then PATCHes a multipart
 * FormData with the single `logo` field via useUpdateBusinessLogo.
 */
const ReplaceLogoModal = ({ visible, onClose, businessId, businessName, onSaved }) => {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const updateLogo = useUpdateBusinessLogo();
  const el = (key, fallback) => t(`businesses.editLogo.${key}`, fallback);

  const methods = useForm({ defaultValues: { logo: null } });

  const close = () => {
    methods.reset();
    onClose();
  };

  const onSubmit = async (values) => {
    if (!values.logo?.uri) {
      toast.warning(el("noFile", "Choose an image first."));
      return;
    }
    try {
      const formData = new FormData();
      formData.append("logo", {
        uri: values.logo.uri,
        name:
          values.logo.fileName || values.logo.uri.split("/").pop() || "logo.jpg",
        type: values.logo.type || "image/jpeg",
      });
      await updateLogo.mutateAsync({ businessId, data: formData });
      toast.success(el("success", "Logo updated."));
      methods.reset();
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error.message || el("error", "Could not update logo."));
    }
  };

  if (!visible) return null;

  const isSubmitting = updateLogo.isPending;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <LocalizedText style={styles.kicker}>{el("kicker", "Logo")}</LocalizedText>
              <LocalizedText style={styles.title}>{el("title", "Change logo")}</LocalizedText>
              {!!businessName && (
                <AdaptiveText style={styles.entityName} numberOfLines={1}>
                  {businessName}
                </AdaptiveText>
              )}
            </View>
            <TouchableOpacity onPress={close} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.natural[900]} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <FormProvider {...methods}>
              <ImageInput
                name="logo"
                label={el("logo", "Logo")}
                placeholder={el("logoPlaceholder", "Choose an image")}
              />
            </FormProvider>
          </View>

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
                text={isSubmitting ? el("saving", "Saving...") : el("save", "Save")}
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

ReplaceLogoModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  businessId: PropTypes.string,
  businessName: PropTypes.string,
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
  entityName: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[450],
    marginTop: 2,
  },
  closeButton: {
    padding: spacing[4],
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

export default ReplaceLogoModal;

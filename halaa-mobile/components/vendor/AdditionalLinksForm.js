import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "../../localization/hooks/useTranslation";
import TextInput from "../commen/TextInput";
import Button from "../commen/Button";
import { mobileSocialLinksSchema as socialLinksSchema } from "@halaa/shared/schemas/vendor";

const AdditionalLinksForm = ({ data, onSave, loading }) => {
  const { t } = useTranslation("vendor");
  const methods = useForm({
    resolver: zodResolver(socialLinksSchema(t)),
    defaultValues: {
      website: data?.website || "",
      instagram: data?.instagram || "",
      facebook: data?.facebook || "",
      twitter: data?.twitter || "",
      tiktok: data?.tiktok || "",
      whatsapp: data?.whatsapp || "",
    },
  });

  useEffect(() => {
    methods.reset({
      website: data?.website || "",
      instagram: data?.instagram || "",
      facebook: data?.facebook || "",
      twitter: data?.twitter || "",
      tiktok: data?.tiktok || "",
      whatsapp: data?.whatsapp || "",
    });
  }, [data?.website, data?.instagram, data?.facebook, data?.twitter, data?.tiktok, data?.whatsapp]);

  const onSubmit = (formValues) => {
    onSave({ socialLinks: formValues });
  };

  return (
    <FormProvider {...methods}>
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("settings.additionalLinks.title")}
          </Text>
          <Text style={styles.sectionDescription}>
            {t("settings.additionalLinks.description")}
          </Text>

          <View style={styles.inputGroup}>
            <TextInput
              name="whatsapp"
              label={t("settings.additionalLinks.whatsapp", "WhatsApp")}
              placeholder={t("settings.additionalLinks.whatsappPlaceholder", "+966 5XX XXX XXXX")}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              name="website"
              label={t("settings.additionalLinks.website")}
              placeholder={t("settings.additionalLinks.websitePlaceholder")}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              name="instagram"
              label={t("settings.additionalLinks.instagram")}
              placeholder={t("settings.additionalLinks.instagramPlaceholder")}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              name="facebook"
              label={t("settings.additionalLinks.facebook")}
              placeholder={t("settings.additionalLinks.facebookPlaceholder")}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              name="twitter"
              label={t("settings.additionalLinks.twitter")}
              placeholder={t("settings.additionalLinks.twitterPlaceholder")}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              name="tiktok"
              label={t("settings.additionalLinks.tiktok")}
              placeholder={t("settings.additionalLinks.tiktokPlaceholder")}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              text={t("settings.saveChanges")}
              onPress={methods.handleSubmit(onSubmit)}
              loading={loading}
              disabled={loading}
            />
          </View>
        </View>
      </View>
    </FormProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#888",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 8,
  },
  buttonContainer: {
    marginTop: 16,
  },
});

export default AdditionalLinksForm;

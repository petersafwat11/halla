import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { completeProfileSchema } from "../../utils/schemas/authSchemas";
import { TextInput, EmailInput, PasswordInput, Button } from "../commen";
import { useTranslation, useLanguage } from "../../localization";
import FormHeader from "./FormHeader";

const CompleteProfileForm = ({ onSubmit, loading = false }) => {
  const { t } = useTranslation("auth");
  const methods = useForm({
    resolver: zodResolver(completeProfileSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const { handleSubmit, setError } = methods;

  const onFormSubmit = async (data) => {
    if (onSubmit) {
      const result = await onSubmit(data);
      if (result && !result.success && result.fieldErrors) {
        Object.keys(result.fieldErrors).forEach((field) => {
          setError(field, {
            type: "server",
            message: result.fieldErrors[field]
          });
        });
      }
    }
  };

  return (
    <FormProvider {...methods}>
      <View style={styles.container}>
        <FormHeader
          title={t("signup.completeProfileTitle")}
          subtitle={t("signup.completeProfileSubtitle")}
        />

        <View style={styles.form}>
          <TextInput
            name="fullName"
            label={t("signup.fullName")}
            placeholder={t("signup.fullNamePlaceholder")}
            disabled={loading}
          />

          <EmailInput
            name="email"
            label={t("signup.email")}
            placeholder={t("signup.emailPlaceholder")}
            disabled={loading}
          />

          <PasswordInput
            name="password"
            label={t("signup.password")}
            placeholder={t("signup.passwordPlaceholder")}
            disabled={loading}
          />

          <PasswordInput
            name="confirmPassword"
            label={t("signup.confirmPassword")}
            placeholder={t("signup.confirmPasswordPlaceholder")}
            disabled={loading}
          />

          <View style={styles.buttonContainer}>
            <Button
              text={t("signup.completeButton")}
              onPress={handleSubmit(onFormSubmit)}
              loading={loading}
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
    alignItems: "flex-start"
  },form: {
    width: "100%",
    alignItems: "flex-start"
  },  buttonContainer: {
    width: "100%",
    marginTop: 16
  }
});

export default CompleteProfileForm;

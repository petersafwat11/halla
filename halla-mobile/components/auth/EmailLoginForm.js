import React from "react";
import { View, StyleSheet } from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailLoginSchema } from "../../utils/schemas/authSchemas";
import { EmailInput, PasswordInput, Button } from "../commen";
import { useTranslation } from "../../localization";
import FormHeader from "./FormHeader";

const EmailLoginForm = ({ onSubmit, loading = false }) => {
  const { t } = useTranslation("auth");

  const methods = useForm({
    resolver: zodResolver(emailLoginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { handleSubmit, setError } = methods;

  const onFormSubmit = async (data) => {
    if (onSubmit) {
      const result = await onSubmit(data);
      // Handle server errors
      if (result && !result.success && result.fieldErrors) {
        Object.keys(result.fieldErrors).forEach((field) => {
          setError(field, {
            type: "server",
            message: result.fieldErrors[field],
          });
        });
      }
    }
  };

  return (
    <FormProvider {...methods}>
      <View style={styles.container}>
        <FormHeader title={t("login.title")} subtitle={t("login.subtitle")} />

        <View style={styles.form}>
          <EmailInput
            name="email"
            label={t("login.email")}
            placeholder={t("login.emailPlaceholder")}
            disabled={loading}
          />

          <PasswordInput
            name="password"
            label={t("login.password")}
            placeholder={t("login.passwordPlaceholder")}
            disabled={loading}
          />

          <Button
            text={t("login.loginButton")}
            onPress={handleSubmit(onFormSubmit)}
            loading={loading}
          />
        </View>
      </View>
    </FormProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  form: {
    width: "100%",
  },
});

export default EmailLoginForm;

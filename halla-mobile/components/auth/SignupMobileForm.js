import React from "react";
import { View, StyleSheet } from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupMobileSchema } from "../../utils/schemas/authSchemas";
import { MobileInput, Button } from "../commen";
import { useTranslation } from "../../localization";
import FormHeader from "./FormHeader";

const SignupMobileForm = ({ onSubmit, loading = false }) => {
  const { t } = useTranslation("auth");

  const methods = useForm({
    resolver: zodResolver(signupMobileSchema),
    mode: "onBlur",
    defaultValues: {
      mobile: "",
    },
  });

  const { handleSubmit, setError } = methods;

  const onFormSubmit = async (data) => {
    if (onSubmit) {
      const result = await onSubmit(data);
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
        <FormHeader title={t("signup.title")} subtitle={t("signup.subtitle")} />

        <View style={styles.form}>
          <MobileInput
            name="mobile"
            label={t("signup.mobile")}
            placeholder={t("signup.mobilePlaceholder")}
            disabled={loading}
          />

          <Button
            text={t("signup.sendOTPButton")}
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

export default SignupMobileForm;

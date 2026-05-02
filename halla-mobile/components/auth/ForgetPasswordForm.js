import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgetPasswordSchema } from "../../utils/schemas/authSchemas";
import { EmailInput, Button } from "../commen";
import { useTranslation } from "../../localization";

const ForgetPasswordForm = ({ onSubmit, loading = false }) => {
  const { t } = useTranslation("auth");
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: zodResolver(forgetPasswordSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
    },
  });

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

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
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>🔒</Text>
        </View>
        <Text style={styles.title}>{t("forgetPassword.title")}</Text>
      </View>

      <Text style={styles.description}>{t("forgetPassword.subtitle")}</Text>

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <EmailInput
              label={t("forgetPassword.email")}
              placeholder={t("forgetPassword.emailPlaceholder")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              disabled={loading}
              error={errors.email && t(errors.email.message)}
            />
          )}
        />

        <Button
          text={t("forgetPassword.resetButton")}
          onPress={handleSubmit(onFormSubmit)}
          loading={loading}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 56,
  },
  title: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  form: {
    width: "100%",
  },
});

export default ForgetPasswordForm;

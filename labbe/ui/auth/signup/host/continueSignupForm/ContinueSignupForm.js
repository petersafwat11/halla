"use client";
import React, { useState, useEffect } from "react";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import ConfirmBtn from "@/ui/commen/confirmButton/ConfirmBtn";
import { useTranslation } from "react-i18next";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { hostProfileCompletionSchema } from "@/utils/schemas/authSchema";
import { useAuthMutation } from "@/hooks/auth";
import useAuthStore from "@/stores/authStore";
import useLanguageChange from "@/hooks/UseLanguageChange";
import { useRouter } from "next/navigation";
import styles from "./continueSignupForm.module.css";
import { getAuthErrorMessage } from "@/services/errorHandlingService";

const ContinueSignupForm = () => {
  const { t } = useTranslation("signup");
  const { t: tCommon } = useTranslation("common");
  const { currentLocale } = useLanguageChange();
  const router = useRouter();

  // Auth mutation
  const {
    mutateAsync: completeProfile,
    isPending: isLoading,
    error: mutationError,
  } = useAuthMutation("completeProfile");

  const rawError = mutationError?.parsedError || null;
  const mutationErrorInfo = getAuthErrorMessage(rawError, tCommon);
  const mutationErrorMsg = mutationErrorInfo?.message || "";

  // Auth store for auth state
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const error = mutationErrorMsg || localError;

  // Initialize React Hook Form
  const methods = useForm({
    resolver: zodResolver(hostProfileCompletionSchema(t)),
    mode: "onChange",
    defaultValues: {
      username: "",
      email: "",
      password: "",
      passwordConfirm: "",
    },
  });

  const {
    handleSubmit,
    watch,
    setError,
    formState: { isValid },
  } = methods;

  const formValues = watch();

  // Check if user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/${currentLocale}/signup`);
    }
  }, [isAuthenticated, currentLocale, router]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const onSubmit = async (formData) => {
    setLocalError("");

    try {
      await completeProfile({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.passwordConfirm,
      });
      router.push(`/${currentLocale}/host`);
    } catch (error) {
      // Surface duplicate-email / duplicate-username on the field that
      // caused it instead of dumping a generic toast. The duplicate-key
      // path returns { code: 'DUPLICATE_FIELD' | 'CONFLICT', field }.
      const parsed = error?.parsedError;
      const resolved = getAuthErrorMessage(parsed, tCommon);
      if (parsed && (parsed.code === "CONFLICT" || parsed.code === "DUPLICATE_FIELD")) {
        const fieldMap = { email: "email", phoneNumber: "email", username: "username" };
        const target = fieldMap[parsed.field] || "email";
        setError(target, { type: "server", message: resolved?.message || error.message });
        return;
      }
      setLocalError(
        resolved?.message ||
        error.message ||
        t("errors.complete_profile_failed", "Failed to complete profile. Please try again.")
      );
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.mainTitle}>
        {t("signupForm.continueSignup.title")}
      </h1>
      {/* <p className={styles.mainDescription}>
        {t("signupForm.continueSignup.description")}
      </p> */}

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.section}>
            {/* <h2 className={styles.sectionTitle}>
              {t("signupForm.continueSignup.personalInfo.title")}
            </h2> */}
            <div className={styles.inputsGroup}>
              <div className={styles.row}>
                <InputGroup
                  label={t(
                    "signupForm.continueSignup.personalInfo.fullName.label"
                  )}
                  type="text"
                  placeholder={t(
                    "signupForm.continueSignup.personalInfo.fullName.placeholder"
                  )}
                  name="username"
                  iconPath="auth/profile.svg"
                />
                <InputGroup
                  label={t(
                    "signupForm.continueSignup.personalInfo.email.label"
                  )}
                  type="email"
                  placeholder={t(
                    "signupForm.continueSignup.personalInfo.email.placeholder"
                  )}
                  name="email"
                  iconPath="auth/email.svg"
                />
              </div>
              <div className={styles.row}>
                <InputGroup
                  label={t(
                    "signupForm.continueSignup.personalInfo.newPassword.label"
                  )}
                  type={showPassword ? "text" : "password"}
                  placeholder={t(
                    "signupForm.continueSignup.personalInfo.newPassword.placeholder"
                  )}
                  name="password"
                  iconPath="auth/password.svg"
                  iconPath2="auth/eye.svg"
                  onIconClick={togglePasswordVisibility}
                />
                <InputGroup
                  label={t(
                    "signupForm.continueSignup.personalInfo.confirmPassword.label"
                  )}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t(
                    "signupForm.continueSignup.personalInfo.confirmPassword.placeholder"
                  )}
                  name="passwordConfirm"
                  iconPath="auth/password.svg"
                  iconPath2="auth/eye.svg"
                  onIconClick={toggleConfirmPasswordVisibility}
                />
              </div>
            </div>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.buttonContainer}>
            <ConfirmBtn
              text={t("signupForm.continueSignup.nextButton")}
              active={isValid && !isLoading}
              clickHandler={handleSubmit(onSubmit)}
              disabled={isLoading}
            />
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default ContinueSignupForm;

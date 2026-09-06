"use client";
import React, { useEffect } from "react";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import ConfirmBtn from "@/ui/commen/confirmButton/ConfirmBtn";
import { useTranslation } from "react-i18next";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { hostProfileCompletionSchema } from "@halaa/shared/schemas/auth";
import { useAuthMutation } from "@/hooks/auth";
import useAuthStore from "@/stores/authStore";
import useLanguageChange from "@/hooks/UseLanguageChange";
import { useRouter } from "next/navigation";
import styles from "./continueSignupForm.module.css";
import { getAuthErrorMessage } from "@/services/errorHandlingService";
import { FaArrowRightLong, FaArrowLeftLong } from "react-icons/fa6";

import { PASSWORD_COMPLEXITY_REGEX } from "@halaa/shared/schemas/_shared";

const ContinueSignupForm = () => {
  const { t, i18n } = useTranslation("signup");
  const { t: tContinue } = useTranslation("continueSignup");
  const { t: tCommon } = useTranslation("common");
  const { currentLocale } = useLanguageChange();
  const router = useRouter();
  const isRTL = i18n.language === "ar";

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

  const [localError, setLocalError] = React.useState("");

  const error = mutationErrorMsg || localError;

  // Initialize React Hook Form
  const methods = useForm({
    resolver: zodResolver(hostProfileCompletionSchema(t)),
    mode: "onBlur",
    defaultValues: {
      name: "",
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
  const password = formValues?.password || "";
  const passwordConfirm = formValues?.passwordConfirm || "";

  // Password live validation pills
  const passwordValidations = [
    {
      text: tContinue(
        "continueSignup.errors.passwordMinLength",
        isRTL ? "على الأقل 8 أحرف" : "At least 8 characters"
      ),
      isValid: Boolean(password && password.length >= 8),
    },
    {
      text: tContinue(
        "continueSignup.errors.passwordComplexity",
        isRTL
          ? "استخدم حرفاً واحداً ورقماً واحداً على الأقل، ويمكن استخدام الرموز"
          : "Use at least one letter and one number; symbols are allowed"
      ),
      isValid: Boolean(password && PASSWORD_COMPLEXITY_REGEX.test(password)),
    },
  ];

  const confirmValidations = password
    ? [
        {
          text: isRTL ? "كلمتا المرور متطابقتان" : "Passwords match",
          isValid: Boolean(
            passwordConfirm && password === passwordConfirm
          ),
        },
      ]
    : undefined;

  // Check if user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/${currentLocale}/signup`);
    }
  }, [isAuthenticated, currentLocale, router]);

  const onSubmit = async (formData) => {
    setLocalError("");

    try {
      await completeProfile({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.passwordConfirm,
      });
      router.push(`/${currentLocale}/host`);
    } catch (error) {
      // Surface duplicate-email / duplicate-name on the field that
      // caused it instead of dumping a generic toast. The duplicate-key
      // path returns { code: 'DUPLICATE_FIELD' | 'CONFLICT', field }.
      const parsed = error?.parsedError;
      const resolved = getAuthErrorMessage(parsed, tCommon);
      if (
        parsed &&
        (parsed.code === "CONFLICT" || parsed.code === "DUPLICATE_FIELD")
      ) {
        const fieldMap = {
          email: "email",
          phoneNumber: "email",
          name: "name",
        };
        const target = fieldMap[parsed.field] || "email";
        setError(target, {
          type: "server",
          message: resolved?.message || error.message,
        });
        return;
      }
      setLocalError(
        resolved?.message ||
          error.message ||
          t(
            "errors.complete_profile_failed",
            "Failed to complete profile. Please try again."
          )
      );
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.topNav}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.back()}
          aria-label={isRTL ? "رجوع" : "Back"}
        >
          {isRTL ? (
            <FaArrowRightLong className={styles.backArrow} />
          ) : (
            <FaArrowLeftLong className={styles.backArrow} />
          )}
        </button>

        <span className={styles.stepBadge}>
          {isRTL ? "الخطوة ٢ من ٢" : "Step 2 of 2"}
        </span>
      </div>

      <div className={styles.header}>
        <h1 className={styles.mainTitle}>
          {t("signupForm.continueSignup.title")}
        </h1>
        <p className={styles.mainDescription}>
          {t("signupForm.continueSignup.description")}
        </p>
      </div>

      <FormProvider {...methods}>
        <form noValidate dir={i18n.dir()} onSubmit={handleSubmit(onSubmit)} className={styles.formCard}>
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
                name="name"
                direction="auto"
                disabled={isLoading}
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
                direction="ltr"
                disabled={isLoading}
                iconPath="auth/email.svg"
              />
            </div>
            <div className={styles.row}>
              <InputGroup
                label={t(
                  "signupForm.continueSignup.personalInfo.newPassword.label"
                )}
                type="password"
                placeholder={t(
                  "signupForm.continueSignup.personalInfo.newPassword.placeholder"
                )}
                name="password"
                disabled={isLoading}
                iconPath="auth/password.svg"
                validations={passwordValidations}
              />
              <InputGroup
                label={t(
                  "signupForm.continueSignup.personalInfo.confirmPassword.label"
                )}
                type="password"
                placeholder={t(
                  "signupForm.continueSignup.personalInfo.confirmPassword.placeholder"
                )}
                name="passwordConfirm"
                disabled={isLoading}
                iconPath="auth/password.svg"
                validations={confirmValidations}
              />
            </div>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.buttonContainer}>
            <ConfirmBtn
              text={t("signupForm.continueSignup.nextButton")}
              active={isValid && !isLoading}
              clickHandler={handleSubmit(onSubmit)}
              disabled={isLoading}
              isLoading={isLoading}
              className={styles.submitBtn}
            />
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default ContinueSignupForm;

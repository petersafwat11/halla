"use client";
import React, { useState, useCallback, useEffect } from "react";
import Stepper from "../../../commen/stepper/Stepper";
import styles from "./whiteLabelform.module.css";
import StepOne from "./stepOne/StepOne";
import StepTwo from "./stepTwo/StepTwo";
import StepThree from "./stepThreee/StepThree";
import StepFive from "./stepFive/StepFive";
import StepSix from "./stepSix/StepSix";
import { useTranslation } from "react-i18next";
import { FormProvider, useForm } from "react-hook-form";
import { whitelabelSignupSchema } from "@/utils/schemas/authSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthMutation } from "@/hooks/reactQueryHooks/useAuthMutation";
import FormHeader from "../../../commen/formHeader/FormHeader";
import {
  validateFormStep,
  handleNextStep as utilNextStep,
  handlePrevStep as utilPrevStep,
  buildWhitelabelFormData,
  WHITELABEL_STEP_FIELDS,
} from "@/utils/authFormHelpers";
import { toastUtils } from "@/utils/toastUtils";
import useLanguageChange from "@/hooks/UseLanguageChange";
import ErrorDisplay from "@/ui/commen/ErrorDisplay";
import { getAuthErrorMessage, handleError } from "@/services/errorHandlingService";

const WhiteLabelForm = () => {
  const { t } = useTranslation("signup");
  const { t: tCommon } = useTranslation("common");
  const { currentLocale } = useLanguageChange();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStep = parseInt(searchParams.get("step"), 10) || 1;
  const [step, setStep] = useState(initialStep);
  const [currentStepValidity, setCurrentStepValidity] = useState(false);

  // Auth mutation
  const {
    mutateAsync: signupWhiteLabel,
    isPending: isSubmitting,
    error: mutationError,
  } = useAuthMutation("signupWhiteLabel");

  const storeError = mutationError?.parsedError || null;
  const errorInfo = getAuthErrorMessage(storeError, tCommon);

  // Steps matching schema structure:
  // 1: identity, 2: loginData, 3: systemRequirements, 4: planSelection, 5: summary
  const steps = [
    { id: 1, desc: t("signupForm.whiteLabel.steps.identity") },
    { id: 2, desc: t("signupForm.whiteLabel.steps.login") },
    { id: 3, desc: t("signupForm.whiteLabel.steps.requirements") },
    { id: 4, desc: t("signupForm.whiteLabel.steps.choosePlan") },
    { id: 5, desc: t("signupForm.whiteLabel.steps.summary") },
  ];

  const methods = useForm({
    resolver: zodResolver(whitelabelSignupSchema(t)),
    reValidateMode: "onChange",
    shouldFocusError: false,
    mode: "onTouched",
    defaultValues: {
      identity: { address: {} },
      loginData: {},
      systemRequirements: { eventTypes: [] },
      planSelection: { billingCycle: "yearly", needsCustomBranding: false },
    },
  });

  // Validate current step using utility
  const validateCurrentStep = useCallback(() => {
    const stepFields = WHITELABEL_STEP_FIELDS[step];
    if (!stepFields || stepFields.length === 0) return true;

    return validateFormStep({
      schema: whitelabelSignupSchema,
      stepFields,
      getValues: methods.getValues,
      setError: methods.setError,
      clearErrors: methods.clearErrors,
      t,
    });
  }, [step, methods, t]);

  const handleSetStepCallback = useCallback(
    (newStep) => {
      if (newStep > step && !currentStepValidity) {
        return;
      }
      setStep(newStep);
      const params = new URLSearchParams(window.location.search);
      params.set("step", newStep);
      router.replace(`?${params.toString()}`);
    },
    [step, currentStepValidity, router],
  );

  const handleSubmitWhiteLabel = useCallback(async () => {
    const formValues = methods.getValues();

    // Build FormData using utility function
    const formData = buildWhitelabelFormData(formValues);

    try {
      await signupWhiteLabel(formData);
      // Show success toast
      toastUtils.success(t("signupForm.whiteLabel.success"));
      router.push(`/${currentLocale}/login`);
    } catch (error) {
      handleError(error, t, { fallbackMessage: "signupForm.whiteLabel.errorMessage" });
    }
  }, [methods, signupWhiteLabel, t, router, currentLocale]);

  const handleNext = useCallback((e) => {
    e.preventDefault();

    // If on last step (summary), submit the form
    if (step === steps.length) {
      handleSubmitWhiteLabel();
      return;
    }

    // Validate and navigate
    utilNextStep({
      currentStep: step,
      totalSteps: steps.length,
      setStep,
      validateStep: validateCurrentStep,
      router,
    });
  }, [step, steps.length, handleSubmitWhiteLabel, validateCurrentStep, router]);

  const goToPreviousStep = useCallback(() => {
    utilPrevStep({
      currentStep: step,
      setStep,
      router,
    });
  }, [step, router]);

  useEffect(() => {
    // Step 4 (plan selection) and Step 5 (summary) are always valid
    if (step === 4 || step === 5) {
      setCurrentStepValidity(true);
    } else {
      setCurrentStepValidity(false);
    }
  }, [step]);

  return (
    <div>
      <div className={styles.form_header}>
        <FormHeader />
      </div>
      <div className={styles.container}>
        <FormProvider {...methods}>
          <div className={styles.stepper_desk}>
            <Stepper
              step={step}
              setStep={handleSetStepCallback}
              steps={steps}
              isCurrentStepValid={currentStepValidity}
            />
          </div>

          <div className={styles.page_content}>
            <div className={styles.top_text}>
              <h2 className={styles.top_text_title}>
                {t("signupForm.whiteLabel.title")}
              </h2>
              <p className={styles.top_text_description}>
                {t("signupForm.whiteLabel.description")}
              </p>
            </div>

            <div className={styles.stepper_container}>
              <Stepper
                step={step}
                setStep={handleSetStepCallback}
                steps={steps}
                isCurrentStepValid={currentStepValidity}
              />
            </div>
            <div className={styles.page_container}>
              <div className={styles.form_container}>
                <div className={styles.form_content}>
                  <div className={styles.step_container}>
                    {/* Step 1: Identity (arabicName, englishName, colors, company info, address) */}
                    {step === 1 && <StepOne handleNext={handleNext} />}

                    {/* Step 2: Login Data (email, phone number only) */}
                    {step === 2 && (
                      <StepTwo goToPreviousStep={goToPreviousStep} />
                    )}

                    {/* Step 3: System Requirements (events, guests, eventTypes) */}
                    {step === 3 && (
                      <StepThree goToPreviousStep={goToPreviousStep} />
                    )}

                    {/* Step 4: Plan Selection */}
                    {step === 4 && (
                      <StepFive goToPreviousStep={goToPreviousStep} />
                    )}

                    {/* Step 5: Summary */}
                    {step === 5 && (
                      <StepSix goToPreviousStep={goToPreviousStep} />
                    )}
                  </div>
                  {errorInfo && (
                    <ErrorDisplay
                      error={errorInfo.message}
                      type={errorInfo.type}
                      field={errorInfo.field}
                      actionLink={
                        errorInfo.actionLink
                          ? `/${currentLocale}/login`
                          : null
                      }
                      actionText={
                        errorInfo.actionLink
                          ? tCommon("authErrors.loginAction")
                          : null
                      }
                    />
                  )}
                  <div className={styles.buttons}>
                    {step > 1 && (
                      <button
                        className={styles.back_button}
                        type="button"
                        onClick={goToPreviousStep}
                        disabled={isSubmitting}
                      >
                        {t("signupForm.initialForm.buttons.backButton")}
                      </button>
                    )}
                    <button
                      className={`${styles.confirm_button} ${styles.active}`}
                      type="button"
                      onClick={handleNext}
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? t("signupForm.submitting")
                        : step === 5
                          ? t("signupForm.initialForm.buttons.submitButton")
                          : t(
                            "signupForm.initialForm.buttons.continueButton",
                          )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FormProvider>
      </div>
    </div>
  );
};

export default WhiteLabelForm;

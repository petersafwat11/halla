"use client";
import React, { useState, useCallback, useEffect } from "react";
import Stepper from "../../../commen/stepper/Stepper";
import styles from "./vendorSignup.module.css";
import StepOne from "./stepOne/StepOne";
import StepTwo from "./stepTwo/StepTwo";
import StepThree from "./stepThree/StepThree";
import StepFour from "./stepFour/StepFour";
import StepFive from "./stepFive/StepFive";
import { useTranslation } from "react-i18next";
import { FormProvider, useForm } from "react-hook-form";
import { vendorSignupSchema } from "@/utils/schemas/authSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import StepSix from "./stepSix/StepSix";
import { useAuthMutation } from "@/hooks/reactQueryHooks/useAuthMutation";
import FormHeader from "@/ui/commen/formHeader/FormHeader";
import {
  validateFormStep,
  handleNextStep as utilNextStep,
  handlePrevStep as utilPrevStep,
  buildVendorFormData,
  VENDOR_STEP_FIELDS,
} from "@/services/auth";
import { toastUtils } from "@/utils/toastUtils";
import useLanguageChange from "@/hooks/UseLanguageChange";
import ErrorDisplay from "@/ui/commen/ErrorDisplay";
import { getAuthErrorMessage, handleError } from "@/services/errorHandlingService";

const VendorSignup = () => {
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
    mutateAsync: signupVendor,
    isPending: isSubmitting,
    error: mutationError,
  } = useAuthMutation("signupVendor");

  const storeError = mutationError?.parsedError || null;
  const errorInfo = getAuthErrorMessage(storeError, tCommon);

  const steps = [
    { id: 1, desc: t("signupForm.vendor.steps.identity") },
    { id: 2, desc: t("signupForm.vendor.steps.serviceData") },
    { id: 3, desc: t("signupForm.vendor.steps.samplesAndPackages") },
    { id: 4, desc: t("signupForm.vendor.steps.commercialVerification") },
    { id: 5, desc: t("signupForm.vendor.steps.otherLinksAndData") },
    { id: 6, desc: t("signupForm.vendor.steps.summary") },
  ];

  const methods = useForm({
    resolver: zodResolver(vendorSignupSchema(t)),
    reValidateMode: "onChange",
    shouldFocusError: false,
    mode: "onTouched",
    defaultValues: {
      identity: {},
      serviceData: { serviceLocation: { coverageType: "city" } },
      samplesAndPackages: { portfolioImages: [], pricePackages: [] },
      commercialVerification: {},
      socialLinks: {},
    },
  });

  // Validate current step using utility
  const validateCurrentStep = useCallback(() => {
    const stepFields = VENDOR_STEP_FIELDS[step];
    if (!stepFields) return true;

    return validateFormStep({
      schema: vendorSignupSchema,
      stepFields,
      getValues: methods.getValues,
      setError: methods.setError,
      clearErrors: methods.clearErrors,
      t,
    });
  }, [step, methods, t]);

  const handleSetStep = useCallback(
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

  const handleNext = (e) => {
    e.preventDefault();

    // If on last step, submit
    if (step === steps.length) {
      onFinalSubmit();
      return;
    }

    const success = utilNextStep({
      currentStep: step,
      totalSteps: steps.length,
      setStep,
      validateStep: validateCurrentStep,
      router,
    });

    if (success) {
      setCurrentStepValidity(true);
    }
  };

  const handleSubmitVendor = useCallback(async () => {
    const formValues = methods.getValues();

    // Build FormData using utility function
    const formData = buildVendorFormData(formValues);

    try {
      await signupVendor(formData);
      // Show success toast
      toastUtils.success(t("signupForm.vendor.successMessage"));
      router.push(`/${currentLocale}/login`);
    } catch (error) {
      handleError(error, t, { fallbackMessage: "signupForm.vendor.errorMessage" });
    }
  }, [methods, signupVendor, t, router, currentLocale]);

  const onFinalSubmit = useCallback(
    methods.handleSubmit(() => handleSubmitVendor()),
    [methods, handleSubmitVendor]
  );

  const goToPreviousStep = useCallback(() => {
    utilPrevStep({
      currentStep: step,
      setStep,
      router,
    });
  }, [step, router]);

  useEffect(() => {
    setCurrentStepValidity(false);
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
              setStep={handleSetStep}
              steps={steps}
              isCurrentStepValid={currentStepValidity}
            />
          </div>

          <div className={styles.page_content}>
            <div className={styles.top_text}>
              <h2 className={styles.top_text_title}>
                {t("signupForm.vendor.welcomeTitle")}
              </h2>
              <p className={styles.top_text_description}>
                {t("signupForm.vendor.welcomeDescription")}
              </p>
            </div>

            <div className={styles.stepper_container}>
              <Stepper
                step={step}
                setStep={handleSetStep}
                steps={steps}
                isCurrentStepValid={currentStepValidity}
              />
            </div>

            <div className={styles.page_container}>
              <div className={styles.form_container}>
                <div className={styles.form_content}>
                  <div className={styles.step_container}>
                    {step === 1 ? (
                      <StepOne handleNext={handleNext} />
                    ) : step === 2 ? (
                      <StepTwo goToPreviousStep={goToPreviousStep} />
                    ) : step === 3 ? (
                      <StepThree goToPreviousStep={goToPreviousStep} />
                    ) : step === 4 ? (
                      <StepFour goToPreviousStep={goToPreviousStep} />
                    ) : step === 5 ? (
                      <StepFive goToPreviousStep={goToPreviousStep} />
                    ) : step === 6 ? (
                      <StepSix goToPreviousStep={goToPreviousStep} />
                    ) : null}
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
                      onClick={
                        step === steps.length ? onFinalSubmit : handleNext
                      }
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? t("signupForm.vendor.submitting")
                        : step === steps.length
                          ? t("signupForm.vendor.summary.submit")
                          : t("signupForm.initialForm.buttons.continueButton")}
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

export default VendorSignup;

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
import {
  validateFormStep,
  handleNextStep as utilNextStep,
  handlePrevStep as utilPrevStep,
  buildVendorFormData,
  VENDOR_STEP_FIELDS,
} from "@/utils/authFormHelpers";
import { toastUtils } from "@/utils/toastUtils";
import useLanguageChange from "@/hooks/UseLanguageChange";
import ErrorDisplay from "@/ui/commen/ErrorDisplay";
import { getAuthErrorMessage, handleError } from "@/services/errorHandlingService";
import Buttons from "@/app/[lang]/host/create-event/_components/buttons/Buttons";

/**
 * Map flat backend Zod field names (vendorSignupSchema) to the nested
 * react-hook-form paths used in this form. Without this, backend
 * validation errors silently no-op because `setError("email", ...)`
 * doesn't match the registered `identity.email`.
 */
const VENDOR_FIELD_MAP = {
  email: "identity.email",
  phoneNumber: "identity.phoneNumber",
  password: "identity.password",
  passwordConfirm: "identity.passwordConfirm",
  brandName: "identity.brandName",
  ownerFullName: "identity.ownerFullName",
  serviceDescription: "serviceData.serviceDescription",
  serviceCategories: "serviceData.eventPlanning",
  serviceLocation: "serviceData.serviceLocation",
  otherData: "serviceData.otherData",
  socialLinks: "socialLinks.instagram",
  nationalId: "commercialVerification.nationalId",
  commercialRecordNumber: "commercialVerification.commercialRecordNumber",
};
const mapVendorBackendField = (backendField) => {
  if (!backendField) return null;
  return VENDOR_FIELD_MAP[backendField] || backendField;
};

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
      // Surface backend Zod validation errors inline on the offending
      // fields, then jump the stepper to the first step that contains
      // one. Without this, users only see a single concatenated toast
      // and can't tell which field to fix.
      const parsed = error?.parsedError;
      const fieldErrors = Array.isArray(parsed?.errors) ? parsed.errors : [];
      if (fieldErrors.length > 0) {
        fieldErrors.forEach((e) => {
          const formPath = mapVendorBackendField(e?.field);
          if (formPath) methods.setError(formPath, { type: "server", message: e.message });
        });
        // Backend also sends `field` for ConflictError (single field).
        if (parsed?.field && parsed.code === "CONFLICT") {
          const conflictMsg = getAuthErrorMessage(parsed, tCommon)?.message;
          if (conflictMsg) {
            if (parsed.field === "email_and_phone") {
              methods.setError("identity.email", { type: "server", message: conflictMsg });
              methods.setError("identity.phoneNumber", { type: "server", message: conflictMsg });
            } else {
              const formField = parsed.field === "phone" ? "phoneNumber" : parsed.field;
              methods.setError(`identity.${formField}`, { type: "server", message: conflictMsg });
            }
          }
        }
        // Find the step containing the first errored field. We compare
        // against the MAPPED form path (e.g. `identity.email`) because
        // VENDOR_STEP_FIELDS holds nested prefixes, not flat backend keys.
        const firstFormPath = mapVendorBackendField(fieldErrors[0].field) || "";
        for (const [stepNum, fields] of Object.entries(VENDOR_STEP_FIELDS)) {
          if (fields?.some((f) => firstFormPath.startsWith(f))) {
            setStep(parseInt(stepNum, 10));
            break;
          }
        }
        return;
      }
      // Single-field conflict (no errors[] array) — still attach inline.
      if (parsed?.code === "CONFLICT" && parsed?.field) {
        const conflictMsg = getAuthErrorMessage(parsed, tCommon)?.message;
        if (conflictMsg) {
          if (parsed.field === "email_and_phone") {
            methods.setError("identity.email", { type: "server", message: conflictMsg });
            methods.setError("identity.phoneNumber", { type: "server", message: conflictMsg });
          } else {
            const formField = parsed.field === "phone" ? "phoneNumber" : parsed.field;
            methods.setError(`identity.${formField}`, { type: "server", message: conflictMsg });
          }
          setStep(1);
          return;
        }
      }
      handleError(error, t, { fallbackMessage: "signupForm.vendor.errorMessage" });
    }
  }, [methods, signupVendor, t, router, currentLocale, tCommon]);

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
                    <Buttons
                      onNext={step === steps.length ? onFinalSubmit : handleNext}
                      onPrevious={goToPreviousStep}
                      isNextDisabled={isSubmitting}
                      showPrevious={step > 1}
                      hidePrevious={step === 1}
                      isLoading={isSubmitting}
                      currentStep={step}
                      totalSteps={steps.length}
                      previousLabel={t("signupForm.initialForm.buttons.backButton")}
                      nextLabel={t("signupForm.initialForm.buttons.continueButton")}
                      saveLabel={t("signupForm.vendor.summary.submit")}
                      savingLabel={t("signupForm.vendor.submitting")}
                    />
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

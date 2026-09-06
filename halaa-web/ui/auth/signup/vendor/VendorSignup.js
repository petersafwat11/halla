"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import Stepper from "../../../commen/stepper/Stepper";
import styles from "./vendorSignup.module.css";
import StepOne from "./stepOne/StepOne";
import StepTwo from "./stepTwo/StepTwo";
import StepThree from "./stepThree/StepThree";
import StepFour from "./stepFour/StepFour";
import StepFive from "./stepFive/StepFive";
import { useTranslation } from "react-i18next";
import { FormProvider, useForm } from "react-hook-form";
import { vendorSignupSchema } from "@halaa/shared/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import StepSix from "./stepSix/StepSix";
import { useAuthMutation } from "@/hooks/auth";
import {
  validateFormStep,
  handleNextStep as utilNextStep,
  handlePrevStep as utilPrevStep,
  buildVendorFormData,
  VENDOR_STEP_FIELDS,
} from "@/utils/authFormHelpers";
import {
  saveVendorDraft,
  loadVendorDraft,
  clearVendorDraft,
} from "@/utils/vendorDraftStorage";
import { toastUtils } from "@/utils/toastUtils";
import useLanguageChange from "@/hooks/UseLanguageChange";
import ErrorDisplay from "@/ui/commen/ErrorDisplay";
import { getAuthErrorMessage, handleError } from "@/services/errorHandlingService";
import Buttons from "@/app/[lang]/host/create-event/_components/buttons/Buttons";

/**
 * Map flat backend Zod field names (vendorSignupSchema) to the nested
 * react-hook-form paths used in this form.
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
  location: "serviceData.serviceLocation",
  otherData: "serviceData.otherData",
  socialLinks: "socialLinks.whatsapp",
  nationalId: "commercialVerification.nationalId",
  commercialRecordNumber: "commercialVerification.commercialRecordNumber",
  commercialRegistrationNumber: "commercialVerification.commercialRecordNumber",
  commercialRecordImage: "commercialVerification.commercialRecordImage",
  nationalIdImage: "commercialVerification.nationalIdImage",
  portfolioImages: "samplesAndPackages.portfolioImages",
  pricePackages: "samplesAndPackages.pricePackages",
  profileFile: "samplesAndPackages.profileFile",
  businessLogo: "samplesAndPackages.businessLogo",
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

  // Clamp step strictly to 1–6
  const rawStep = parseInt(searchParams?.get("step"), 10);
  const initialStep = isNaN(rawStep) ? 1 : Math.max(1, Math.min(6, rawStep));

  const [step, setStep] = useState(initialStep);
  const [currentStepValidity, setCurrentStepValidity] = useState(false);
  const isSubmittedRef = useRef(false);

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
    { id: 5, desc: t("signupForm.vendor.steps.socialLinks") },
    { id: 6, desc: t("signupForm.vendor.steps.summary") },
  ];

  const methods = useForm({
    resolver: zodResolver(vendorSignupSchema(t)),
    reValidateMode: "onChange",
    shouldFocusError: false,
    mode: "onBlur",
    defaultValues: {
      identity: { preferredLanguage: currentLocale || "ar" },
      serviceData: { serviceLocation: { coverageType: "city" } },
      samplesAndPackages: { portfolioImages: [], pricePackages: [] },
      commercialVerification: {},
      socialLinks: {},
    },
  });

  // Restore non-sensitive draft on mount
  useEffect(() => {
    const draft = loadVendorDraft(currentLocale);
    if (draft) {
      methods.reset((prev) => ({
        ...prev,
        ...draft,
        // Ensure sensitive fields and files are never populated from draft
        identity: {
          ...prev?.identity,
          ...draft?.identity,
          password: "",
          passwordConfirm: "",
        },
        commercialVerification: {
          nationalId: "",
          commercialRecordNumber: "",
          nationalIdImage: null,
          commercialRecordImage: null,
        },
        samplesAndPackages: {
          portfolioImages: [],
          pricePackages: [],
          businessLogo: null,
          profileFile: null,
        },
      }));
    }
  }, [currentLocale, methods]);

  // Autosave non-sensitive form state
  useEffect(() => {
    const subscription = methods.watch((values) => {
      if (!isSubmittedRef.current) {
        saveVendorDraft(values, currentLocale);
      }
    });
    return () => subscription.unsubscribe();
  }, [methods, currentLocale]);

  // Warn before abandoning dirty draft
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (methods.formState.isDirty && !isSubmittedRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [methods.formState.isDirty]);

  // Validate a specific step
  const validateStepNumber = useCallback(
    (stepNum) => {
      const stepFields = VENDOR_STEP_FIELDS[stepNum];
      if (!stepFields) return true;

      return validateFormStep({
        schema: vendorSignupSchema,
        stepFields,
        getValues: methods.getValues,
        setError: methods.setError,
        clearErrors: methods.clearErrors,
        t,
      });
    },
    [methods, t]
  );

  // Validate current step using utility
  const validateCurrentStep = useCallback(() => {
    return validateStepNumber(step);
  }, [step, validateStepNumber]);

  // Check URL query step on mount / update: clamp to earliest incomplete step
  useEffect(() => {
    if (initialStep > 1) {
      for (let s = 1; s < initialStep; s++) {
        const ok = validateStepNumber(s);
        if (!ok) {
          setStep(s);
          const params = new URLSearchParams(window.location.search);
          params.set("step", s);
          router.replace(`?${params.toString()}`);
          return;
        }
      }
    }
  }, [initialStep, validateStepNumber, router]);

  // Stepper navigation handler: allows backward visits, validates intervening steps for forward visits
  const handleSetStep = useCallback(
    (targetStep) => {
      if (targetStep <= step) {
        setStep(targetStep);
        const params = new URLSearchParams(window.location.search);
        params.set("step", targetStep);
        router.replace(`?${params.toString()}`);
        return;
      }

      // Forward visit requires all intervening steps to validate
      for (let s = step; s < targetStep; s++) {
        const ok = validateStepNumber(s);
        if (!ok) {
          setStep(s);
          const params = new URLSearchParams(window.location.search);
          params.set("step", s);
          router.replace(`?${params.toString()}`);
          return;
        }
      }

      setStep(targetStep);
      const params = new URLSearchParams(window.location.search);
      params.set("step", targetStep);
      router.replace(`?${params.toString()}`);
    },
    [step, validateStepNumber, router]
  );

  const handleNext = (e) => {
    e.preventDefault();

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

  const goToPreviousStep = useCallback(() => {
    utilPrevStep({
      currentStep: step,
      setStep,
      router,
    });
  }, [step, router]);

  const handleSubmitVendor = useCallback(
    async (formValues) => {
      // Build multipart FormData with canonical fields and files
      const formData = buildVendorFormData(formValues);

      try {
        const response = await signupVendor(formData);
        isSubmittedRef.current = true;
        clearVendorDraft(currentLocale);

        const appId =
          response?.data?.applicationId || response?.applicationId || "";

        toastUtils.success(
          t("signupForm.vendor.successMessage", {
            defaultValue: "تم استلام طلبك بنجاح وهو قيد المراجعة",
          })
        );

        // Redirect to dedicated pending confirmation page (NEVER directly to login!)
        router.push(
          `/${currentLocale}/signup-vendor/pending${
            appId ? `?id=${encodeURIComponent(appId)}` : ""
          }`
        );
      } catch (error) {
        const parsed = error?.parsedError;
        const fieldErrors = Array.isArray(parsed?.errors) ? parsed.errors : [];
        if (fieldErrors.length > 0) {
          fieldErrors.forEach((e) => {
            const formPath = mapVendorBackendField(e?.field);
            if (formPath) {
              const requiredFileKeys = {
                portfolioImages: "signupForm.vendor.samplesAndPackages.errors.portfolioImagesRequired",
                pricePackages: "signupForm.vendor.samplesAndPackages.errors.pricePackagesRequired",
              };
              const message = e.code === "required_file" && requiredFileKeys[e.field]
                ? t(requiredFileKeys[e.field]) : e.message;
              methods.setError(formPath, { type: "server", message });
            }
          });
          if (parsed?.field && parsed.code === "CONFLICT") {
            const conflictMsg = getAuthErrorMessage(parsed, tCommon)?.message;
            if (conflictMsg) {
              if (parsed.field === "email_and_phone") {
                methods.setError("identity.email", {
                  type: "server",
                  message: conflictMsg,
                });
                methods.setError("identity.phoneNumber", {
                  type: "server",
                  message: conflictMsg,
                });
              } else {
                const formField =
                  parsed.field === "phone" ? "phoneNumber" : parsed.field;
                methods.setError(`identity.${formField}`, {
                  type: "server",
                  message: conflictMsg,
                });
              }
            }
          }
          const firstFormPath =
            mapVendorBackendField(fieldErrors[0].field) || "";
          for (const [stepNum, fields] of Object.entries(VENDOR_STEP_FIELDS)) {
            if (fields?.some((f) => firstFormPath.startsWith(f))) {
              setStep(parseInt(stepNum, 10));
              break;
            }
          }
          return;
        }
        if (parsed?.code === "CONFLICT" && parsed?.field) {
          const conflictMsg = getAuthErrorMessage(parsed, tCommon)?.message;
          if (conflictMsg) {
            if (parsed.field === "email_and_phone") {
              methods.setError("identity.email", {
                type: "server",
                message: conflictMsg,
              });
              methods.setError("identity.phoneNumber", {
                type: "server",
                message: conflictMsg,
              });
            } else {
              const formField =
                parsed.field === "phone" ? "phoneNumber" : parsed.field;
              methods.setError(`identity.${formField}`, {
                type: "server",
                message: conflictMsg,
              });
            }
            setStep(1);
            return;
          }
        }
        handleError(error, t, { fallbackMessage: "signupForm.vendor.errorMessage" });
      }
    },
    [signupVendor, t, router, currentLocale, tCommon, methods]
  );

  // On validation failure during final submit: find earliest error, navigate to step, and focus
  const onInvalidSubmit = useCallback(
    (errors) => {
      toastUtils.error(
        t("signupForm.vendor.errors.correctErrorsBeforeSubmit", {
          defaultValue: "يرجى مراجعة وتصحيح الحقول المطلوبة قبل إرسال الطلب",
        })
      );

      let earliestStep = 6;
      let earliestField = null;

      for (let s = 1; s <= 5; s++) {
        const fields = VENDOR_STEP_FIELDS[s] || [];
        for (const field of fields) {
          if (errors[field]) {
            if (s < earliestStep) {
              earliestStep = s;
              earliestField = field;
            }
          }
        }
      }

      if (earliestStep < 6) {
        setStep(earliestStep);
        const params = new URLSearchParams(window.location.search);
        params.set("step", earliestStep);
        router.replace(`?${params.toString()}`);

        setTimeout(() => {
          const selector = `[name^="${earliestField}"]`;
          const input = document.querySelector(selector);
          input?.focus?.();
        }, 100);
      }
    },
    [t, router]
  );

  const onFinalSubmit = methods.handleSubmit(
    (validValues) => handleSubmitVendor(validValues),
    onInvalidSubmit
  );

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
                      <StepSix
                        goToPreviousStep={goToPreviousStep}
                        onEditStep={handleSetStep}
                      />
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

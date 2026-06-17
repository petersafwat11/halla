import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { FormProvider, useForm } from "react-hook-form";
import EventsService from "../../../hooks/events/useEventForm";
import { useTranslation } from "../../../localization";
import { useMySubscription } from "../../../hooks";
import StepOne from "../../createEvent/StepOne";
import StepTwo from "../../createEvent/StepTwo";
import StepThree from "../../createEvent/StepThree";
import StepFour from "../../createEvent/StepFour";
import StepHeader from "../../createEvent/StepHeader";
import PrevAndNextBtns from "../../createEvent/PrevAndNextBtns";
import { spacing } from "../../../styles/tokens";

const TOTAL_STEPS = 4;

const STEP_INFO = (t) => [
  { title: t("events.steps.eventDetails"), description: "" },
  { title: t("events.steps.guestList"), description: "" },
  { title: t("events.steps.template"), description: "" },
  { title: t("events.steps.messages"), description: "" },
];

/**
 * Maps API event response to form default values
 */
const mapApiToFormValues = (eventData) => {
  if (!eventData) return EventsService.getDefaultFormValues();
  
  const details = eventData.eventDetails || eventData;
  const guestList = (eventData.guestList || []).map((g, i) => ({
    id: g._id || i,
    name: g.name || "",
    phone: g.phone || g.mobile || "",
  }));
  const staffList = (eventData.staffList || []).map((m, i) => ({
    id: m._id || i,
    name: m.name || "",
    phone: m.phone || m.mobile || "",
  }));
  // Phase 4c W2-MOBILE-RENAME — read canonical fields first, fall back
  // to legacy `invitationSettings.*` during the dual-write window.
  const inv = eventData.invitationSettings || {};
  const canonicalReplies = eventData.guestReplies || {};

  return {
    ...EventsService.getDefaultFormValues(),
    eventName: details.title || details.name || "",
    eventType: details.type || "",
    eventDate: details.date || null,
    eventTime: details.time || "",
    address: details.location || {
      address: details.locationText || "",
      latitude: 24.7136,
      longitude: 46.6753,
      city: "",
      country: "",
    },
    description: details.description || "",
    guestList,
    staffList,
    selectedTemplate: inv.selectedTemplate || null,
    taqnyatTemplate: eventData.taqnyatTemplate || null,
    visualTemplate: eventData.visualTemplate || inv.visualTemplate || { isCustomUpload: true, fieldValues: {} },
    invitationMessage: eventData.invitationMessage || inv.invitationMessage || "",
    attendanceAutoReply: canonicalReplies.onAttend || inv.attendanceAutoReply || "",
    absenceAutoReply: canonicalReplies.onAbsent || inv.absenceAutoReply || "",
    expectedAttendanceAutoReply:
      canonicalReplies.onExpected || inv.expectedAttendanceAutoReply || "",
    guestReplies: {
      onAttend: canonicalReplies.onAttend || inv.attendanceAutoReply || "",
      onAbsent: canonicalReplies.onAbsent || inv.absenceAutoReply || "",
      onExpected: canonicalReplies.onExpected || inv.expectedAttendanceAutoReply || "",
    },
    hostNote: eventData.hostNote || inv.note || "",
    note: inv.note || eventData.hostNote || "",
    templateBrideName: inv.templateBrideName || "",
    templateGroomName: inv.templateGroomName || "",
  };
};

const UpdateEventForm = ({ initialData, onSubmit, loading }) => {
  const { t } = useTranslation("admin");
  const [currentStep, setCurrentStep] = useState(1);

  const { data: subscriptionData } = useMySubscription();
  const subscription = subscriptionData?.data?.subscription;

  const methods = useForm({
    mode: "onChange",
    defaultValues: mapApiToFormValues(initialData),
  });

  const { watch, handleSubmit, setValue } = methods;
  const formData = watch();

  const isStepValid = useMemo(() => {
    return EventsService.validateStepData(currentStep, formData);
  }, [currentStep, formData]);

  const onNext = useCallback(() => {
    if (!isStepValid) {
      Alert.alert("خطأ", "يرجى إكمال جميع الحقول المطلوبة");
      return;
    }
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
    } else {
      handleSubmit(handleFinalSubmit)();
    }
  }, [currentStep, isStepValid, handleSubmit]);

  const onPrevious = useCallback(() => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const handleFinalSubmit = useCallback(
    async (data) => {
      const payload = EventsService.transformFormDataToPayload(data);
      const formDataObj = new FormData();
      if (payload.guestList) formDataObj.append("guestList", JSON.stringify(payload.guestList));
      if (payload.eventDetails) formDataObj.append("eventDetails", JSON.stringify(payload.eventDetails));
      if (payload.staffList) formDataObj.append("staffList", JSON.stringify(payload.staffList));
      if (payload.invitationSettings) {
        const { templateImage, ...restInvitation } = payload.invitationSettings;
        formDataObj.append("invitationSettings", JSON.stringify(restInvitation));
      }
      await onSubmit(formDataObj);
    },
    [onSubmit],
  );

  const stepInfoList = STEP_INFO(t);
  const stepInfo = stepInfoList[currentStep - 1] || { title: "", description: "" };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <StepOne />;
      case 2:
        return (
          <StepTwo
            guestList={formData.guestList}
            staffList={formData.staffList}
            subscription={subscription}
          />
        );
      case 3:
        return (
          <StepThree
            selectedTemplate={formData.selectedTemplate}
            onSelectTemplate={(template) =>
              setValue("selectedTemplate", template, { shouldValidate: true })
            }
          />
        );
      case 4:
        return <StepFour />;
      default:
        return null;
    }
  };

  return (
    <FormProvider {...methods}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <StepHeader
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          title={stepInfo.title}
          description={stepInfo.description}
        />
        <View style={styles.contentContainer}>{renderStepContent()}</View>
        <PrevAndNextBtns
          onNext={onNext}
          onPrevious={onPrevious}
          showPrevious={currentStep > 1}
          isNextDisabled={!isStepValid || loading}
          nextButtonText={
            currentStep === TOTAL_STEPS
              ? t("events.update.saveAll")
              : t("common.next")
          }
          isLoading={loading}
        />
      </ScrollView>
    </FormProvider>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[24],
    paddingBottom: 100,
  },
  contentContainer: { marginVertical: spacing[24] },
});

export default UpdateEventForm;
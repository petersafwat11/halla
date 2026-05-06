import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormProvider } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import TopBar from "../../components/plans/TopBar";
import YourEventManagedByUsPopup from "../../components/createEvent/yourEventManagedByUsPopup";
import LimitReachedView from "../../components/createEvent/LimitReachedView";
import { useSubscriptionInfo, useCreateEvent } from "../../hooks";
import {
  useCreateEventForm,
  useStepValidation,
  useCreateEventHandlers,
} from "../../hooks/useCreateEventForm";

import StepOne from "../../components/createEvent/StepOne";
import StepTwo from "../../components/createEvent/StepTwo";
import StepThree from "../../components/createEvent/StepThree";
import StepFour from "../../components/createEvent/StepFour";
import EventSummary from "../../components/createEvent/EventSummary";
import StepHeader from "../../components/createEvent/StepHeader";
import PrevAndNextBtns from "../../components/createEvent/PrevAndNextBtns";
import PreviewInvitation from "../../components/createEvent/PreviewInvitation";

const CreateEventScreen = () => {
  const { t } = useTranslation("createEvent");
  const { t: tEvents } = useTranslation("events");
  const token = useAuthStore((state) => state.token);

  const { data: subInfoData, isLoading: subInfoLoading } = useSubscriptionInfo();
  const subscriptionInfo = subInfoData ?? null;
  const canCreateEvent = subscriptionInfo?.canCreateEvent !== false;

  const createEventMutation = useCreateEvent();

  const {
    methods,
    formData,
    currentStep,
    setCurrentStep,
    showPreview,
    setShowPreview,
    showInfoPopup,
    setShowInfoPopup,
    navigation,
    handleSubmit,
  } = useCreateEventForm();

  const isStepValid = useStepValidation(currentStep, formData);

  const {
    onNext,
    onPrevious,
    handleClose,
    handleContactUs,
  } = useCreateEventHandlers({
    t,
    currentStep,
    isStepValid,
    setCurrentStep,
    handleSubmit,
    token,
    createEventMutation,
    navigation,
    setShowInfoPopup,
  });

  const renderStepContent = useMemo(() => {
    switch (currentStep) {
      case 1:
        return <StepOne />;
      case 2:
        return (
          <StepTwo
            guestList={formData.guestList}
            staffList={formData.staffList}
            subscription={subscriptionInfo}
          />
        );
      case 3:
        return <StepThree />;
      case 4:
        return <StepFour onPreview={() => setShowPreview(true)} />;
      case 5:
        return <EventSummary />;
      default:
        return null;
    }
  }, [currentStep, formData, subscriptionInfo, setShowPreview]);

  const getStepInfo = useMemo(() => {
    switch (currentStep) {
      case 1:
        return { title: t("steps.1.title"), description: t("steps.1.description") };
      case 2:
        return { title: t("steps.2.title"), description: t("steps.2.description") };
      case 3:
        return { title: t("steps.3.title"), description: t("steps.3.description") };
      case 4:
        return { title: t("steps.4.title"), description: t("steps.4.description") };
      case 5:
        return { title: t("steps.5.title"), description: t("steps.5.description") };
      default:
        return { title: "", description: "" };
    }
  }, [currentStep, t]);

  const topBarRightContent = (
    <TouchableOpacity
      style={styles.infoButton}
      onPress={() => setShowInfoPopup(true)}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={styles.infoIconContainer}>
        <Ionicons name="information" size={20} color="#C28E5C" />
      </View>
    </TouchableOpacity>
  );

  const topBarLeftContent = (
    <TouchableOpacity
      style={styles.closeButton}
      onPress={handleClose}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="close" size={24} color="#F9F4EF" />
    </TouchableOpacity>
  );

  if (!subInfoLoading && !canCreateEvent) {
    return (
      <LimitReachedView
        tEvents={tEvents}
        title={t("title")}
        leftContent={topBarLeftContent}
        navigation={navigation}
      />
    );
  }

  return (
    <FormProvider {...methods}>
      <SafeAreaView style={styles.container}>
        <TopBar
          title={t("title")}
          rightContent={topBarRightContent}
          leftContent={topBarLeftContent}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <StepHeader
            currentStep={currentStep}
            totalSteps={5}
            title={getStepInfo.title}
            description={getStepInfo.description}
          />

          <View style={styles.contentContainer}>{renderStepContent}</View>

          <PrevAndNextBtns
            onNext={onNext}
            onPrevious={onPrevious}
            showPrevious={currentStep > 1}
            isNextDisabled={!isStepValid || createEventMutation.isPending}
            nextButtonText={currentStep === 5 ? t("buttons.save") : t("buttons.next")}
            isLoading={createEventMutation.isPending}
          />
        </ScrollView>

        {currentStep === 4 && (
          <TouchableOpacity
            style={styles.floatingPreviewButton}
            onPress={() => setShowPreview(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={24} color="#FFF" />
            <Text style={styles.floatingPreviewText}>{t("buttons.preview")}</Text>
          </TouchableOpacity>
        )}

        <PreviewInvitation
          visible={showPreview}
          onClose={() => setShowPreview(false)}
          eventTitle={formData.eventName || ""}
          previewBody={formData.selectedTemplate?.bodyText || ""}
          templateImage={formData.templateImage}
          selectedTemplate={formData.selectedTemplate}
          templateData={{
            brideName: formData.templateBrideName,
            groomName: formData.templateGroomName,
          }}
          eventDate={formData.eventDate}
          eventTime={formData.eventTime}
          location={formData.address?.address || ""}
        />

        <YourEventManagedByUsPopup
          visible={showInfoPopup}
          onClose={() => setShowInfoPopup(false)}
          onContactUs={handleContactUs}
        />
      </SafeAreaView>
    </FormProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F4EF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 100,
  },
  contentContainer: {
    marginVertical: 24,
  },
  floatingPreviewButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    backgroundColor: "#C28E5C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingPreviewText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
  },
  infoButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  infoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#F9F4EF",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F4EF",
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CreateEventScreen;

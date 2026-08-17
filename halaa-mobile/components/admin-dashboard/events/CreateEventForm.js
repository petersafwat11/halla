import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { FormProvider, useForm } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import EventsService from "../../../hooks/events/useEventForm";
import { useTranslation } from "../../../localization";
import {
  useSubscriptionInfo,
  useCreateEvent,
} from "../../../hooks";
import StepOne from "../../createEvent/StepOne";
import StepTwo from "../../createEvent/StepTwo";
import StepThree from "../../createEvent/StepThree";
import StepFour from "../../createEvent/StepFour";
import EventSummary from "../../createEvent/EventSummary";
import StepHeader from "../../createEvent/StepHeader";
import PrevAndNextBtns from "../../createEvent/PrevAndNextBtns";
import PreviewInvitation from "../../createEvent/PreviewInvitation";
import YourEventManagedByUsPopup from "../../createEvent/yourEventManagedByUsPopup";
import HostSelectorStep from "./HostSelectorStep";
import LimitReachedView from "../../createEvent/LimitReachedView";
import TopBar from "../../plans/TopBar";
import { spacing } from "../../../styles/tokens";

// Both subscription sources we accept already deliver the canonical normalized shape:
//   - useSubscriptionInfo() -> backend events.service.getSubscriptionInfo
//   - HostSelectorStep target.subscription -> backend admin.service._formatTargetSubscription
// Shape: { canCreateEvent, isUnlimited?, guestLimit, isGuestUnlimited, invitePool,
//          invitesRemaining, eventsRemaining, eventsUsed, isSingleEvent, isPoolPlan }

/**
 * Unified create-event form. Works in two modes:
 *
 *  - `mode: 'admin'` (default): 6-step wizard starting with HostSelector.
 *    The admin can pick "create for self" or another host. Submission is
 *    delegated to the caller via `onSubmit(formData)`/`loading`.
 *  - `mode: 'host'`: 5-step wizard (HostSelector is skipped). Subscription
 *    comes from `useSubscriptionInfo()` (the current user's). Submission
 *    is handled internally via `useCreateEvent()` and the screen wraps
 *    its own TopBar + preview / info popups.
 *
 * Per plan §13 the legacy host `CreateEventScreen` is reduced to a thin
 * wrapper around `<CreateEventForm mode="host" />`.
 */
const CreateEventForm = ({ mode = "admin", onSubmit, loading }) => {
  const { t } = useTranslation("admin");
  const { t: tCreate } = useTranslation("createEvent");
  const { t: tEvents } = useTranslation("events");
  const navigation = useNavigation();
  const isHostMode = mode === "host";

  const TOTAL_STEPS = isHostMode ? 5 : 6;
  const [currentStep, setCurrentStep] = useState(1);
  const [hostSelection, setHostSelection] = useState({});

  const [showPreview, setShowPreview] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const { data: subInfoData, isLoading: subInfoLoading } = useSubscriptionInfo();
  const selfSubscription = subInfoData ?? null;

  const hostCreateMutation = useCreateEvent();

  const methods = useForm({
    mode: "onChange",
    defaultValues: EventsService.getDefaultFormValues(),
  });

  const { watch, handleSubmit, setValue } = methods;
  const formData = watch();

  // Subscription that gates event creation: host mode always uses self;
  // admin mode uses self when "create for self" is chosen, otherwise the
  // host that admin selected.
  const gatingSubscription = useMemo(() => {
    if (isHostMode) return selfSubscription;
    if (hostSelection.createForSelf) return selfSubscription;
    return hostSelection.subscription ?? null;
  }, [isHostMode, hostSelection, selfSubscription]);

  const canCreateEvent = useMemo(() => {
    if (isHostMode) {
      return selfSubscription?.canCreateEvent !== false;
    }
    if (!hostSelection.createForSelf && !hostSelection.targetUserId) return true;
    if (!gatingSubscription) return false;
    if (gatingSubscription.isUnlimited) return true;
    if (gatingSubscription.eventsRemaining === -1) return true;
    return gatingSubscription.eventsRemaining > 0;
  }, [isHostMode, hostSelection, gatingSubscription, selfSubscription]);

  const isStepValid = useMemo(() => {
    if (!isHostMode && currentStep === 1) {
      return !!(hostSelection.createForSelf || hostSelection.targetUserId);
    }
    // Admin step (2-6) maps to EventsService step (1-5);
    // host mode steps already align (1-5).
    const eventsServiceStep = isHostMode ? currentStep : currentStep - 1;
    return EventsService.validateStepData(eventsServiceStep, formData);
  }, [isHostMode, currentStep, formData, hostSelection]);

  const handleFinalSubmit = useCallback(
    async (data) => {
      const payload = EventsService.transformFormDataToPayload(data);
      const formDataObj = new FormData();

      if (payload.guestList) {
        formDataObj.append("guestList", JSON.stringify(payload.guestList));
      }
      if (payload.eventDetails) {
        formDataObj.append("eventDetails", JSON.stringify(payload.eventDetails));
      }
      if (payload.staffList) {
        formDataObj.append("staffList", JSON.stringify(payload.staffList));
      }
      if (payload.visualTemplate) {
        formDataObj.append("visualTemplate", JSON.stringify(payload.visualTemplate));
      }
      if (payload.taqnyatTemplate) {
        formDataObj.append("taqnyatTemplate", JSON.stringify(payload.taqnyatTemplate));
      }
      if (payload.guestReplies) {
        formDataObj.append("guestReplies", JSON.stringify(payload.guestReplies));
      }
      if (payload.invitationType) {
        // Scalar string field — backend reads it directly (no JSON parse).
        formDataObj.append("invitationType", payload.invitationType);
      }
      if (payload.launchSettings) {
        formDataObj.append("launchSettings", JSON.stringify(payload.launchSettings));
      }
      if (payload.templateImage && payload.templateImage.uri) {
        formDataObj.append("templateImage", {
          uri: payload.templateImage.uri,
          type: payload.templateImage.type || "image/png",
          name: payload.templateImage.name || payload.templateImage.fileName || `template-${Date.now()}.png`,
        });
      }

      if (isHostMode) {
        // Host mode: invoke the host's createEvent mutation directly
        // (hook signature is `mutateAsync(formData)`) and bounce back to
        // the events list on success.
        try {
          // Creating the last event in a plan makes the refreshed entitlement
          // false by design. Freeze this screen in its completion state so it
          // cannot swap to LimitReachedView while navigation is committing.
          setIsCompleting(true);
          await hostCreateMutation.mutateAsync(formDataObj);
          navigation.reset({
            index: 0,
            routes: [{ name: "MainTabs", params: { screen: "Home" } }],
          });
        } catch (err) {
          setIsCompleting(false);
          Alert.alert(tCreate("error", "Error"), err?.message || String(err));
        }
        return;
      }

      // Admin mode: forward host selection fields then delegate.
      if (hostSelection.createForSelf) {
        formDataObj.append("createForSelf", "true");
      } else if (hostSelection.targetUserId) {
        formDataObj.append("targetUserId", hostSelection.targetUserId);
        formDataObj.append("targetType", hostSelection.targetType || "host");
      }
      await onSubmit?.(formDataObj);
    },
    [
      isHostMode,
      hostCreateMutation,
      hostSelection,
      navigation,
      onSubmit,
      tCreate,
    ],
  );

  const onNext = useCallback(() => {
    if (!isStepValid) {
      Alert.alert(t("common.error"), t("events.steps.incompleteFields"));
      return;
    }
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
    } else {
      handleSubmit(handleFinalSubmit)();
    }
  }, [currentStep, isStepValid, handleSubmit, handleFinalSubmit, TOTAL_STEPS, t]);

  const onPrevious = useCallback(() => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const handleClose = useCallback(() => {
    navigation?.goBack?.();
  }, [navigation]);

  const handleContactUs = useCallback(() => {
    setShowInfoPopup(false);
  }, []);

  // Step info: admin mode includes a step 1 for HostSelector; host mode
  // skips the selector and starts directly with event details.
  const stepInfo = useMemo(() => {
    if (isHostMode) {
      return {
        title: tCreate(`step${currentStep}_title`),
        description: tCreate(`step${currentStep}_description`),
      };
    }
    const adminList = [
      { title: t("events.steps.hostSelector"), description: t("events.hostSelector.subtitle") },
      { title: t("events.steps.eventDetails"), description: "" },
      { title: t("events.steps.guestList"), description: "" },
      { title: t("events.steps.template"), description: "" },
      { title: t("events.steps.messages"), description: "" },
      { title: t("events.steps.review"), description: "" },
    ];
    return adminList[currentStep - 1] || { title: "", description: "" };
  }, [isHostMode, currentStep, t, tCreate]);

  // Host-mode hard stop when subscription doesn't allow event creation.
  if (isHostMode && !isCompleting && !subInfoLoading && !canCreateEvent) {
    return (
      <LimitReachedView
        tEvents={tEvents}
        title={tCreate("page_title")}
        navigation={navigation}
      />
    );
  }

  // Admin-mode hard stop after host selection narrows down to a target
  // without remaining events.
  if (!isHostMode && !canCreateEvent && currentStep > 1) {
    return (
      <LimitReachedView
        tEvents={tEvents}
        title={t("events.create")}
        navigation={navigation}
      />
    );
  }

  const renderStepContent = () => {
    if (!isHostMode && currentStep === 1) {
      return (
        <HostSelectorStep
          value={hostSelection}
          onChange={setHostSelection}
        />
      );
    }

    // Map current step to the createEvent wizard step (1-5).
    const wizardStep = isHostMode ? currentStep : currentStep - 1;
    switch (wizardStep) {
      case 1:
        return <StepOne />;
      case 2:
        return (
          <StepTwo
            guestList={formData.guestList}
            staffList={formData.staffList}
            subscription={gatingSubscription}
          />
        );
      case 3:
        return isHostMode ? (
          <StepThree />
        ) : (
          <StepThree
            selectedTemplate={formData.selectedTemplate}
            onSelectTemplate={(template) =>
              setValue("selectedTemplate", template, { shouldValidate: true })
            }
          />
        );
      case 4:
        return isHostMode ? (
          <StepFour onPreview={() => setShowPreview(true)} />
        ) : (
          <StepFour />
        );
      case 5:
        return <EventSummary />;
      default:
        return null;
    }
  };

  const isLoading = isHostMode ? hostCreateMutation.isPending : !!loading;
  const nextLabel =
    currentStep === TOTAL_STEPS
      ? isHostMode
        ? tCreate("save_event")
        : t("common.save")
      : isHostMode
      ? tCreate("next")
      : t("common.next");

  const formBody = (
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
          isNextDisabled={!isStepValid || isLoading}
          nextButtonText={nextLabel}
          isLoading={isLoading}
        />
      </ScrollView>

      {/* Host-mode extras: live preview button + onboarding popup. The
          preview only makes sense on the template/customisation step. */}
      {isHostMode && currentStep === 4 && (
        <TouchableOpacity
          style={styles.floatingPreviewButton}
          onPress={() => setShowPreview(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="eye-outline" size={24} color="#FFF" />
          <Text style={styles.floatingPreviewText}>
            {tCreate("preview_template")}
          </Text>
        </TouchableOpacity>
      )}

      {isHostMode && (
        <>
          <PreviewInvitation
            visible={showPreview}
            onClose={() => setShowPreview(false)}
            eventTitle={formData.eventName || ""}
            previewBody={formData.selectedTemplate?.bodyText || ""}
            templateImage={formData.templateImage}
            template={formData.visualTemplate}
            templateData={formData.visualTemplate?.data || {}}
            eventDate={formData.eventDate}
            eventTime={formData.eventTime}
            location={formData.address?.address || ""}
            invitationType={formData.invitationType}
          />
          <YourEventManagedByUsPopup
            visible={showInfoPopup}
            onClose={() => setShowInfoPopup(false)}
            onContactUs={handleContactUs}
          />
        </>
      )}
    </FormProvider>
  );

  // In admin mode the parent screen renders its own chrome (TopBar etc.).
  if (!isHostMode) return formBody;

  // Host mode owns the screen — render the full SafeAreaView + TopBar.
  const topBarRight = (
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
  const topBarLeft = (
    <TouchableOpacity
      style={styles.closeButton}
      onPress={handleClose}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="close" size={24} color="#F9F4EF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.hostContainer}>
      <TopBar
        title={tCreate("page_title")}
        rightContent={topBarRight}
        leftContent={topBarLeft}
      />
      {formBody}
    </SafeAreaView>
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
  hostContainer: { flex: 1, backgroundColor: "#F9F4EF" },
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

export default CreateEventForm;

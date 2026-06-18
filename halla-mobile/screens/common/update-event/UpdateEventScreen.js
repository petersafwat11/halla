/**
 * Unified update-event wizard for every role (host edits own events,
 * admin/super-admin any event, whitelabel admin/moderator any event in
 * their tenant — role check inside `useEventLoadAndGate`). Four steps
 * mirror the create wizard; each step dispatches its own scoped
 * mutation. On a `live` event only step 2 stays interactive (allow-
 * add-only); other steps render the lockout banner and freeze content.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View, StyleSheet, ScrollView, Alert, TouchableOpacity, Text, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { useMySubscription } from "../../../hooks";
import { useTranslation } from "../../../localization";
import {
  useUpdateEvent, useUpdateEventStep2, useUpdateVisualTemplate, useUpdateTaqnyatTemplate,
} from "../../../hooks/events/mutations/useEventMutation";
import EventsService from "../../../hooks/events/useEventForm";

import TopBar from "../../../components/plans/TopBar";
import StepHeader from "../../../components/createEvent/StepHeader";
import PrevAndNextBtns from "../../../components/createEvent/PrevAndNextBtns";
import PreviewInvitation from "../../../components/createEvent/PreviewInvitation";

import useEventLoadAndGate from "./useEventLoadAndGate";
import UpdateEventStepRenderer from "./UpdateEventStepRenderer";

const TOTAL_STEPS = 4;

const UpdateEventScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const queryClient = useQueryClient();

  const { t } = useTranslation("admin");

  const eventId = route.params?.eventId;
  const initialStep = Math.min(
    Math.max(parseInt(route.params?.step, 10) || 1, 1),
    TOTAL_STEPS
  );

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: subscriptionData } = useMySubscription();
  const subscription = subscriptionData?.data?.subscription;

  const updateEventDetails = useUpdateEvent();
  const updateStep2 = useUpdateEventStep2();
  const updateVisualTemplate = useUpdateVisualTemplate();
  const updateTaqnyatTemplate = useUpdateTaqnyatTemplate();

  const methods = useForm({
    mode: "onChange",
    defaultValues: EventsService.getDefaultFormValues(),
  });
  const { watch, handleSubmit, reset } = methods;
  const formData = watch();

  const {
    eventData,
    formValues,
    loadingEvent,
    loadError,
    allowed,
    isLive,
    isCompleted,
    lockoutActive,
    allowAddOnlyOnStep2,
  } = useEventLoadAndGate({ eventId, currentStep });

  useEffect(() => {
    if (formValues) reset(formValues);
  }, [formValues, reset]);

  const saveStep = useCallback(
    async (data) => {
      if (!eventId) return;
      setIsSaving(true);
      try {
        if (currentStep === 1) {
          await updateEventDetails.mutateAsync({
            eventId,
            eventData: {
              title: data.eventName,
              type: data.eventType,
              date: data.eventDate,
              time: data.eventTime,
              location: data.address,
              description: data.description || "",
            },
          });
        } else if (currentStep === 2) {
          await updateStep2.mutateAsync({
            eventId,
            guestList: (data.guestList || []).map((g) => ({
              name: g.name,
              phone: g.phone || g.mobile || "",
              email: g.email || "",
            })),
            staffList: (data.staffList || []).map((s) => ({
              name: s.name,
              phone: s.phone || s.mobile || "",
            })),
          });
        } else if (currentStep === 3) {
          await updateVisualTemplate.mutateAsync({
            eventId,
            visualTemplate: data.visualTemplate || null,
            fieldValues:
              data.visualTemplate?.fieldValues || data.visualTemplate?.data || undefined,
            templateImage:
              data.templateImage && typeof data.templateImage === "object"
                ? data.templateImage
                : undefined,
          });
        } else if (currentStep === 4) {
          await updateTaqnyatTemplate.mutateAsync({
            eventId,
            selectedTemplate: data.selectedTemplate || null,
            taqnyatTemplate: data.taqnyatTemplate || null,
            guestReplies: data.guestReplies || {
              onAttend: data.attendanceAutoReply || "",
              onAbsent: data.absenceAutoReply || "",
              onExpected: data.expectedAttendanceAutoReply || "",
            },
          });
        }

        queryClient.invalidateQueries({ queryKey: ["events"] });
        queryClient.invalidateQueries({ queryKey: ["events", "single-stats", eventId] });

        if (currentStep < TOTAL_STEPS) {
          setCurrentStep((s) => s + 1);
        } else {
          Alert.alert("✓", t("events.update.updateSuccess"), [
            { text: t("events.update.successOk"), onPress: () => navigation.goBack() },
          ]);
        }
      } catch (error) {
        Alert.alert("✗", error?.message || t("events.update.updateFailed"));
      } finally {
        setIsSaving(false);
      }
    },
    [
      currentStep, eventId, navigation, queryClient, t,
      updateEventDetails, updateStep2, updateVisualTemplate, updateTaqnyatTemplate,
    ]
  );

  const onNext = useCallback(() => {
    if (lockoutActive) {
      Alert.alert(
        t("events.update.stepLockedAlertTitle"),
        isCompleted
          ? t("events.update.stepLockedCompletedAlertBody")
          : t("events.update.stepLockedAlertBody")
      );
      return;
    }
    handleSubmit(saveStep)();
  }, [handleSubmit, saveStep, lockoutActive, isCompleted, t]);

  const onPrevious = useCallback(() => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const handleClose = useCallback(() => {
    Alert.alert(
      t("events.update.cancelTitle"),
      t("events.update.cancelBody"),
      [
        { text: t("events.update.cancelKeep"), style: "cancel" },
        {
          text: t("events.update.cancelDiscard"),
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  }, [navigation, t]);

  const topBarLeftContent = (
    <TouchableOpacity
      style={styles.closeButton}
      onPress={handleClose}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="close" size={24} color="#F9F4EF" />
    </TouchableOpacity>
  );

  if (loadingEvent || loadError || !allowed) {
    return (
      <SafeAreaView style={styles.container}>
        <TopBar title={t("events.update.title")} leftContent={topBarLeftContent} />
        <View style={styles.center}>
          {loadingEvent ? (
            <ActivityIndicator size="large" color="#C28E5C" />
          ) : (
            <Text style={styles.errorText}>
              {loadError || t("events.update.notAllowed")}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <FormProvider {...methods}>
      <SafeAreaView style={styles.container}>
        <TopBar title={t("events.update.title")} leftContent={topBarLeftContent} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {(isLive || isCompleted) && (
            <View style={styles.lockoutBanner} accessibilityRole="alert">
              <Text style={styles.lockoutText}>
                {isCompleted
                  ? t("events.update.completedLocked")
                  : currentStep === 2
                  ? t("events.update.liveAddOnly")
                  : t("events.update.liveLocked")}
              </Text>
            </View>
          )}
          <StepHeader
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            title={t(`events.update.steps.${currentStep}.title`)}
            description={t(`events.update.steps.${currentStep}.description`)}
          />
          <View style={styles.contentContainer}>
            <UpdateEventStepRenderer
              currentStep={currentStep}
              formData={formData}
              eventData={eventData}
              subscription={subscription}
              lockoutActive={lockoutActive}
              allowAddOnlyOnStep2={allowAddOnlyOnStep2}
            />
          </View>
          <PrevAndNextBtns
            onNext={onNext}
            onPrevious={onPrevious}
            showPrevious={currentStep > 1}
            isNextDisabled={isSaving || lockoutActive}
            nextButtonText={
              currentStep === TOTAL_STEPS
                ? t("events.update.saveAll")
                : t("events.update.saveStep")
            }
            isLoading={isSaving}
          />
        </ScrollView>

        {currentStep === 4 && (
          <TouchableOpacity
            style={styles.floatingPreviewButton}
            onPress={() => setShowPreview(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={24} color="#FFF" />
            <Text style={styles.floatingPreviewText}>{t("events.update.preview")}</Text>
          </TouchableOpacity>
        )}

        <PreviewInvitation
          visible={showPreview}
          onClose={() => setShowPreview(false)}
          eventTitle={formData.eventName || ""}
          previewBody={formData.selectedTemplate?.bodyText || ""}
          templateImage={formData.templateImage}
          selectedTemplate={formData.selectedTemplate}
          templateData={
            formData.visualTemplate?.fieldValues ||
            formData.visualTemplate?.data ||
            {}
          }
          eventDate={formData.eventDate}
          eventTime={formData.eventTime}
          location={formData.address?.address || ""}
        />
      </SafeAreaView>
    </FormProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F4EF" },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 24, paddingBottom: 100 },
  contentContainer: { marginVertical: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: {
    fontSize: 16, fontFamily: "Cairo_400Regular", color: "#e74c3c",
    textAlign: "center", padding: 16,
  },
  closeButton: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  floatingPreviewButton: {
    position: "absolute", bottom: 100, right: 20, backgroundColor: "#C28E5C",
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, paddingHorizontal: 20, borderRadius: 25, gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  floatingPreviewText: { fontSize: 16, fontFamily: "Cairo_600SemiBold", color: "#FFF" },
  lockoutBanner: {
    margin: 0, marginBottom: 12, padding: 12, borderRadius: 8,
    backgroundColor: "#FFF7E6", borderWidth: 1, borderColor: "#FFD591",
  },
  lockoutText: {
    fontSize: 13, color: "#7A4F01", fontFamily: "Cairo_500Medium", textAlign: "right",
  },
});

export default UpdateEventScreen;

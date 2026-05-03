import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "../../hooks";
import EventsService from "../../services/EventsService";
import * as eventsService2 from "../../services/eventsService2";
import TopBar from "../../components/plans/TopBar";

import StepOne from "../../components/createEvent/StepOne";
import StepTwo from "../../components/createEvent/StepTwo";
import StepThree from "../../components/createEvent/StepThree";
import StepFour from "../../components/createEvent/StepFour";
import StepHeader from "../../components/createEvent/StepHeader";
import PrevAndNextBtns from "../../components/createEvent/PrevAndNextBtns";
import PreviewInvitation from "../../components/createEvent/PreviewInvitation";

const TOTAL_STEPS = 4;

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
  const canonicalVisual = eventData.visualTemplate || {};
  const canonicalTaqnyat = eventData.taqnyatTemplate || {};
  const canonicalReplies = eventData.guestReplies || {};

  // Visual template — prefer canonical templateRef + fieldValues, fall
  // back to legacy invitationSettings.visualTemplate.{id,data,src}.
  const visualTemplate = canonicalVisual?.templateRef
    ? {
        ...(inv.visualTemplate || {}),
        templateRef: canonicalVisual.templateRef,
        fieldValues: canonicalVisual.fieldValues,
        bakedImagePath: canonicalVisual.bakedImagePath,
        // legacy mirrors so existing UI still resolves
        id: canonicalVisual.templateRef,
        _id: canonicalVisual.templateRef,
        data: canonicalVisual.fieldValues || inv.visualTemplate?.data,
        src: canonicalVisual.bakedImagePath || inv.visualTemplate?.src,
      }
    : inv.visualTemplate || null;
  const visualData = visualTemplate?.data || visualTemplate?.fieldValues || {};

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
    visualTemplate,
    selectedTemplate: inv.selectedTemplate || null,
    taqnyatTemplate: canonicalTaqnyat?.templateRef ? canonicalTaqnyat : null,
    invitationMessage:
      eventData.invitationMessage || inv.selectedTemplate?.bodyText || "",
    // Auto-replies — canonical guestReplies.* preferred over legacy.
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
    // Unpack visualTemplate.data (or fieldValues) back to flat
    // customization fields (matches web's TemplateForm structure for
    // legacy hardcoded templates).
    templateIntroduction: visualData.messageText || "",
    templateBrideName: visualData.brideName || "",
    templateGroomName: visualData.groomName || "",
    templateGuestMessage: visualData.guestMessage || "",
    templateClosingMessage: visualData.endMessage || "",
    templateFont: visualData.fontType || "Cairo",
    templatePrimaryColor: visualData.primaryColor || "#C0392B",
  };
};
const STEP_TITLES = [
  "تفاصيل المناسبة",
  "قائمة الضيوف والمشرفين",
  "تصميم الدعوة",
  "رسائل الدعوة",
];

const UpdateEventScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const token = useAuthStore((state) => state.token);

  const eventId = route.params?.eventId;
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [eventData, setEventData] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const queryClient = useQueryClient();
  const { data: subscriptionData } = useSubscription();
  const subscription = subscriptionData?.data?.subscription;
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoadingEvent(true);
        const res = await eventsService2.getEventById(eventId, token);
        if (res) {
          setEventData(res?.data || res);
        } else {
          setLoadError("فشل تحميل بيانات المناسبة");
        }
      } catch {
        setLoadError("فشل تحميل بيانات المناسبة");
      } finally {
        setLoadingEvent(false);
      }
    };

    if (eventId) {
      fetchEvent();
    } else {
      setLoadingEvent(false);
      setLoadError("لم يتم تحديد المناسبة");
    }
  }, [eventId, token]);

  const methods = useForm({
    mode: "onChange",
    defaultValues: EventsService.getDefaultFormValues(),
  });

  const { watch, handleSubmit, setValue, reset } = methods;
  const formData = watch();

  // Reset form when event data is loaded
  useEffect(() => {
    if (eventData) {
      reset(mapApiToFormValues(eventData));
    }
  }, [eventData, reset]);

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
      handleSubmit(onSubmit)();
    }
  }, [currentStep, isStepValid, handleSubmit]);

  const onPrevious = useCallback(() => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }, [currentStep]);
  const onSubmit = useCallback(
    async (data) => {
      try {
        setIsSubmitting(true);
        const payload = EventsService.transformFormDataToPayload(data);

        // Send each section to its correct backend endpoint in parallel
        const updates = [];

        if (payload.eventDetails) {
          updates.push(
            eventsService2.updateEventDetails(eventId, payload.eventDetails, token)
          );
        }

        if (payload.guestList && payload.guestList.length > 0) {
          updates.push(
            eventsService2.updateGuestList(eventId, payload.guestList, token)
          );
        }

        if (payload.staffList) {
          updates.push(
            eventsService2.updateStaffList(eventId, payload.staffList, token)
          );
        }

        if (payload.invitationSettings) {
          updates.push(
            eventsService2.updateInvitationSettings(eventId, payload.invitationSettings, token)
          );
        }

        if (payload.launchSettings) {
          updates.push(
            eventsService2.updateLaunchSettings(eventId, payload.launchSettings, token)
          );
        }

        await Promise.all(updates);

        // Invalidate react-query caches
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', eventId] });

        Alert.alert("نجح", "تم تحديث المناسبة بنجاح!", [
          { text: "حسناً", onPress: () => navigation.goBack() },
        ]);
      } catch (error) {
        Alert.alert("خطأ", error.message || "فشل في تحديث المناسبة");
      } finally {
        setIsSubmitting(false);
      }
    },
    [eventId, navigation, queryClient, token],
  );

  const handleClose = () => {
    Alert.alert(
      "إلغاء التعديل",
      "هل أنت متأكد من إلغاء التعديل؟ سيتم فقدان التغييرات غير المحفوظة.",
      [
        { text: "استمرار", style: "cancel" },
        { text: "إلغاء", style: "destructive", onPress: () => navigation.goBack() },
      ],
    );
  };

  const topBarLeftContent = (
    <TouchableOpacity
      style={styles.closeButton}
      onPress={handleClose}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="close" size={24} color="#F9F4EF" />
    </TouchableOpacity>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <StepOne />;
      case 2:
        return (
          <StepTwo
            guestList={formData.guestList}
            staffList={formData.staffList}
            subscription={{
              guests: {
                limitPerEvent: eventData?.guestLimit || subscription?.limits?.maxGuestsPerEvent || subscription?.maxGuests || 0,
                isUnlimited: eventData?.guestLimit === -1 || subscription?.limits?.maxGuestsPerEvent === -1 || false,
              },
              limits: subscription?.limits,
            }}
          />
        );
      case 3:
        return <StepThree />;
      case 4:
        return <StepFour />;
      default:
        return null;
    }
  };
  if (loadingEvent) {
    return (
      <SafeAreaView style={styles.container}>
        <TopBar title="تعديل المناسبة" leftContent={topBarLeftContent} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C28E5C" />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <TopBar title="تعديل المناسبة" leftContent={topBarLeftContent} />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <FormProvider {...methods}>
      <SafeAreaView style={styles.container}>
        <TopBar title="تعديل المناسبة" leftContent={topBarLeftContent} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <StepHeader
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            title={STEP_TITLES[currentStep - 1] || ""}
            description=""
          />
          <View style={styles.contentContainer}>{renderStepContent()}</View>
          <PrevAndNextBtns
            onNext={onNext}
            onPrevious={onPrevious}
            showPrevious={currentStep > 1}
            isNextDisabled={!isStepValid || isSubmitting}
            nextButtonText={currentStep === TOTAL_STEPS ? "حفظ التغييرات" : "التالي"}
            isLoading={isSubmitting}
          />
        </ScrollView>

        {/* Floating Preview Button — shown on Step 4 (matches web update-event) */}
        {currentStep === 4 && (
          <TouchableOpacity
            style={styles.floatingPreviewButton}
            onPress={() => setShowPreview(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={24} color="#FFF" />
            <Text style={styles.floatingPreviewText}>معاينة</Text>
          </TouchableOpacity>
        )}

        {/* Preview Modal */}
        <PreviewInvitation
          visible={showPreview}
          onClose={() => setShowPreview(false)}
          eventTitle={formData.eventName || ""}
          invitationMessage={formData.invitationMessage || ""}
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
      </SafeAreaView>
    </FormProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F4EF",
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 100,
  },
  contentContainer: { marginVertical: 24 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    textAlign: "center",
    padding: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
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
});

export default UpdateEventScreen;
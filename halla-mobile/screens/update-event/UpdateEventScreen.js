/**
 * Phase 4d W1-MOBILE-UPDATE — Unified update-event wizard.
 *
 * One screen for every role per D2 + D4d-4: host edits own events,
 * admin/super-admin edits any event, whitelabel admin/moderator edits
 * any event under their tenant. Role checks happen inline via
 * `useAuthStore` — no per-role component tree.
 *
 * Five visible steps, mirroring the post-Phase-4c structure used on web
 * (event details → guests+staff → visual template → Taqnyat picker →
 * messaging). Each step dispatches its own mutation so saves stay
 * scoped:
 *   1. `useUpdateEventDetails`    — `PATCH /:id/event-details`
 *   2. `useUpdateEventStep2`      — `PATCH /:id/step2` (atomic, 4d W0)
 *   3. `useUpdateVisualTemplate`  — `PATCH /:id/invitation-settings`
 *   4. `useUpdateTaqnyatTemplate` — `PATCH /:id/invitation-settings`
 *   5. `useUpdateMessagingContent`— `PATCH /:id/invitation-settings`
 *
 * D10: when the event is `live`, only step 2 stays interactive (allow-
 * add-only). Every other step renders the lockout banner and disables
 * the step content.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "../../stores/authStore";
import { useSubscription } from "../../hooks";
import {
  useUpdateEvent,
  useUpdateEventStep2,
  useUpdateVisualTemplate,
  useUpdateTaqnyatTemplate,
  useUpdateMessagingContent,
} from "../../hooks/mutations/useEventMutations";
import * as eventsService2 from "../../services/eventsService2";
import EventsService from "../../services/EventsService";
import useEventActionGate from "../../hooks/useEventActionGate";

import TopBar from "../../components/plans/TopBar";
import StepHeader from "../../components/createEvent/StepHeader";
import PrevAndNextBtns from "../../components/createEvent/PrevAndNextBtns";
import PreviewInvitation from "../../components/createEvent/PreviewInvitation";

import StepOne from "./StepOne";
import StepTwo from "./StepTwo";
import StepThree from "./StepThree";
import StepFour from "./StepFour";
import StepFive from "./StepFive";

const TOTAL_STEPS = 5;

const STEP_TITLES = [
  "تفاصيل المناسبة",
  "قائمة الضيوف والمشرفين",
  "تصميم الدعوة",
  "قالب الواتساب",
  "نص الرسالة والردود",
];

const STEP_DESCRIPTIONS = [
  "ادخل تفاصيل المناسبة بشكل صحيح",
  "أضف قائمة الضيوف والمشرفين",
  "قم بتخصيص قالب الدعوة",
  "اختر قالب الواتساب المعتمد من Meta",
  "اكتب نص الدعوة والردود التلقائية",
];

/**
 * Maps the event API response onto the form-state shape that the
 * create-event step components consume. Canonical-first per Phase 4c
 * dual-write contract (`visualTemplate.fieldValues`, `guestReplies.*`,
 * `taqnyatTemplate.templateRef`, top-level `invitationMessage` /
 * `hostNote`); legacy `invitationSettings.*` is the fallback.
 */
const mapApiToFormValues = (eventData) => {
  if (!eventData) return EventsService.getDefaultFormValues();

  const details = eventData.eventDetails || eventData;
  const guestList = (eventData.guestList || []).map((g, i) => ({
    id: g._id || i,
    name: g.name || "",
    phone: g.phone || g.mobile || "",
    email: g.email || "",
  }));
  const staffList = (eventData.staffList || []).map((m, i) => ({
    id: m._id || i,
    name: m.name || "",
    phone: m.phone || m.mobile || "",
  }));

  const inv = eventData.invitationSettings || {};
  const canonicalVisual = eventData.visualTemplate || {};
  const canonicalTaqnyat = eventData.taqnyatTemplate || {};
  const canonicalReplies = eventData.guestReplies || {};

  // Visual template — prefer canonical templateRef + fieldValues.
  const visualTemplate = canonicalVisual?.templateRef
    ? {
        ...(inv.visualTemplate || {}),
        templateRef: canonicalVisual.templateRef,
        fieldValues: canonicalVisual.fieldValues,
        bakedImagePath: canonicalVisual.bakedImagePath,
        // Legacy mirrors so existing UI consumers still resolve.
        id: canonicalVisual.templateRef,
        _id: canonicalVisual.templateRef,
        data: canonicalVisual.fieldValues || inv.visualTemplate?.data,
        src: canonicalVisual.bakedImagePath || inv.visualTemplate?.src,
      }
    : inv.visualTemplate || null;

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
  };
};

/**
 * Pre-flight role gate. The backend's `_buildScopedEventQuery` returns
 * 404 for unauthorised roles, but a client-side gate produces a clearer
 * UX message and avoids a wasted round-trip on the wizard load.
 *
 * Mirrors the same scopes used on the backend:
 *   - SUPER_ADMIN / ADMIN — can edit any event the API returns.
 *   - WHITELABEL_ADMIN / WHITELABEL_MODERATOR / MODERATOR — only events
 *     under their `whitelabelId`.
 *   - HOST — only events they own.
 */
const canEditEvent = (event, user) => {
  if (!event || !user) return false;
  const role = user.role;
  const userId = user._id?.toString?.() || user._id;
  const userWl = user.whitelabelId?.toString?.() || user.whitelabelId;
  const eventHostId = event.host?._id || event.host;
  const eventWl = event.whitelabelId?.toString?.() || event.whitelabelId;

  if (role === "super_admin" || role === "admin") return true;
  if (
    role === "whitelabel_admin" ||
    role === "whitelabel_moderator" ||
    role === "moderator"
  ) {
    return Boolean(userWl) && userWl === eventWl;
  }
  // Default: host. Match by ownership.
  return eventHostId?.toString?.() === userId?.toString?.();
};

const UpdateEventScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const queryClient = useQueryClient();

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const eventId = route.params?.eventId;
  const initialStep = Math.min(
    Math.max(parseInt(route.params?.step, 10) || 1, 1),
    TOTAL_STEPS
  );

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [showPreview, setShowPreview] = useState(false);
  const [eventData, setEventData] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: subscriptionData } = useSubscription();
  const subscription = subscriptionData?.data?.subscription;

  const updateEventDetails = useUpdateEvent();
  const updateStep2 = useUpdateEventStep2();
  const updateVisualTemplate = useUpdateVisualTemplate();
  const updateTaqnyatTemplate = useUpdateTaqnyatTemplate();
  const updateMessagingContent = useUpdateMessagingContent();

  const methods = useForm({
    mode: "onChange",
    defaultValues: EventsService.getDefaultFormValues(),
  });
  const { watch, handleSubmit, reset } = methods;
  const formData = watch();

  // ─── Load event ────────────────────────────────────────────────────
  useEffect(() => {
    if (!eventId) {
      setLoadingEvent(false);
      setLoadError("لم يتم تحديد المناسبة");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingEvent(true);
        const res = await eventsService2.getEventById(eventId, token);
        if (cancelled) return;
        const payload = res?.data?.event || res?.data || res;
        if (payload) setEventData(payload);
        else setLoadError("فشل تحميل بيانات المناسبة");
      } catch (err) {
        if (!cancelled) {
          setLoadError(err?.message || "فشل تحميل بيانات المناسبة");
        }
      } finally {
        if (!cancelled) setLoadingEvent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, token]);

  useEffect(() => {
    if (eventData) reset(mapApiToFormValues(eventData));
  }, [eventData, reset]);

  // ─── Role gate ─────────────────────────────────────────────────────
  const allowed = useMemo(
    () => (eventData ? canEditEvent(eventData, user) : true),
    [eventData, user]
  );

  // ─── Live-event lockout (D10) ──────────────────────────────────────
  const actionGate = useEventActionGate({
    event: eventData,
    currentUser: user,
  });
  const isLive = actionGate.isLive;
  // Step 2 stays interactive on live events (allow-add-only); every
  // other step is frozen.
  const lockoutActive = isLive && currentStep !== 2;
  const allowAddOnlyOnStep2 = isLive && currentStep === 2;

  // ─── Per-step save dispatcher ──────────────────────────────────────
  const saveStep = useCallback(
    async (data) => {
      if (!eventId) return;
      setIsSaving(true);
      try {
        switch (currentStep) {
          case 1: {
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
            break;
          }
          case 2: {
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
            break;
          }
          case 3: {
            await updateVisualTemplate.mutateAsync({
              eventId,
              visualTemplate: data.visualTemplate || null,
              fieldValues:
                data.visualTemplate?.fieldValues ||
                data.visualTemplate?.data ||
                undefined,
              templateImage:
                data.templateImage && typeof data.templateImage === "object"
                  ? data.templateImage
                  : undefined,
            });
            break;
          }
          case 4: {
            await updateTaqnyatTemplate.mutateAsync({
              eventId,
              selectedTemplate: data.selectedTemplate || null,
              taqnyatTemplate: data.taqnyatTemplate || null,
            });
            break;
          }
          case 5: {
            await updateMessagingContent.mutateAsync({
              eventId,
              invitationMessage: data.invitationMessage || "",
              guestReplies: data.guestReplies || {
                onAttend: data.attendanceAutoReply || "",
                onAbsent: data.absenceAutoReply || "",
                onExpected: data.expectedAttendanceAutoReply || "",
              },
              hostNote: data.hostNote || data.note || "",
            });
            break;
          }
          default:
            break;
        }

        queryClient.invalidateQueries({ queryKey: ["events"] });
        queryClient.invalidateQueries({
          queryKey: ["events", "single-stats", eventId],
        });

        if (currentStep < TOTAL_STEPS) {
          setCurrentStep((s) => s + 1);
        } else {
          Alert.alert("نجح", "تم تحديث المناسبة بنجاح", [
            { text: "حسناً", onPress: () => navigation.goBack() },
          ]);
        }
      } catch (error) {
        Alert.alert("خطأ", error?.message || "فشل في تحديث المناسبة");
      } finally {
        setIsSaving(false);
      }
    },
    [
      currentStep,
      eventId,
      navigation,
      queryClient,
      updateEventDetails,
      updateStep2,
      updateVisualTemplate,
      updateTaqnyatTemplate,
      updateMessagingContent,
    ]
  );

  const onNext = useCallback(() => {
    if (lockoutActive) {
      Alert.alert("غير متاح", "لا يمكن تعديل هذه الخطوة على مناسبة قيد التشغيل");
      return;
    }
    handleSubmit(saveStep)();
  }, [handleSubmit, saveStep, lockoutActive]);

  const onPrevious = useCallback(() => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const handleClose = useCallback(() => {
    Alert.alert(
      "إلغاء التعديل",
      "هل أنت متأكد من إلغاء التعديل؟ سيتم فقدان التغييرات غير المحفوظة.",
      [
        { text: "استمرار", style: "cancel" },
        {
          text: "إلغاء",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  }, [navigation]);

  const topBarLeftContent = (
    <TouchableOpacity
      style={styles.closeButton}
      onPress={handleClose}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="close" size={24} color="#F9F4EF" />
    </TouchableOpacity>
  );

  if (loadingEvent) {
    return (
      <SafeAreaView style={styles.container}>
        <TopBar title="تعديل المناسبة" leftContent={topBarLeftContent} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#C28E5C" />
        </View>
      </SafeAreaView>
    );
  }
  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <TopBar title="تعديل المناسبة" leftContent={topBarLeftContent} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!allowed) {
    return (
      <SafeAreaView style={styles.container}>
        <TopBar title="تعديل المناسبة" leftContent={topBarLeftContent} />
        <View style={styles.center}>
          <Text style={styles.errorText}>
            ليست لديك الصلاحية لتعديل هذه المناسبة
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <StepOne disabled={lockoutActive} />;
      case 2:
        return (
          <StepTwo
            guestList={formData.guestList}
            staffList={formData.staffList}
            allowAddOnly={allowAddOnlyOnStep2}
            subscription={{
              guests: {
                limitPerEvent:
                  eventData?.guestLimit ||
                  subscription?.limits?.maxGuestsPerEvent ||
                  subscription?.maxGuests ||
                  0,
                isUnlimited:
                  eventData?.guestLimit === -1 ||
                  subscription?.limits?.maxGuestsPerEvent === -1 ||
                  false,
              },
              limits: subscription?.limits,
              planId: subscription?.planId,
            }}
          />
        );
      case 3:
        return <StepThree disabled={lockoutActive} />;
      case 4:
        return <StepFour disabled={lockoutActive} />;
      case 5:
        return <StepFive disabled={lockoutActive} />;
      default:
        return null;
    }
  };

  return (
    <FormProvider {...methods}>
      <SafeAreaView style={styles.container}>
        <TopBar title="تعديل المناسبة" leftContent={topBarLeftContent} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isLive && (
            <View style={styles.lockoutBanner} accessibilityRole="alert">
              <Text style={styles.lockoutText}>
                {currentStep === 2
                  ? "المناسبة قيد التشغيل: يمكنك إضافة ضيوف فقط."
                  : "المناسبة قيد التشغيل: تعديل هذه الخطوة معطل."}
              </Text>
            </View>
          )}
          <StepHeader
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            title={STEP_TITLES[currentStep - 1] || ""}
            description={STEP_DESCRIPTIONS[currentStep - 1] || ""}
          />
          <View style={styles.contentContainer}>{renderStepContent()}</View>
          <PrevAndNextBtns
            onNext={onNext}
            onPrevious={onPrevious}
            showPrevious={currentStep > 1}
            isNextDisabled={isSaving || lockoutActive}
            nextButtonText={
              currentStep === TOTAL_STEPS ? "حفظ التغييرات" : "حفظ والتالي"
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
            <Text style={styles.floatingPreviewText}>معاينة</Text>
          </TouchableOpacity>
        )}

        <PreviewInvitation
          visible={showPreview}
          onClose={() => setShowPreview(false)}
          eventTitle={formData.eventName || ""}
          invitationMessage={formData.invitationMessage || ""}
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 100,
  },
  contentContainer: { marginVertical: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  lockoutBanner: {
    margin: 0,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#FFF7E6",
    borderWidth: 1,
    borderColor: "#FFD591",
  },
  lockoutText: {
    fontSize: 13,
    color: "#7A4F01",
    fontFamily: "Cairo_500Medium",
    textAlign: "right",
  },
});

export default UpdateEventScreen;

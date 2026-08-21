import React, { useCallback, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import {
  useUpdateAdminEventStatus,
  useDeleteAdminEvent,
} from "../../hooks";
import { useSingleEventStats } from "../../hooks/events/queries";
import { useEventGuests } from "../../hooks/guests";
import {
  useUpdateGuest,
  useDeleteGuest,
  useRotateGuestQr,
  useRevokeGuestAccess,
  useAddGuest,
  useExportGuests,
} from "../../hooks/guests";
import {
  useAddEventStaff,
  useUpdateEventStaff,
  useDeleteEventStaff,
  useRetryLaunch,
} from "../../hooks/events/mutations/useEventMutation";
import { useRevokeStaffAccess } from "../../hooks/staff";
import { useSendReminder } from "../../hooks/messaging";

import { EVENT_STATUS, EVENT_STATUS_GROUPS } from "@halaa/shared/constants/eventStatus";
import {
  formatDate as formatLocaleDate,
  formatTime as formatLocaleTime,
  formatDateTime as formatLocaleDateTime,
  formatLocation as formatLocaleLocation,
  formatNumber as formatLocaleCount,
  isolateLtr,
} from "@halaa/shared/utils";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { useTranslation } from "../../localization";
import {
  canEditPage,
  canDeleteOnPage,
  PAGES,
} from "../../utils/adminPermissions";
import { saveBlobAndShare } from "../../utils/download";
import { getStatusVisual } from "../../constants/statusColors";
import { useInputDirection } from "../../hooks/useInputDirection";

import TopBar from "../../components/plans/TopBar";
import {
  SectionCard,
  InfoRow,
} from "../../components/admin-dashboard/hosts/HostSectionCard";
import EventActionsHeader from "../../components/home/EventActionsHeader";
import { EventActionsSection } from "../../components/admin-dashboard/events";
import StatsCards from "../../components/events/StatsCards";
import GuestListItem from "../../components/events/GuestListItem";
import ModeratorListItem from "../../components/events/ModeratorListItem";
import AddGuestOrModeratorPopup from "../../components/events/AddGuestOrmoderatorPopup";
import EventFailureBanner from "../../components/events/EventFailureBanner";
import AutoReminderInfoText from "../../components/admin-dashboard/events/AutoReminderInfoText";
import SendActionsSheet from "../../components/events/SendActionsSheet";
import SendActionModal from "../../components/events/SendActionModal";
import { hasSendStarted, isTerminalEvent } from "../../components/events/sendAudiences";

import {
  colors,
  spacing,
  textStyles,
  backgrounds,
  borderRadius,
} from "../../styles/tokens";

/**
 * Single-event details screen — host + admin combined.
 *
 * Role differences are minimal and gated inline:
 *   - admin sees the host badge next to the title + host info section
 *   - admin sees the subscription card and the destructive Delete button
 *     in `EventActionsHeader` (passed via `isAdmin`)
 *   - admin sees status-change rows (publish/end/cancel/reschedule) via
 *     `EventActionsSection` while hosts only get the action header
 *
 * Data flows through a single `useSingleEventStats(eventId)` which the
 * service-layer fans out to `GET /events/stats/:id` + `GET /events/:id`
 * — both backend endpoints role-scope by the requester, so the same
 * hook works for host and admin without any
 * branch-on-role on the client.
 */

const toCfg = (status, labelKey) => {
  const { fg, bg } = getStatusVisual(status);
  return { color: fg, bg, labelKey };
};

const STATUS_CONFIG = {
  scheduled: toCfg("scheduled", "scheduled"),
  live: toCfg("live", "live"),
  completed: toCfg("completed", "completed"),
  draft: toCfg("draft", "draft"),
  cancelled: toCfg("cancelled", "cancelled"),
  failed: toCfg("failed", "failed"),
};

const formatDate = (iso, lang) => (iso ? formatLocaleDate(iso, lang) : null);
const formatDateTime = (iso, lang) => (iso ? formatLocaleDateTime(iso, lang) : null);
const buildLocationString = (loc, lang) => formatLocaleLocation(loc, lang);

const EventDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { eventId } = route.params || {};
  const { t, currentLanguage } = useTranslation(["admin", "events", "home"]);
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const currentUser = useAuthStore((s) => s.user);
  // Inverse check — hosts get the host UX, everyone else (admin / super_admin /
  // moderator) gets the admin UX.
  const isAdmin = !!role && role !== "host";
  const canEdit = canEditPage(role, PAGES.EVENTS);
  const canDelete = canDeleteOnPage(role, PAGES.EVENTS);

  const { data: resp, isLoading, refetch, isRefetching, error } = useSingleEventStats(eventId);
  // Canonical guest list via `useEventGuests`. Falling back to
  // `event.guestList` only leaves hosts with an empty list when
  // the backend `getEventById` populator hasn't shipped to the env yet
  // (which is exactly the "guests don't load" symptom the user reported).
  const { data: guestsResp, refetch: refetchGuests } = useEventGuests(eventId);

  const updateStatus = useUpdateAdminEventStatus();
  const deleteEvent = useDeleteAdminEvent();
  const updateGuestMutation = useUpdateGuest();
  const deleteGuestMutation = useDeleteGuest();
  const rotateGuestQrMutation = useRotateGuestQr();
  const revokeGuestAccessMutation = useRevokeGuestAccess();
  const addGuestMutation = useAddGuest();
  const exportGuestsMutation = useExportGuests();
  const sendReminderMutation = useSendReminder();
  const addStaffMutation = useAddEventStaff();
  const updateStaffMutation = useUpdateEventStaff();
  const deleteStaffMutation = useDeleteEventStaff();
  const revokeStaffMutation = useRevokeStaffAccess();
  const retryLaunchMutation = useRetryLaunch();

  const event = useMemo(
    () => resp?.event || resp?.data?.event || resp?.data || null,
    [resp]
  );
  const guestsFromStats = resp?.guests || [];
  const staffFromStats =
    (Array.isArray(event?.staffList) && event.staffList.length
      ? event.staffList
      : resp?.staff) || [];
  // Prefer the dedicated `/guests/events/:id` endpoint result; fall
  // through to the populated `event.guestList` (admin path) and finally
  // to the lightweight `guests` array projected by getSingleEventStats.
  const guestsFromList = Array.isArray(guestsResp?.data)
    ? guestsResp.data
    : Array.isArray(guestsResp)
    ? guestsResp
    : [];
  const guests = useMemo(() => {
    if (guestsFromList.length) return guestsFromList;
    if (Array.isArray(event?.guestList) && event.guestList.length) return event.guestList;
    return guestsFromStats;
  }, [guestsFromList, event, guestsFromStats]);

  const handleRefresh = useCallback(() => {
    refetch();
    refetchGuests();
  }, [refetch, refetchGuests]);

  // Actually retry the failed launch (POST /events/:id/retry-launch) instead of
  // just refetching stats. The EventFailureBanner owns the retrying/error UI and
  // awaits this promise, so let errors propagate (e.g. 409 EVENT_NOT_RETRYABLE)
  // and refetch on success so the banner clears once the status flips.
  const handleRetryLaunch = useCallback(async () => {
    await retryLaunchMutation.mutateAsync({ eventId });
    await refetch();
  }, [retryLaunchMutation, eventId, refetch]);

  const [activeTab, setActiveTab] = useState("guests");
  const [search, setSearch] = useState("");
  const [popup, setPopup] = useState({ open: false, type: "guest", initialData: null });
  const [statusFilter, setStatusFilter] = useState(null);
  // Consolidated send actions (resend / extra reminder / new guests) live behind
  // the "Send messages" sheet on the guests tab.
  const [showSendSheet, setShowSendSheet] = useState(false);
  const [activeSendAction, setActiveSendAction] = useState(null);
  const scrollViewRef = useRef(null);
  const tabsRef = useRef(null);
  const tabsYRef = useRef(null);
  // Explicit localized direction for the iOS search placeholder.
  const searchDirectionStyle = useInputDirection("localized");
  // Intrinsically LTR values (email/phone) are isolated inside Arabic copy.
  const isolateIfRtl = (value) =>
    currentLanguage === "ar" ? isolateLtr(value) : value;

  const stats = useMemo(
    () => ({
      confirmed: resp?.confirmed || 0,
      declined: resp?.declined || 0,
      pending: resp?.pending || 0,
      checkedIn: resp?.checkedIn || 0,
      totalGuests: resp?.totalGuests || guests.length || 0,
    }),
    [resp, guests]
  );

  const handleFilterPress = useCallback((filterKey) => {
    setStatusFilter((prev) => (prev === filterKey ? null : filterKey));
    if (scrollViewRef.current && tabsYRef.current !== null) {
      scrollViewRef.current.scrollTo({ y: tabsYRef.current - 20, animated: true });
    }
  }, []);

  const STATUS_FILTER_MAP = useMemo(() => ({
    confirmed: ["confirmed", "checked_in"],
    declined: ["declined"],
    noResponse: ["invited", "pending"],
    checkedIn: ["checked_in"],
  }), []);

  const filteredGuests = useMemo(() => {
    let result = guests;
    const matchStatuses = statusFilter && statusFilter !== "totalGuests"
      ? STATUS_FILTER_MAP[statusFilter]
      : null;
    if (matchStatuses) {
      result = result.filter((g) =>
        matchStatuses.includes(g.status || "invited")
      );
    }
    const q = search.trim().toLowerCase();
    if (!q) return result;
    return result.filter(
      (g) =>
        (g.name || "").toLowerCase().includes(q) ||
        (g.phone || "").includes(q)
    );
  }, [guests, search, statusFilter, STATUS_FILTER_MAP]);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staffFromStats;
    return staffFromStats.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.phone || "").includes(q)
    );
  }, [staffFromStats, search]);

  // ===== Guest actions =====
  const handleEditGuest = (guest) => {
    setPopup({
      open: true,
      type: "guest",
      initialData: {
        _id: guest._id || guest.guestId || guest.id,
        name: guest.name || "",
        phone: guest.phone || "",
      },
    });
  };

  const handleDeleteGuest = (guest) => {
    const guestId = guest._id || guest.guestId || guest.id;
    Alert.alert(
      t("guest.alerts.deleteConfirmTitle", "تأكيد الحذف"),
      t("guest.alerts.deleteConfirmBody", "هل أنت متأكد من حذف هذا الضيف؟"),
      [
        { text: t("guest.alerts.cancel", "إلغاء"), style: "cancel" },
        {
          text: t("guest.alerts.delete", "حذف"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGuestMutation.mutateAsync({ eventId, guestId });
              toast.success(t("guest.alerts.deleteSuccess", "تم حذف الضيف بنجاح"));
            } catch (e) {
              toast.error(e?.message || t("guest.alerts.deleteError", "حدث خطأ أثناء الحذف"));
            }
          },
        },
      ]
    );
  };

  const handleRotateQr = async (guest) => {
    const guestId = guest._id || guest.guestId || guest.id;
    try {
      await rotateGuestQrMutation.mutateAsync({ eventId, guestId });
      toast.success(t("guest.alerts.qrUpdated", "تم تحديث رمز الدخول."));
    } catch (e) {
      toast.error(e?.message || t("guest.alerts.qrRotateError", "تعذر تحديث رمز QR"));
    }
  };

  const handleRevokeAccess = async (guest) => {
    const guestId = guest._id || guest.guestId || guest.id;
    try {
      await revokeGuestAccessMutation.mutateAsync({ eventId, guestId });
      toast.success(
        t("guest.alerts.accessRevokedSuccess", "تم إلغاء صلاحية الضيف لمحتوى ما بعد المناسبة.")
      );
    } catch (e) {
      toast.error(e?.message || t("guest.alerts.accessRevokeError", "تعذر إلغاء الصلاحية"));
    }
  };

  const handleSavePopup = async ({ name, phone }) => {
    try {
      if (popup.type === "guest") {
        if (popup.initialData?._id) {
          await updateGuestMutation.mutateAsync({
            eventId,
            guestId: popup.initialData._id,
            data: { name, phone },
          });
          toast.success(t("guest.alerts.updateSuccess", "تم تعديل الضيف بنجاح"));
        } else {
          await addGuestMutation.mutateAsync({ eventId, data: { name, phone } });
          toast.success(t("guest.alerts.addSuccess", "تم إضافة الضيف بنجاح"));
        }
      } else {
        if (popup.initialData?._id) {
          await updateStaffMutation.mutateAsync({
            eventId,
            staffId: popup.initialData._id,
            data: { name, phone },
          });
          toast.success(t("guest.alerts.staffUpdateSuccess", "تم تعديل المشرف بنجاح"));
        } else {
          await addStaffMutation.mutateAsync({ eventId, data: { name, phone } });
          toast.success(t("guest.alerts.staffAddSuccess", "تم إضافة المشرف بنجاح"));
        }
      }
      setPopup({ open: false, type: popup.type, initialData: null });
    } catch (e) {
      toast.error(e?.message || t("guest.alerts.saveError", "حدث خطأ أثناء الحفظ"));
    }
  };

  // ===== Moderator actions =====
  const handleEditModerator = (m) => {
    setPopup({
      open: true,
      type: "moderator",
      initialData: {
        _id: m._id || m.id,
        name: m.name || "",
        phone: m.phone || "",
      },
    });
  };

  const handleDeleteModerator = (m) => {
    const staffId = m._id || m.id;
    Alert.alert(
      t("guest.alerts.deleteConfirmTitle", "تأكيد الحذف"),
      t("guest.alerts.staffDeleteConfirmBody", "هل أنت متأكد من حذف هذا المشرف؟"),
      [
        { text: t("guest.alerts.cancel", "إلغاء"), style: "cancel" },
        {
          text: t("guest.alerts.delete", "حذف"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteStaffMutation.mutateAsync({ eventId, staffId });
              toast.success(t("guest.alerts.staffDeleteSuccess", "تم حذف المشرف بنجاح"));
            } catch (e) {
              toast.error(e?.message || t("guest.alerts.staffDeleteError", "حدث خطأ أثناء حذف المشرف"));
            }
          },
        },
      ]
    );
  };

  const handleRevokeModerator = async (m) => {
    const staffId = m._id || m.id;
    try {
      await revokeStaffMutation.mutateAsync({ eventId, staffId });
      toast.success(t("guest.alerts.staffRevokeSuccess", "تم إلغاء صلاحية وصول المشرف."));
    } catch (e) {
      toast.error(e?.message || t("guest.alerts.staffRevokeError", "حدث خطأ أثناء إلغاء الصلاحية"));
    }
  };

  const handleExportGuests = async () => {
    try {
      // The mutation returns the XLSX blob; it does NOT persist it. We have to
      // hand the blob to `saveBlobAndShare` (write to cache + native share
      // sheet).
      const result = await exportGuestsMutation.mutateAsync({ eventId });
      if (!result?.blob) {
        throw new Error(t("guest.alerts.exportError", "تعذر تصدير قائمة الضيوف"));
      }
      const share = await saveBlobAndShare(
        result.blob,
        result.filename || `event-${eventId}-guests.xlsx`,
        { dialogTitle: t("guest.alerts.exportTitle", "تصدير") }
      );
      // The share sheet opening IS the success signal — stay silent on
      // success and on user-cancel; surface only real failures.
      if (!share.success && share.message) {
        toast.error(share.message);
      }
    } catch (e) {
      toast.error(e?.message || t("guest.alerts.exportError", "تعذر تصدير قائمة الضيوف"));
    }
  };

  const handleSendReminder = useCallback(async () => {
    Alert.alert(
      t("events:reminder.confirmTitle", "إرسال تذكير"),
      // The normal reminder is now free and targets CONFIRMED guests only.
      t("events:reminder.confirmBody", "إرسال تذكير مجاني للضيوف الذين أكدوا الحضور؟"),
      [
        { text: t("guest.alerts.cancel", "إلغاء"), style: "cancel" },
        {
          text: t("events:reminder.send", "إرسال"),
          onPress: async () => {
            try {
              await sendReminderMutation.mutateAsync({ eventId, channel: "sms" });
              toast.success(t("events:reminder.success", "تم إرسال التذكير"));
            } catch (e) {
              toast.error(e?.message || t("events:reminder.error", "تعذر إرسال التذكير"));
            }
          },
        },
      ]
    );
  }, [eventId, sendReminderMutation, t, toast]);

  // ===== Select-mode + bulk pool-charged actions =====
  // Send actions (resend / extra reminder / new guests) are handled by the
  // shared SendActionModal, opened from the "Send messages" sheet.

  // ===== Admin status / delete handlers =====
  const handleStatusChange = (newStatus, titleKey, messageKey, btnLabelKey, destructive = false) => {
    if (!event) return;
    Alert.alert(t(titleKey, ""), t(messageKey, ""), [
      { text: t("common.cancel", "إلغاء"), style: "cancel" },
      {
        text: t(btnLabelKey, ""),
        style: destructive ? "destructive" : "default",
        onPress: async () => {
          try {
            await updateStatus.mutateAsync({
              eventId: event.id || event._id,
              status: newStatus,
            });
            toast.success(t("eventDetails.updated", "تم التحديث"));
            refetch();
          } catch (e) {
            toast.error(e?.message || t("eventDetails.updateStatusFailed", "تعذر تحديث الحالة"));
          }
        },
      },
    ]);
  };

  const handleAdminDelete = () => {
    if (!event) return;
    Alert.alert(
      t("eventDetails.deleteConfirmTitle", "حذف المناسبة"),
      t("eventDetails.deleteConfirmMessage", "هل أنت متأكد من حذف هذه المناسبة؟"),
      [
        { text: t("common.cancel", "إلغاء"), style: "cancel" },
        {
          text: t("common.delete", "حذف"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEvent.mutateAsync(event.id || event._id);
              toast.success(t("eventDetails.deleted", "تم حذف المناسبة"));
              navigation.goBack();
            } catch (e) {
              toast.error(e?.message || t("eventDetails.deleteFailed", "تعذر حذف المناسبة"));
            }
          },
        },
      ]
    );
  };

  if (isLoading && !event) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("eventDetails.title", "تفاصيل المناسبة")} showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.centerText}>{t("eventDetails.loading", "جار التحميل...")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !event) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("eventDetails.title", "تفاصيل المناسبة")} showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger?.[500] || "#C0392B"} />
          <Text style={styles.centerText}>{t("eventDetails.loadFailed", "تعذر تحميل المناسبة")}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>{t("common.retry", "إعادة المحاولة")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("eventDetails.title", "تفاصيل المناسبة")} showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerState}>
          <Ionicons name="calendar-outline" size={48} color={colors.natural[400]} />
          <Text style={styles.centerText}>{t("eventDetails.notFound", "لم يتم العثور على المناسبة")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg = STATUS_CONFIG[event?.status] || toCfg("unknown", "unknown");
  const statusLabel = t(
    `eventDetails.statuses.${statusCfg.labelKey}`,
    statusCfg.labelKey
  );

  // Resolution order so the same backend payload renders an identical
  // heading on both tiers. Host endpoint nests under `eventDetails.title`;
  // the admin payload keeps `title` at the top level — fall through both.
  const eventTitle =
    event?.eventDetails?.title ||
    event?.title ||
    event?.name ||
    t("eventDetails.title", "تفاصيل المناسبة");
  const hostName =
    event?.host?.name || event?.host?.username || event?.hostName || null;
  const hostEmail = event?.host?.email || event?.hostEmail || null;
  const hostPhone = event?.host?.phone || event?.hostPhone || null;

  const eventDate = event?.eventDetails?.date || event?.date || null;
  const eventTime = event?.eventDetails?.time || event?.time || null;
  const locationStr = buildLocationString(
    event?.eventDetails?.location || event?.location,
    currentLanguage
  );

  // Remaining invites in the host's pool. A real number now for both pool and
  // per-event plans; `null` means truly unlimited (admin/super-admin). Used by
  // the remaining-invites badge and the bulk-action cost gate.
  const invitesRemaining = event?.subscription?.invitesRemaining ?? null;

  // Live and terminal event guest invariants (EVT-03):
  // Live events: existing guests immutable (onEdit/onDelete disabled), new guests allowed.
  // Terminal events: all guest additions and mutations disabled.
  const isLive = event?.status === "live" || event?.status === EVENT_STATUS.LIVE;
  const isTerminal = isTerminalEvent(event);
  const allowGuestMutations = !isLive && !isTerminal;

  // The normal reminder is now FREE and confirmed-only — show the inline
  // shortcut whenever there are confirmed guests (no quota gate).
  const hasConfirmedGuests = stats.confirmed > 0;

  // Pass the full event so `useEventActionGate` sees every field the
  // hook reads (taqnyatTemplate, staffList, status, launchSettings, …).
  // A stripped projection loses fields whenever the API shape shifts,
  // which silently disables the action buttons.
  const headerEvent = {
    ...event,
    id: event.id || event._id,
    staffCount: staffFromStats.length,
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar
        title={eventTitle}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Title heading — plain h2 styling, no bordered card. Only render
            the status pill when the event status is a real value (skip
            the noisy "unknown" fallback). */}
        <View style={styles.titleBlock}>
          <Text style={styles.titleHeading} numberOfLines={2}>
            {eventTitle}
          </Text>
          {STATUS_CONFIG[event?.status] && (
            <View style={[styles.statusChip, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.statusChipText, { color: statusCfg.color }]}>
                {statusLabel}
              </Text>
            </View>
          )}
        </View>

        {(isAdmin && hostName) || eventDate || eventTime || locationStr ? (
          <View style={styles.titleMeta}>
            {isAdmin && hostName && (
              <View style={styles.titleMetaRow}>
                <Ionicons name="person-outline" size={13} color={colors.natural[450]} />
                <Text style={styles.titleMetaText}>{hostName}</Text>
              </View>
            )}
            {(eventDate || eventTime) && (
              <View style={styles.titleMetaRow}>
                <Ionicons name="calendar-outline" size={13} color={colors.natural[450]} />
                <Text style={styles.titleMetaText}>
                  {formatDate(eventDate, currentLanguage) || ""}
                  {eventTime ? `  •  ${formatLocaleTime(eventTime, currentLanguage)}` : ""}
                </Text>
              </View>
            )}
            {locationStr && (
              <View style={styles.titleMetaRow}>
                <Ionicons name="location-outline" size={13} color={colors.natural[450]} />
                <Text style={styles.titleMetaText} numberOfLines={1}>
                  {locationStr}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Failure / retry banner */}
        <EventFailureBanner
          event={event}
          currentUser={currentUser}
          onRetry={handleRetryLaunch}
        />

        {/* Action bar — test message, schedule, notify staff, share post-event, manage dropdown, delete (admin) */}
        <View style={styles.actionsWrapper}>
          <EventActionsHeader
            event={headerEvent}
            isAdmin={isAdmin}
            onDeleted={() => navigation.goBack()}
            // Admin delete is owned by EventActionsSection below (audited
            // /admin/events/:id route). Suppress the header's host-route delete
            // so an admin doesn't see two delete buttons hitting two endpoints.
            showAdminDelete={false}
          />
        </View>

        {/* Stats — confirmed / declined / pending */}
        <StatsCards stats={stats} eventStatus={event?.status} activeFilter={statusFilter} onFilterPress={handleFilterPress} />

        {/* Checked-in / total-guests mini row */}
        <View style={styles.checkedInRow}>
          {(event?.status === EVENT_STATUS.LIVE || event?.status === EVENT_STATUS.COMPLETED) && (
            <TouchableOpacity
              style={[
                styles.checkedInChip,
                statusFilter === "checkedIn" && styles.checkedInChipActive,
              ]}
              onPress={() => handleFilterPress("checkedIn")}
              activeOpacity={0.7}
            >
              <Ionicons name="qr-code-outline" size={14} color="#64748B" />
              <Text style={styles.checkedInLabel}>
                {t("eventDetails.checkedIn", "تم تسجيل دخولهم")}
              </Text>
              <Text style={styles.checkedInValue}>{formatLocaleCount(stats.checkedIn, currentLanguage)}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.checkedInChip,
              statusFilter === "totalGuests" && styles.checkedInChipActive,
            ]}
            onPress={() => handleFilterPress("totalGuests")}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={14} color="#6B4E33" />
            <Text style={styles.checkedInLabel}>
              {t("eventDetails.totalGuests", "إجمالي الضيوف")}
            </Text>
            <Text style={styles.checkedInValue}>{formatLocaleCount(stats.totalGuests, currentLanguage)}</Text>
          </TouchableOpacity>
        </View>

        {/* Admin-only: host info section */}
        {isAdmin && (hostName || hostEmail || hostPhone) && (
          <SectionCard
            title={t("eventDetails.host", "المضيف")}
            icon="person-circle-outline"
          >
            {hostName && (
              <InfoRow
                icon="person-outline"
                label={t("eventDetails.name", "الاسم")}
                value={hostName}
                last={!hostEmail && !hostPhone}
              />
            )}
            {hostEmail && (
              <InfoRow
                icon="mail-outline"
                label={t("eventDetails.email", "البريد")}
                value={isolateIfRtl(hostEmail)}
                last={!hostPhone}
              />
            )}
            {hostPhone && (
              <InfoRow
                icon="call-outline"
                label={t("eventDetails.phone", "الجوال")}
                value={isolateIfRtl(hostPhone)}
                last
              />
            )}
          </SectionCard>
        )}

        {/* Admin-only: subscription quota */}
        {isAdmin && event?.subscription && (
          <SectionCard
            title={t("eventDetails.subscription", "الباقة")}
            icon="card-outline"
          >
            {event.subscription.planType && (
              <InfoRow
                icon="ribbon-outline"
                label={t("eventDetails.plan", "الباقة")}
                value={t(
                  `discounts.planTypes.${event.subscription.planType}`,
                  event.subscription.planType
                )}
              />
            )}
            <InfoRow
              icon="people-outline"
              label={t("eventDetails.guestsRemaining", "ضيوف متبقون")}
              value={
                event.subscription.invitesRemaining == null
                  ? t("events:remainingInvites.unlimited", "غير محدود")
                  : formatLocaleCount(event.subscription.invitesRemaining, currentLanguage)
              }
              last
            />
          </SectionCard>
        )}

        {/* Remaining invites — adding guests is free; charged only on send. */}
        {event?.subscription && (
          <View style={styles.invitesBadge}>
            <View style={styles.invitesBadgeRow}>
              <Ionicons name="paper-plane-outline" size={16} color="#6B4E33" />
              <Text style={styles.invitesBadgeLabel}>
                {t("events:remainingInvites.label", "الدعوات المتبقية")}
              </Text>
              <Text style={styles.invitesBadgeValue}>
                {invitesRemaining == null
                  ? t("events:remainingInvites.unlimited", "غير محدود")
                  : formatLocaleCount(invitesRemaining, currentLanguage)}
              </Text>
            </View>
            <Text style={styles.invitesBadgeHelp}>
              {t(
                "events:remainingInvites.helper",
                "إضافة الضيوف مجانية؛ يتم خصم الرصيد فقط عند إرسال دعوة أو تذكير."
              )}
            </Text>
          </View>
        )}

        <AutoReminderInfoText event={event} />

        {/* Admin status / delete row */}
        {isAdmin && (
          <EventActionsSection
            event={event}
            canEdit={canEdit}
            canDelete={canDelete}
            updatePending={updateStatus.isPending}
            deletePending={deleteEvent.isPending}
            onStatusChange={handleStatusChange}
            onDelete={handleAdminDelete}
            t={t}
            SectionCard={SectionCard}
          />
        )}

        {/* Guests / Moderators tabs */}
        <View
          style={styles.tabsCard}
          ref={tabsRef}
          onLayout={(e) => {
            tabsYRef.current = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "guests" && styles.tabActive]}
              onPress={() => setActiveTab("guests")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={activeTab === "guests" ? "#2C2C2C" : "#656565"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "guests" && styles.tabTextActive,
                ]}
              >
                {t("eventDetails.guestsTab", "المدعوون")} ({formatLocaleCount(guests.length, currentLanguage)})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "moderators" && styles.tabActive]}
              onPress={() => setActiveTab("moderators")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={activeTab === "moderators" ? "#2C2C2C" : "#656565"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "moderators" && styles.tabTextActive,
                ]}
              >
                {t("eventDetails.moderatorsTab", "المشرفون")} ({formatLocaleCount(staffFromStats.length, currentLanguage)})
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={16} color="#767676" />
              <TextInput
                placeholder={
                  activeTab === "guests"
                    ? t("eventDetails.searchGuests", "اسم الضيف")
                    : t("eventDetails.searchModerators", "اسم المشرف")
                }
                placeholderTextColor="#656565"
                value={search}
                onChangeText={setSearch}
                style={[styles.searchInput, searchDirectionStyle]}
              />
            </View>
            {!isTerminal && (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() =>
                  setPopup({
                    open: true,
                    type: activeTab === "guests" ? "guest" : "moderator",
                    initialData: null,
                  })
                }
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color="#FFF" />
                <Text style={styles.addBtnText}>
                  {activeTab === "guests"
                    ? t("guestList.addGuest", "إضافة ضيف")
                    : t("eventDetails.addModerator", "إضافة مشرف")}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {activeTab === "guests" && (
            <View style={styles.guestActionsRow}>
              {/* The normal reminder is now FREE and confirmed-only — show it
                  whenever there are confirmed guests, with no quota gate. */}
              {hasConfirmedGuests && (
                <TouchableOpacity
                  style={styles.outlineActionBtn}
                  onPress={handleSendReminder}
                  activeOpacity={0.7}
                  disabled={sendReminderMutation.isPending}
                >
                  <Ionicons name="notifications-outline" size={14} color="#6B4E33" />
                  <Text style={styles.outlineActionText}>
                    {sendReminderMutation.isPending
                      ? t("events:reminder.sending", "جاري الإرسال...")
                      : t("events:reminder.sendAll", "تذكير الضيوف")}
                  </Text>
                </TouchableOpacity>
              )}
              {!isTerminalEvent(event) && hasSendStarted(event) && (
                <TouchableOpacity
                  style={styles.outlineActionBtn}
                  onPress={() => setShowSendSheet(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="paper-plane-outline" size={14} color="#6B4E33" />
                  <Text style={styles.outlineActionText}>
                    {t("events:sendActions.menu", "إرسال الرسائل")}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.outlineActionBtn}
                onPress={handleExportGuests}
                activeOpacity={0.7}
                disabled={exportGuestsMutation.isPending}
              >
                <Ionicons name="download-outline" size={14} color="#6B4E33" />
                <Text style={styles.outlineActionText}>
                  {t("guest.alerts.exportTitle", "تصدير")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.listWrapper}>
            {activeTab === "guests" ? (
              filteredGuests.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={32} color={colors.natural[400]} />
                  <Text style={styles.emptyStateText}>
                    {t("eventDetails.noGuests", "لا يوجد ضيوف")}
                  </Text>
                </View>
              ) : (
                filteredGuests.map((g, idx) => (
                  <GuestListItem
                    key={g._id || g.guestId || g.id || idx}
                    guest={{
                      ...g,
                      responseDate: g.rsvp?.respondedAt
                        ? formatDateTime(g.rsvp.respondedAt, currentLanguage)
                        : g.respondedAt
                        ? formatDateTime(g.respondedAt, currentLanguage)
                        : null,
                      autoReminderDate: g.invitation?.autoReminderSentAt
                        ? formatDateTime(g.invitation.autoReminderSentAt, currentLanguage)
                        : null,
                    }}
                    onEdit={allowGuestMutations ? handleEditGuest : null}
                    onDelete={allowGuestMutations ? handleDeleteGuest : null}
                    onRotateQr={isTerminal ? null : handleRotateQr}
                    onRevokeAccess={isTerminal ? null : handleRevokeAccess}
                  />
                ))
              )
            ) : filteredStaff.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="shield-outline" size={32} color={colors.natural[400]} />
                <Text style={styles.emptyStateText}>
                  {t("eventDetails.noModerators", "لا يوجد مشرفون")}
                </Text>
              </View>
            ) : (
              filteredStaff.map((m, idx) => (
                <ModeratorListItem
                  key={m._id || m.id || idx}
                  moderator={m}
                  onEdit={handleEditModerator}
                  onDelete={handleDeleteModerator}
                  onRevoke={handleRevokeModerator}
                />
              ))
            )}
          </View>
        </View>

        <View style={{ height: spacing[32] }} />
      </ScrollView>

      <SendActionsSheet
        visible={showSendSheet}
        event={event}
        guests={guests}
        onPick={(a) => {
          setShowSendSheet(false);
          setActiveSendAction(a);
        }}
        onClose={() => setShowSendSheet(false)}
      />

      <SendActionModal
        visible={!!activeSendAction}
        action={activeSendAction}
        eventId={eventId}
        guests={guests}
        invitesRemaining={invitesRemaining}
        onClose={() => setActiveSendAction(null)}
      />

      <AddGuestOrModeratorPopup
        visible={popup.open}
        type={popup.type}
        initialData={popup.initialData}
        loading={
          addGuestMutation.isPending ||
          updateGuestMutation.isPending ||
          addStaffMutation.isPending ||
          updateStaffMutation.isPending
        }
        // Show the existing roster inside the popup so the host has the
        // same list-in-modal UX the web `StaffPopup` provides. Edit/delete
        // re-use the same handlers wired into the tabs view below.
        itemsList={popup.type === "guest" ? guests : staffFromStats}
        onEditItem={
          popup.type === "guest"
            ? (allowGuestMutations ? handleEditGuest : null)
            : handleEditModerator
        }
        onDeleteItem={
          popup.type === "guest"
            ? (allowGuestMutations ? handleDeleteGuest : null)
            : handleDeleteModerator
        }
        onClose={() => setPopup({ open: false, type: popup.type, initialData: null })}
        onSave={handleSavePopup}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card?.[8] || "#C28E5C" },
  scroll: { flex: 1, backgroundColor: backgrounds.artboard || "#F9F4EF" },
  content: { padding: spacing[16], gap: spacing[12] },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[12],
    paddingHorizontal: spacing[24],
  },
  centerText: { ...textStyles.bodyMedium, color: colors.natural[450], textAlign: "center" },
  retryBtn: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: borderRadius[8],
    backgroundColor: colors.primary[500],
  },
  retryBtnText: { color: "#FFF", fontFamily: "Cairo_600SemiBold", fontSize: 13 },

  titleBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  titleHeading: {
    flex: 1,
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 30,
  },
  statusChip: {
    paddingHorizontal: spacing[10] || 10,
    paddingVertical: spacing[4],
    borderRadius: 20,
    flexShrink: 0,
  },
  statusChipText: { fontSize: 11, fontFamily: "Cairo_700Bold" },
  titleMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[12],
    paddingHorizontal: spacing[4],
  },
  titleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    maxWidth: "100%",
  },
  titleMetaText: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: colors.natural[500] || "#656565",
    flexShrink: 1,
  },

  actionsWrapper: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius[12] || 12,
    padding: spacing[12],
    borderWidth: 1,
    borderColor: colors.natural[200] || "#EEE",
  },

  checkedInRow: { flexDirection: "row", gap: spacing[8], paddingHorizontal: spacing[4] },
  checkedInChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.natural[200] || "#EEE",
  },
  checkedInChipActive: {
    borderColor: "#C28E5C",
    borderWidth: 2,
  },
  checkedInLabel: { flex: 1, fontSize: 11, fontFamily: "Cairo_500Medium", color: "#656565" },
  checkedInValue: { fontSize: 14, fontFamily: "Cairo_700Bold", color: "#2C2C2C" },

  tabsCard: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius[12] || 12,
    borderWidth: 1,
    borderColor: colors.natural[200] || "#EEE",
    overflow: "hidden",
  },
  tabsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200] || "#EEE",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  tabActive: { borderBottomWidth: 3, borderBottomColor: "#C28E5C" },
  tabText: { fontSize: 13, fontFamily: "Cairo_600SemiBold", color: "#656565" },
  tabTextActive: { color: "#2C2C2C", fontFamily: "Cairo_700Bold" },

  searchRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    alignItems: "center",
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F2F2F2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    height: 36,
  },
  searchInput: { flex: 1, fontSize: 12, fontFamily: "Cairo_500Medium", color: "#656565" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#C28E5C",
    borderRadius: 8,
  },
  addBtnText: { fontSize: 12, fontFamily: "Cairo_600SemiBold", color: "#FFF" },

  guestActionsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  outlineActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D6B392",
    backgroundColor: "#FFF",
  },
  outlineActionText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
  },
  outlineActionBtnActive: {
    backgroundColor: "#F5ECE4",
    borderColor: "#C28E5C",
  },
  filterChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D6B392",
    backgroundColor: "#FFF",
  },
  filterChipActive: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
  },
  filterChipTextActive: {
    color: "#FFF",
  },

  invitesBadge: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius[12] || 12,
    borderWidth: 1,
    borderColor: "#E8D4C4",
    padding: spacing[12],
    marginHorizontal: spacing[4],
    gap: 4,
  },
  invitesBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  invitesBadgeLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
  },
  invitesBadgeValue: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },
  invitesBadgeHelp: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#9CA3AF",
    lineHeight: 16,
  },

  bulkBar: {
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 12,
  },
  bulkBarCount: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#656565",
  },
  bulkBarActions: {
    flexDirection: "row",
    gap: 8,
  },
  bulkBarBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#C28E5C",
  },
  bulkBarBtnSecondary: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D6B392",
  },
  bulkBarBtnDisabled: {
    opacity: 0.5,
  },
  bulkBarBtnText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
  },
  bulkBarBtnTextSecondary: {
    color: "#6B4E33",
  },

  listWrapper: { padding: 12, paddingTop: 0 },
  emptyState: { alignItems: "center", gap: 8, paddingVertical: 24 },
  emptyStateText: {
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: colors.natural[450] || "#999",
  },
});

export default EventDetailsScreen;

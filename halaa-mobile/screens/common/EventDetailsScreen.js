import PartialFailureBanner from "../../components/home/PartialFailureBanner";
import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  RefreshControl,
  FlatList,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import DirectionalTextInput from "../../components/commen/DirectionalTextInput";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import {
  useUpdateAdminEventStatus,
  useDeleteAdminEvent,
} from "../../hooks";
import { useSingleEventStats } from "../../hooks/events/queries";
import { useEventGuests, useInfiniteEventGuests } from "../../hooks/guests";
import {
  useUpdateGuest,
  useDeleteGuest,
  useRotateGuestQr,
  useRevokeGuestAccess,
  useAddGuest,
  useBulkGuests,
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
import AdaptiveText from "../../components/commen/AdaptiveText";
import LocalizedText from "../../components/commen/LocalizedText";
import TotalGuestsChips from "../../components/events/TotalGuestsChips";
import RemainingInvitesBadge from "../../components/events/RemainingInvitesBadge";
import ReminderButton from "../../components/events/ReminderButton";
import { hasSendStarted, isTerminalEvent } from "../../components/events/sendAudiences";

import {
  colors,
  spacing,
  textStyles,
  backgrounds,
  borderRadius,
  layout,
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
  // NOTE on namespaces: unprefixed keys resolve against the FIRST namespace
  // only (i18next has no cross-namespace fallback), so keys living in
  // `events.json` MUST be prefixed with `events:` here. Unprefixed keys below
  // are intentional and exist in `admin.json` (eventDetails admin actions,
  // statuses, common.*, discounts.planTypes).
  const { t, currentLanguage } = useTranslation(["admin", "events"]);
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
  const [showSendSheet, setShowSendSheet] = useState(false);
  const [activeSendAction, setActiveSendAction] = useState(null);
  const { data: guestsResp, refetch: refetchGuests, isPending: audienceLoading, error: audienceError } = useEventGuests(eventId, { enabled: showSendSheet || !!activeSendAction });

  const updateStatus = useUpdateAdminEventStatus();
  const deleteEvent = useDeleteAdminEvent();
  const updateGuestMutation = useUpdateGuest();
  const deleteGuestMutation = useDeleteGuest();
  const rotateGuestQrMutation = useRotateGuestQr();
  const revokeGuestAccessMutation = useRevokeGuestAccess();
  const addGuestMutation = useAddGuest();
  const bulkGuestsMutation = useBulkGuests();
  const [selectedGuestIds, setSelectedGuestIds] = useState([]);
  const [bulkCategory, setBulkCategory] = useState("");
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
    if (Array.isArray(guestsResp?.data)) return guestsFromList;
    if (Array.isArray(event?.guestList) && event.guestList.length) return event.guestList;
    return guestsFromStats;
  }, [guestsFromList, guestsResp, event, guestsFromStats]);


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

  const scrollViewRef = useRef(null);
  const tabsRef = useRef(null);
  const tabsYRef = useRef(null);

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
      scrollViewRef.current.scrollToOffset({ offset: tabsYRef.current - 20, animated: true });
    }
  }, []);

  const STATUS_FILTER_MAP = useMemo(() => ({
    confirmed: ["confirmed", "checked_in"],
    declined: ["declined"],
    noResponse: ["invited", "pending"],
    checkedIn: ["checked_in"],
  }), []);

  const [guestSearch, setGuestSearch] = useState(search);
  useEffect(() => { setSelectedGuestIds([]); }, [search, statusFilter, activeTab]);
  const confirmBulk = (action) => {
    const data = { action, category: bulkCategory, guestIds: selectedGuestIds };
    const idempotencyKey = "bulk-" + eventId + "-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    Alert.alert(t("events:peopleBulkTitle"), t("events:peopleBulkConfirm", { count: selectedGuestIds.length }), [
      { text: t("events:peopleCancel"), style: "cancel" },
      { text: t("events:peopleApply"), onPress: async () => {
        try {
          await bulkGuestsMutation.mutateAsync({ eventId, data, idempotencyKey });
          setSelectedGuestIds([]);
        } catch (error) { Alert.alert(t("events:peopleBulkTitle"), error.message); }
      } },
    ]);
  };
  useEffect(() => { const timer = setTimeout(() => setGuestSearch(search), 300); return () => clearTimeout(timer); }, [search]);
  const guestPages = useInfiniteEventGuests(eventId, { search: guestSearch,
    status: STATUS_FILTER_MAP[statusFilter]?.join(","), deliveryStatus: statusFilter === "failedDelivery" ? "failed" : undefined });
  const filteredGuests = useMemo(() => guestPages.data?.pages.flatMap(page => page.data) || [], [guestPages.data]);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshingAll(true);
    try { await Promise.all([refetch(), guestPages.refetch(), ...(showSendSheet || activeSendAction ? [refetchGuests()] : [])]); }
    finally { setRefreshingAll(false); }
  }, [refetch, guestPages.refetch, refetchGuests, showSendSheet, activeSendAction]);

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
      t("events:guest.alerts.deleteConfirmTitle"),
      t("events:guest.alerts.deleteConfirmBody"),
      [
        { text: t("events:guest.alerts.cancel"), style: "cancel" },
        {
          text: t("events:guest.alerts.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGuestMutation.mutateAsync({ eventId, guestId });
              toast.success(t("events:guest.alerts.deleteSuccess"));
            } catch (e) {
              toast.error(e?.message || t("events:guest.alerts.deleteError"));
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
      toast.success(t("events:guest.alerts.qrUpdated"));
    } catch (e) {
      toast.error(e?.message || t("events:guest.alerts.qrRotateError"));
    }
  };

  const handleRevokeAccess = async (guest) => {
    const guestId = guest._id || guest.guestId || guest.id;
    try {
      await revokeGuestAccessMutation.mutateAsync({ eventId, guestId });
      toast.success(
        t("events:guest.alerts.accessRevokedSuccess")
      );
    } catch (e) {
      toast.error(e?.message || t("events:guest.alerts.accessRevokeError"));
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
          toast.success(t("events:guest.alerts.updateSuccess"));
        } else {
          await addGuestMutation.mutateAsync({ eventId, data: { name, phone } });
          toast.success(t("events:guest.alerts.addSuccess"));
        }
      } else {
        if (popup.initialData?._id) {
          await updateStaffMutation.mutateAsync({
            eventId,
            staffId: popup.initialData._id,
            data: { name, phone },
          });
          toast.success(t("events:guest.alerts.staffUpdateSuccess"));
        } else {
          await addStaffMutation.mutateAsync({ eventId, data: { name, phone } });
          toast.success(t("events:guest.alerts.staffAddSuccess"));
        }
      }
      setPopup({ open: false, type: popup.type, initialData: null });
    } catch (e) {
      toast.error(e?.message || t("events:guest.alerts.saveError"));
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
      t("events:guest.alerts.deleteConfirmTitle"),
      t("events:guest.alerts.staffDeleteConfirmBody"),
      [
        { text: t("events:guest.alerts.cancel"), style: "cancel" },
        {
          text: t("events:guest.alerts.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteStaffMutation.mutateAsync({ eventId, staffId });
              toast.success(t("events:guest.alerts.staffDeleteSuccess"));
            } catch (e) {
              toast.error(e?.message || t("events:guest.alerts.staffDeleteError"));
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
      toast.success(t("events:guest.alerts.staffRevokeSuccess"));
    } catch (e) {
      toast.error(e?.message || t("events:guest.alerts.staffRevokeError"));
    }
  };

  const handleExportGuests = async () => {
    try {
      // The mutation returns the XLSX blob; it does NOT persist it. We have to
      // hand the blob to `saveBlobAndShare` (write to cache + native share
      // sheet).
      const result = await exportGuestsMutation.mutateAsync({ eventId });
      if (!result?.blob) {
        throw new Error(t("events:guest.alerts.exportError"));
      }
      const share = await saveBlobAndShare(
        result.blob,
        result.filename || `event-${eventId}-guests.xlsx`,
        { dialogTitle: t("events:guest.alerts.exportTitle") }
      );
      // The share sheet opening IS the success signal — stay silent on
      // success and on user-cancel; surface only real failures.
      if (!share.success && share.message) {
        toast.error(share.message);
      }
    } catch (e) {
      toast.error(e?.message || t("events:guest.alerts.exportError"));
    }
  };

  const handleSendReminder = useCallback(async () => {
    Alert.alert(
      t("events:reminder.confirmTitle"),
      // The normal reminder is now free and targets CONFIRMED guests only.
      t("events:reminder.confirmBody"),
      [
        { text: t("events:guest.alerts.cancel"), style: "cancel" },
        {
          text: t("events:reminder.send"),
          onPress: async () => {
            try {
              await sendReminderMutation.mutateAsync({ eventId, channel: "sms" });
              toast.success(t("events:reminder.success"));
            } catch (e) {
              toast.error(e?.message || t("events:reminder.error"));
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
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t(btnLabelKey, ""),
        style: destructive ? "destructive" : "default",
        onPress: async () => {
          try {
            await updateStatus.mutateAsync({
              eventId: event.id || event._id,
              status: newStatus,
            });
            toast.success(t("events:eventDetails.updated"));
            refetch();
          } catch (e) {
            toast.error(e?.message || t("eventDetails.updateStatusFailed"));
          }
        },
      },
    ]);
  };

  const handleAdminDelete = () => {
    if (!event) return;
    Alert.alert(
      t("eventDetails.deleteConfirmTitle"),
      t("eventDetails.deleteConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEvent.mutateAsync(event.id || event._id);
              toast.success(t("eventDetails.deleted"));
              navigation.goBack();
            } catch (e) {
              toast.error(e?.message || t("eventDetails.deleteFailed"));
            }
          },
        },
      ]
    );
  };

  if (isLoading && !event) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("eventDetails.title")} showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <LocalizedText style={styles.centerText} center>
            {t("eventDetails.loading")}
          </LocalizedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !event) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("eventDetails.title")} showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger?.[500] || "#C0392B"} />
          <LocalizedText style={styles.centerText} center>
            {t("eventDetails.loadFailed")}
          </LocalizedText>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <LocalizedText style={styles.retryBtnText} center>
              {t("events:common.retry")}
            </LocalizedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("eventDetails.title")} showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerState}>
          <Ionicons name="calendar-outline" size={48} color={colors.natural[400]} />
          <LocalizedText style={styles.centerText} center>
            {t("eventDetails.notFound")}
          </LocalizedText>
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
    t("eventDetails.title");
  const hostName =
    event?.host?.name || event?.hostName || null;
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
  const invitationBalance = event?.invitationBalance || event?.subscription?.invitationBalance || null;
  const invitesRemaining = invitationBalance?.unlimited
    ? null
    : invitationBalance?.remaining ?? 0;

  // Live and terminal event guest invariants (EVT-03):
  // Live events: existing guests immutable (onEdit/onDelete disabled), new guests allowed.
  // Terminal events: all guest additions and mutations disabled.
  const isLive = event?.status === "live" || event?.status === EVENT_STATUS.LIVE;
  const isTerminal = isTerminalEvent(event) || ["failed", "archived", "deleted"].includes(event?.status);
  const allowGuestMutations = event?.capabilities?.canEditGuest ?? ["pending_review", "pending_scheduling", "scheduled"].includes(event?.status);

  // The RSVP reminder nudge is free and targets SENT, UNANSWERED guests during LIVE events.
  const hasUnansweredSentGuests = isLive && Boolean(resp?.hasUnansweredSentGuests || resp?.unansweredSentCount > 0);

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

      <FlatList
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshingAll || isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        data={activeTab === "guests" ? filteredGuests : filteredStaff}
        keyExtractor={(item) => String(item._id || item.guestId || item.id)}
        initialNumToRender={12}
        windowSize={7}
        onEndReached={() => { if (activeTab === "guests" && guestPages.hasNextPage && !guestPages.isFetchingNextPage && !guestPages.isError) guestPages.fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        renderItem={({ item: g }) => activeTab === "guests" ? (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: selectedGuestIds.includes(String(g.id || g._id)) }} accessibilityLabel={g.name}
              style={{ padding: 12 }} onPress={() => { const id = String(g.id || g._id); setSelectedGuestIds(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id].slice(0, 200)); }}>
              <Ionicons name={selectedGuestIds.includes(String(g.id || g._id)) ? "checkbox" : "square-outline"} size={24} color="#6B4E33" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
                  <GuestListItem
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
                    onRotateQr={event?.status === "completed" ? handleRotateQr : null}
                    onRevokeAccess={event?.status === "completed" ? handleRevokeAccess : null}
                  />
            </View>
          </View>
        ) : (
                <ModeratorListItem
                  moderator={g}
                  onEdit={isTerminal ? null : handleEditModerator}
                  onDelete={isTerminal ? null : handleDeleteModerator}
                  onRevoke={isTerminal ? null : handleRevokeModerator}
                />
        )}
        ListEmptyComponent={<View style={styles.emptyState}>{guestPages.isPending && <ActivityIndicator />}<LocalizedText center>{t(activeTab === "guests" ? "eventDetails.noGuests" : "events:eventDetails.noModerators")}</LocalizedText></View>}
        ListFooterComponent={<View style={{ minHeight: spacing[32] }}>{guestPages.isFetchingNextPage && <ActivityIndicator />}{guestPages.isError && <TouchableOpacity onPress={() => guestPages.refetch()}><LocalizedText>{t("events:peopleRetry")}</LocalizedText></TouchableOpacity>}</View>}
        ListHeaderComponent={<View>

        {/* Title heading — plain h2 styling, no bordered card. Only render
            the status pill when the event status is a real value (skip
            the noisy "unknown" fallback). */}
        <View style={styles.titleBlock}>
          {/* Event titles are arbitrary backend content — first-strong
              direction with isolation (blueprint §6), never page-locale. */}
          <AdaptiveText style={styles.titleHeading} numberOfLines={2}>
            {eventTitle}
          </AdaptiveText>
          {STATUS_CONFIG[event?.status] && (
            <View style={[styles.statusChip, { backgroundColor: statusCfg.bg }]}>
              <LocalizedText style={[styles.statusChipText, { color: statusCfg.color }]}>
                {statusLabel}
              </LocalizedText>
            </View>
          )}
        </View>

        {(isAdmin && hostName) || eventDate || eventTime || locationStr ? (
          <View style={styles.titleMeta}>
            {isAdmin && hostName && (
              <View style={styles.titleMetaRow}>
                <Ionicons name="person-outline" size={13} color={colors.natural[450]} />
                <AdaptiveText style={styles.titleMetaText} numberOfLines={1}>
                  {hostName}
                </AdaptiveText>
              </View>
            )}
            {(eventDate || eventTime) && (
              <View style={styles.titleMetaRow}>
                <Ionicons name="calendar-outline" size={13} color={colors.natural[450]} />
                {/* Date/time join through one interpolation key so the
                    separator cannot BiDi-spill between the two tokens. */}
                <LocalizedText style={styles.titleMetaText} numberOfLines={1}>
                  {eventDate && eventTime
                    ? t("events:eventDetails.dateTimeRow", {
                        date: formatDate(eventDate, currentLanguage),
                        time: formatLocaleTime(eventTime, currentLanguage),
                      })
                    : eventDate
                    ? formatDate(eventDate, currentLanguage)
                    : formatLocaleTime(eventTime, currentLanguage)}
                </LocalizedText>
              </View>
            )}
            {locationStr && (
              <View style={styles.titleMetaRow}>
                <Ionicons name="location-outline" size={13} color={colors.natural[450]} />
                {/* Address is arbitrary backend content → first-strong. */}
                <AdaptiveText style={styles.titleMetaText} numberOfLines={1}>
                  {locationStr}
                </AdaptiveText>
              </View>
            )}
          </View>
        ) : null}

        {/* Failure / retry banner */}
        <PartialFailureBanner event={event} currentUser={currentUser} onViewFailures={() => { setActiveTab("guests"); setStatusFilter("failedDelivery"); }} />
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
        <TotalGuestsChips
          checkedInCount={stats.checkedIn}
          totalGuests={stats.totalGuests}
          showCheckedIn={
            event?.status === EVENT_STATUS.LIVE ||
            event?.status === EVENT_STATUS.COMPLETED
          }
          activeFilter={statusFilter}
          onFilterPress={handleFilterPress}
        />

        {/* Admin-only: host info section */}
        {isAdmin && (hostName || hostEmail || hostPhone) && (
          <SectionCard
            title={t("eventDetails.host")}
            icon="person-circle-outline"
          >
            {hostName && (
              <InfoRow
                icon="person-outline"
                label={t("eventDetails.name")}
                value={hostName}
                last={!hostEmail && !hostPhone}
              />
            )}
            {hostEmail && (
              <InfoRow
                icon="mail-outline"
                label={t("eventDetails.email")}
                value={isolateLtr(hostEmail)}
                last={!hostPhone}
              />
            )}
            {hostPhone && (
              <InfoRow
                icon="call-outline"
                label={t("events:eventDetails.phone")}
                value={isolateLtr(hostPhone)}
                last
              />
            )}
          </SectionCard>
        )}

        {/* Admin-only: subscription quota */}
        {isAdmin && event?.subscription && (
          <SectionCard
            title={t("events:eventDetails.subscription")}
            icon="card-outline"
          >
            {event.subscription.planType && (
              <InfoRow
                icon="ribbon-outline"
                label={t("events:eventDetails.plan")}
                value={t(
                  `discounts.planTypes.${event.subscription.planType}`,
                  event.subscription.planType
                )}
              />
            )}
            <InfoRow
              icon="people-outline"
              label={t("events:eventDetails.guestsRemaining")}
              value={
                invitationBalance?.unlimited
                  ? t("events:remainingInvites.unlimited")
                  : formatLocaleCount(invitationBalance?.remaining ?? 0, currentLanguage)
              }
              last
            />
          </SectionCard>
        )}

        {/* Remaining invites — adding guests is free; charged only on send. */}
        {invitationBalance && (
          <RemainingInvitesBadge
            remaining={invitesRemaining}
            balance={invitationBalance}
            eventId={eventId}
          />
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
              <LocalizedText
                style={[
                  styles.tabText,
                  activeTab === "guests" && styles.tabTextActive,
                ]}
              >
                {t("events:eventDetails.guestsTabCount", {
                  count: formatLocaleCount(resp?.totalGuests ?? guestPages.data?.pages[0]?.pagination?.total ?? 0, currentLanguage),
                })}
              </LocalizedText>
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
              <LocalizedText
                style={[
                  styles.tabText,
                  activeTab === "moderators" && styles.tabTextActive,
                ]}
              >
                {t("events:eventDetails.moderatorsTabCount", {
                  count: formatLocaleCount(staffFromStats.length, currentLanguage),
                })}
              </LocalizedText>
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={16} color="#767676" />
              <DirectionalTextInput
                contentDirection="adaptive"
                placeholder={
                  activeTab === "guests"
                    ? t("events:eventDetails.searchGuests")
                    : t("events:eventDetails.searchModerators")
                }
                placeholderTextColor="#656565"
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
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
                <LocalizedText style={styles.addBtnText}>
                  {activeTab === "guests"
                    ? t("events:guestList.addGuest")
                    : t("events:eventDetails.addModerator")}
                </LocalizedText>
              </TouchableOpacity>
            )}
          </View>

          {activeTab === "guests" && statusFilter && <TouchableOpacity onPress={() => setStatusFilter(null)} style={{ padding: 12 }}><LocalizedText>{t("events:peopleClearFilter", { count: guestPages.data?.pages[0]?.pagination?.total || 0 })}</LocalizedText></TouchableOpacity>}
          {activeTab === "guests" && selectedGuestIds.length > 0 && <View style={{ padding: 12, gap: 8 }}>
            <LocalizedText>{t("events:peopleSelected", { count: selectedGuestIds.length })}</LocalizedText>
            <TouchableOpacity onPress={() => setSelectedGuestIds([])}><LocalizedText>{t("events:peopleClear")}</LocalizedText></TouchableOpacity>
            {allowGuestMutations && <>
              <DirectionalTextInput value={bulkCategory} onChangeText={setBulkCategory} maxLength={60} placeholder={t("events:peopleCategory")} />
              <TouchableOpacity disabled={bulkGuestsMutation.isPending} onPress={() => confirmBulk("category")}><LocalizedText>{t("events:peopleCategory")}</LocalizedText></TouchableOpacity>
              <TouchableOpacity disabled={bulkGuestsMutation.isPending} onPress={() => confirmBulk("remove")}><LocalizedText>{t("events:peopleRemove")}</LocalizedText></TouchableOpacity>
            </>}
            {isLive && <TouchableOpacity onPress={() => setActiveSendAction("resend")}><LocalizedText>{t("events:sendActions.items.resend")}</LocalizedText></TouchableOpacity>}
          </View>}
          {activeTab === "guests" && (
            <View style={styles.guestActionsRow}>
              {hasUnansweredSentGuests && (
                <ReminderButton
                  onPress={handleSendReminder}
                  sending={sendReminderMutation.isPending}
                />
              )}
              {!isTerminalEvent(event) && hasSendStarted(event) && (
                <TouchableOpacity
                  style={styles.outlineActionBtn}
                  onPress={() => setShowSendSheet(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="paper-plane-outline" size={14} color="#6B4E33" />
                  <LocalizedText style={styles.outlineActionText}>
                    {t("events:sendActions.menu")}
                  </LocalizedText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.outlineActionBtn}
                onPress={handleExportGuests}
                activeOpacity={0.7}
                disabled={exportGuestsMutation.isPending}
              >
                <Ionicons name="download-outline" size={14} color="#6B4E33" />
                <LocalizedText style={styles.outlineActionText}>
                  {t("events:guest.alerts.exportTitle")}
                </LocalizedText>
              </TouchableOpacity>
            </View>
          )}

        </View>
        </View>}
      />

      {showSendSheet && audienceLoading && <ActivityIndicator />}
      {showSendSheet && audienceError && <TouchableOpacity onPress={() => refetchGuests()}><LocalizedText>{t("events:peopleRetry")}</LocalizedText></TouchableOpacity>}
      <SendActionsSheet
        visible={showSendSheet && !audienceLoading && !audienceError}
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
        guests={selectedGuestIds.length ? filteredGuests.filter(guest => selectedGuestIds.includes(String(guest.id || guest._id))) : guests}
        invitesRemaining={invitesRemaining}
        invitationBalance={invitationBalance}
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
  content: {
    padding: spacing[16],
    paddingBottom: layout.dashboardPageBottom,
    gap: spacing[12],
  },
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

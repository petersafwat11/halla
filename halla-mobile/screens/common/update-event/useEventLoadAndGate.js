import { useEffect, useMemo, useState } from "react";

import { useAuthStore } from "../../../stores/authStore";
import { useTranslation } from "../../../localization";
import * as eventsService2 from "../../../services/eventsService2";
import EventsService from "../../../services/EventsService";
import useEventActionGate from "../../../hooks/useEventActionGate";

/**
 * Maps the event API response onto the form-state shape that the
 * create-event step components consume. Canonical-first dual-write
 * contract (`visualTemplate.fieldValues`, `guestReplies.*`,
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
    attendanceAutoReply: canonicalReplies.onAttend || inv.attendanceAutoReply || "",
    absenceAutoReply: canonicalReplies.onAbsent || inv.absenceAutoReply || "",
    expectedAttendanceAutoReply:
      canonicalReplies.onExpected || inv.expectedAttendanceAutoReply || "",
    guestReplies: {
      onAttend: canonicalReplies.onAttend || inv.attendanceAutoReply || "",
      onAbsent: canonicalReplies.onAbsent || inv.absenceAutoReply || "",
      onExpected: canonicalReplies.onExpected || inv.expectedAttendanceAutoReply || "",
    },
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

/**
 * Loads the event by id, runs the role-gate against the current user,
 * and exposes the live-event lockout flags. The screen owns the form
 * state and the current step; this hook owns "is the event safe to
 * edit, and what does it say".
 */
const useEventLoadAndGate = ({ eventId, currentStep }) => {
  const { t } = useTranslation("admin");

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [eventData, setEventData] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!eventId) {
      setLoadingEvent(false);
      setLoadError(t("events.update.noEventId"));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingEvent(true);
        const res = await eventsService2.getEventById(eventId, token);
        if (cancelled) return;
        const payload = res?.data;
        if (payload) setEventData(payload);
        else setLoadError(t("events.update.loadError"));
      } catch (err) {
        if (!cancelled) {
          setLoadError(err?.message || t("events.update.loadError"));
        }
      } finally {
        if (!cancelled) setLoadingEvent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, token, t]);

  const allowed = useMemo(
    () => (eventData ? canEditEvent(eventData, user) : true),
    [eventData, user]
  );

  const formValues = useMemo(
    () => (eventData ? mapApiToFormValues(eventData) : null),
    [eventData]
  );

  const actionGate = useEventActionGate({
    event: eventData,
    currentUser: user,
  });
  const isLive = actionGate.isLive;
  // Step 2 stays interactive on live events (allow-add-only); every
  // other step is frozen.
  const lockoutActive = isLive && currentStep !== 2;
  const allowAddOnlyOnStep2 = isLive && currentStep === 2;

  return {
    user,
    eventData,
    formValues,
    loadingEvent,
    loadError,
    allowed,
    isLive,
    lockoutActive,
    allowAddOnlyOnStep2,
  };
};

export default useEventLoadAndGate;

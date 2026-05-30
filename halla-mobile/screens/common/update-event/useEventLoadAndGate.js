import { useEffect, useMemo, useState } from "react";

import useEventActionGate from "@halla/shared/hooks/useEventActionGate";
import { ENDPOINTS } from "../../../config/api";
import EventsService from "../../../hooks/events/useEventForm";
import { useTranslation } from "../../../localization";
import { apiFetch } from "../../../services/http";
import { useAuthStore } from "../../../stores/authStore";

/**
 * Maps the event API response onto the form-state shape that the
 * create-event step components consume. Canonical shape only:
 * `visualTemplate.{templateRef,fieldValues,bakedImagePath}`,
 * `taqnyatTemplate.templateRef` (populated server-side),
 * `guestReplies.{onAttend,onAbsent,onExpected}`.
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

  const cv = eventData.visualTemplate || {};
  const ct = eventData.taqnyatTemplate || {};
  const replies = eventData.guestReplies || {};

  const visualRef = cv.templateRef;
  const visualTemplate = cv.isCustomUpload
    ? {
        isCustomUpload: true,
        fieldValues: {},
        bakedImagePath: cv.bakedImagePath || null,
      }
    : visualRef
    ? typeof visualRef === "object" && visualRef !== null
      ? {
          ...visualRef,
          templateRef: visualRef._id,
          _id: visualRef._id,
          id: visualRef._id,
          fieldValues: cv.fieldValues || {},
          bakedImagePath: cv.bakedImagePath || null,
          isCustomUpload: false,
        }
      : {
          templateRef: visualRef,
          _id: visualRef,
          id: visualRef,
          fieldValues: cv.fieldValues || {},
          bakedImagePath: cv.bakedImagePath || null,
          isCustomUpload: false,
        }
    : null;

  const taqnyatRef = ct.templateRef;
  const selectedTemplate = taqnyatRef
    ? typeof taqnyatRef === "object" && taqnyatRef !== null
      ? {
          _id: taqnyatRef._id,
          id: taqnyatRef._id,
          name: taqnyatRef.templateName || taqnyatRef.name,
          templateName: taqnyatRef.templateName,
          bodyText: taqnyatRef.bodyText,
          hasImageHeader: taqnyatRef.hasImageHeader || false,
          language: taqnyatRef.language || "ar",
        }
      : { _id: taqnyatRef, id: taqnyatRef }
    : null;

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
    selectedTemplate,
    taqnyatTemplate: taqnyatRef ? ct : null,
    templateImage: cv.bakedImagePath || eventData.templateImage || "",
    guestReplies: {
      onAttend: replies.onAttend || "",
      onAbsent: replies.onAbsent || "",
      onExpected: replies.onExpected || "",
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
        const response = await apiFetch(ENDPOINTS.EVENTS.BY_ID(eventId));
        const json = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setLoadError(json.message || t("events.update.loadError"));
        } else if (json?.data) {
          setEventData(json.data);
        } else {
          setLoadError(t("events.update.loadError"));
        }
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

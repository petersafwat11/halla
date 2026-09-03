import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useFormContext } from "react-hook-form";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "../../localization";
import {
  formatEventDate,
  formatDate as formatLocaleDate,
  formatTime as formatLocaleTime,
  normalizeDigits,
} from "@halaa/shared/utils/locale";
import TextInput from "../commen/TextInput";
import MapPicker from "../commen/MapPicker";
import DropdownInput from "../commen/DropdownInput";
import IosDateTimePickerSheet from "../commen/IosDateTimePickerSheet";
import Svg, { Path } from "react-native-svg";
import { normalizeSubscriptionResponse } from "@halaa/shared/utils";
import { useMySubscription } from "../../hooks/users";
import { EVENT_CATEGORIES } from "@halaa/shared/constants/eventCategories";
import { isolateAuto } from "@halaa/shared/utils/bidi";
import { useFieldDirection } from "../../hooks/useInputDirection";

const CalendarIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path
      d="M6.66667 1.66663V4.16663M13.3333 1.66663V4.16663M2.91667 7.49996H17.0833M4.16667 3.33329H15.8333C16.7538 3.33329 17.5 4.07948 17.5 4.99996V16.6666C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16667C3.24619 18.3333 2.5 17.5871 2.5 16.6666V4.99996C2.5 4.07948 3.24619 3.33329 4.16667 3.33329Z"
      stroke="#C28E5C"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ClockIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path
      d="M10 5V10L13.3333 11.6667M18.3333 10C18.3333 14.6024 14.6024 18.3333 10 18.3333C5.39763 18.3333 1.66667 14.6024 1.66667 10C1.66667 5.39763 5.39763 1.66667 10 1.66667C14.6024 1.66667 18.3333 5.39763 18.3333 10Z"
      stroke="#C28E5C"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LocationIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path
      d="M10 11.25C11.3807 11.25 12.5 10.1307 12.5 8.75C12.5 7.36929 11.3807 6.25 10 6.25C8.61929 6.25 7.5 7.36929 7.5 8.75C7.5 10.1307 8.61929 11.25 10 11.25Z"
      stroke="#C28E5C"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16.25 8.75C16.25 14.375 10 18.75 10 18.75C10 18.75 3.75 14.375 3.75 8.75C3.75 7.0924 4.40848 5.50269 5.58058 4.33058C6.75269 3.15848 8.3424 2.5 10 2.5C11.6576 2.5 13.2473 3.15848 14.4194 4.33058C15.5915 5.50269 16.25 7.0924 16.25 8.75Z"
      stroke="#C28E5C"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const validDateOrNull = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseEventTime = (value, fallback = new Date()) => {
  const result = validDateOrNull(fallback) || new Date();
  result.setSeconds(0, 0);

  if (value instanceof Date) {
    const validValue = validDateOrNull(value);
    return validValue || result;
  }

  const normalized = normalizeDigits(String(value || "").trim());
  const match = normalized.match(
    /^(\d{1,2}):(\d{2})(?::\d{2})?(?::)?\s*(AM|PM|صباحاً|مساءً|ص|م)?$/i
  );
  if (!match) return result;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();
  const isPm = period === "PM" || period === "مساءً" || period === "م";
  const isAm = period === "AM" || period === "صباحاً" || period === "ص";

  if (minutes > 59) return result;
  if (isAm || isPm) {
    if (hours < 1 || hours > 12) return result;
    hours = hours % 12 + (isPm ? 12 : 0);
  } else if (hours > 23) {
    return result;
  }

  result.setHours(hours, minutes, 0, 0);
  return result;
};

const toStoredEventTime = (date) => {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${minutes} ${period}`;
};

const StepOne = () => {
  const { setValue, watch } = useFormContext();
  const { t, currentLanguage, isRTL } = useTranslation("createEvent");
  const fieldDirection = useFieldDirection("localized");
  const { data: subData } = useMySubscription();
  const normalizedSub = normalizeSubscriptionResponse(subData);
  const isTrial = normalizedSub.subscription?.planCode === "trial";
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [draftDate, setDraftDate] = useState(() => new Date());
  const [draftTime, setDraftTime] = useState(() => new Date());

  // Earliest selectable event date enforces the backend event-date floor:
  //   event date ≥ now + minLead + 3d  (trial minLead = 15min → ~now+3d;
  //   paid minLead = 24h → now+4d). The picker is day-granular; the backend
  //   (assertEventDateFloor) is the source of truth and rejects
  //   EVENT_DATE_TOO_SOON for boundary cases.
  const minDate = useMemo(() => {
    const days = isTrial ? 3 : 4;
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [isTrial]);

  const eventDate = watch("eventDate");
  const eventTime = watch("eventTime");

  // Options for the shared DropdownInput — keep the emoji inline with the label.
  const eventTypeOptions = useMemo(
    () =>
      EVENT_CATEGORIES.map(({ code, labelKey, icon }) => ({
        value: code,
        label: `${icon || ""} ${t(labelKey)}`.trim(),
      })),
    [t]
  );

  const formatDate = (date) => {
    if (!date) return "";
    return formatEventDate(date, currentLanguage || "ar");
  };

  const pickerLocale = currentLanguage === "ar" ? "ar-SA" : "en-US";

  const commitDate = (selectedDate) => {
    setValue("eventDate", selectedDate, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const commitTime = (selectedTime) => {
    setValue("eventTime", toStoredEventTime(selectedTime), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const openDatePicker = () => {
    const savedDate = validDateOrNull(eventDate);
    setDraftDate(
      savedDate && savedDate.getTime() >= minDate.getTime()
        ? savedDate
        : new Date(minDate.getTime())
    );
    setShowTimePicker(false);
    setShowDatePicker(true);
  };

  const openTimePicker = () => {
    setDraftTime(parseEventTime(eventTime));
    setShowDatePicker(false);
    setShowTimePicker(true);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS !== "ios") {
      setShowDatePicker(false);
      if (event?.type !== "dismissed" && selectedDate) commitDate(selectedDate);
      return;
    }
    if (selectedDate) setDraftDate(selectedDate);
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS !== "ios") {
      setShowTimePicker(false);
      if (event?.type !== "dismissed" && selectedTime) commitTime(selectedTime);
      return;
    }
    if (selectedTime) setDraftTime(selectedTime);
  };

  return (
    <View style={styles.container}>
      {/* Event Name — arbitrary host content: the empty placeholder follows
          the UI locale while a filled value follows its first strong Arabic
          or Latin character (blueprint §5.3). */}
      <TextInput
        name="eventName"
        contentDirection="adaptive"
        label={t("event_name_label")}
        placeholder={t("event_name_placeholder")}
        rules={{ required: t("event_name_required") }}
      />

      {/* Event Type — shared dropdown */}
      <DropdownInput
        name="eventType"
        label={t("event_type_label")}
        placeholder={t("event_type_placeholder")}
        modalTitle={t("event_type_label")}
        options={eventTypeOptions}
      />

      {/* Event Date */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, fieldDirection.text]}>{t("event_date_label")}</Text>
        <TouchableOpacity
          style={[styles.selectButton, showDatePicker && styles.selectButtonActive]}
          onPress={openDatePicker}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("event_date_label")}
          accessibilityState={{ expanded: showDatePicker }}
        >
          <Text
            style={[
              styles.selectButtonText,
              fieldDirection.input,
              !eventDate && styles.selectButtonPlaceholder,
              { flex: 1 },
            ]}
          >
            {eventDate
              ? isolateAuto(formatDate(eventDate))
              : t("event_date_placeholder")}
          </Text>
          <CalendarIcon />
        </TouchableOpacity>
      </View>

      {showDatePicker && Platform.OS !== "ios" && (
        <DateTimePicker
          value={draftDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={minDate}
        />
      )}

      <Text style={[styles.dateHint, fieldDirection.text]}>
        {isTrial
          ? t("event_date_hint_trial")
          : t("event_date_hint")}
      </Text>

      {/* Event Time */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, fieldDirection.text]}>{t("event_time_label")}</Text>
        <TouchableOpacity
          style={[styles.selectButton, showTimePicker && styles.selectButtonActive]}
          onPress={openTimePicker}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("event_time_label")}
          accessibilityState={{ expanded: showTimePicker }}
        >
          <Text
            style={[
              styles.selectButtonText,
              fieldDirection.input,
              !eventTime && styles.selectButtonPlaceholder,
              { flex: 1 },
            ]}
          >
            {eventTime
              ? isolateAuto(formatLocaleTime(eventTime, currentLanguage || "ar"))
              : t("event_time_placeholder")}
          </Text>
          <ClockIcon />
        </TouchableOpacity>
      </View>

      {showTimePicker && Platform.OS !== "ios" && (
        <DateTimePicker
          value={draftTime}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {Platform.OS === "ios" && (
        <>
          <IosDateTimePickerSheet
            visible={showDatePicker}
            mode="date"
            title={t("event_date_label")}
            value={draftDate}
            minimumDate={minDate}
            cancelLabel={t("cancel")}
            confirmLabel={t("confirm")}
            locale={pickerLocale}
            isRTL={isRTL}
            onChange={handleDateChange}
            onCancel={() => setShowDatePicker(false)}
            onConfirm={() => {
              commitDate(draftDate);
              setShowDatePicker(false);
            }}
          />
          <IosDateTimePickerSheet
            visible={showTimePicker}
            mode="time"
            title={t("event_time_label")}
            value={draftTime}
            cancelLabel={t("cancel")}
            confirmLabel={t("confirm")}
            locale={pickerLocale}
            isRTL={isRTL}
            onChange={handleTimeChange}
            onCancel={() => setShowTimePicker(false)}
            onConfirm={() => {
              commitTime(draftTime);
              setShowTimePicker(false);
            }}
          />
        </>
      )}

      {/* Location — mixed Arabic/Latin address text renders adaptively. */}
      <MapPicker
        name="address"
        contentDirection="adaptive"
        label={t("address_label")}
        placeholder={t("address_placeholder")}
        rules={{
          required: t("location_required"),
          validate: (value) => {
            if (!value || !value.address || value.address.trim() === "") {
              return t("location_invalid");
            }
            return true;
          },
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
    flexDirection: "column",
    justifyContent: "flex-start",
  },
  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 8,
    width: "100%",
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 50,
    paddingHorizontal: 16,
    gap: 12,
  },
  selectButtonText: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
  },
  selectButtonActive: {
    borderColor: "#C28E5C",
    backgroundColor: "#FFFCF9",
  },
  selectButtonPlaceholder: {
    color: "#999",
  },
  dateHint: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#9CA3AF",
    lineHeight: 18,
    marginTop: -8,
    marginBottom: 16,
  },
});

export default StepOne;

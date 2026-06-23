import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "../../localization";
import Svg, { Path } from "react-native-svg";

const StatStaffIcon = () => (
  <Svg width="16" height="16" viewBox="0 0 12 12" fill="none">
    <Path d="M5.53841 5.53726C6.81291 5.53726 7.8461 4.50407 7.8461 3.22957C7.8461 1.95506 6.81291 0.921875 5.53841 0.921875C4.2639 0.921875 3.23071 1.95506 3.23071 3.22957C3.23071 4.50407 4.2639 5.53726 5.53841 5.53726Z" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M1.57397 10.1526C1.57397 8.36649 3.35091 6.92188 5.5386 6.92188" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8.40027 9.87573C9.21595 9.87573 9.8772 9.21449 9.8772 8.3988C9.8772 7.58312 9.21595 6.92188 8.40027 6.92188C7.58459 6.92188 6.92334 7.58312 6.92334 8.3988C6.92334 9.21449 7.58459 9.87573 8.40027 9.87573Z" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10.154 10.1529L9.6925 9.69141" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const StatPeopleIcon = () => (
  <Svg width="16" height="16" viewBox="0 0 12 12" fill="none">
    <Path d="M8.30799 3.30342C8.2803 3.2988 8.24799 3.2988 8.2203 3.30342C7.58338 3.28034 7.07568 2.7588 7.07568 2.11265C7.07568 1.45265 7.60645 0.921875 8.26645 0.921875C8.92645 0.921875 9.45722 1.45726 9.45722 2.11265C9.45261 2.7588 8.94491 3.28034 8.30799 3.30342Z" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7.83276 6.66289C8.46506 6.76904 9.16199 6.65827 9.65122 6.33058C10.302 5.89673 10.302 5.18596 9.65122 4.75212C9.15737 4.42443 8.45122 4.31365 7.81891 4.42442" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M2.75525 3.30342C2.78294 3.2988 2.81525 3.2988 2.84294 3.30342C3.47986 3.28034 3.98756 2.7588 3.98756 2.11265C3.98756 1.45265 3.45679 0.921875 2.79679 0.921875C2.13679 0.921875 1.60602 1.45726 1.60602 2.11265C1.61063 2.7588 2.11833 3.28034 2.75525 3.30342Z" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3.23061 6.66289C2.5983 6.76904 1.90138 6.65827 1.41215 6.33058C0.76138 5.89673 0.76138 5.18596 1.41215 4.75212C1.906 4.42443 2.61215 4.31365 3.24446 4.42442" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5.53864 6.75263C5.51095 6.74802 5.47864 6.74802 5.45095 6.75263C4.81403 6.72956 4.30634 6.20802 4.30634 5.56186C4.30634 4.90186 4.8371 4.37109 5.4971 4.37109C6.1571 4.37109 6.68787 4.90648 6.68787 5.56186C6.68326 6.20802 6.17557 6.73417 5.53864 6.75263Z" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M4.19535 8.20677C3.54458 8.64061 3.54458 9.35138 4.19535 9.78523C4.93381 10.2791 6.14304 10.2791 6.88151 9.78523C7.53228 9.35138 7.53228 8.64061 6.88151 8.20677C6.14766 7.71754 4.93381 7.71754 4.19535 8.20677Z" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const StatDateIcon = () => (
  <Svg width="16" height="16" viewBox="0 0 12 12" fill="none">
    <Path d="M3.69232 0.921875V2.30649" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7.38464 0.921875V2.30649" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7.38464 1.61719C8.92157 1.70026 9.69234 2.28642 9.69234 4.45565V7.30796C9.69234 9.2095 9.2308 10.1603 6.92311 10.1603H4.15387C1.84618 10.1603 1.38464 9.2095 1.38464 7.30796V4.45565C1.38464 2.28642 2.15541 1.70488 3.69234 1.61719H7.38464Z" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9.57692 8.125H1.5" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const StatTypeIcon = () => (
  <Svg width="16" height="16" viewBox="0 0 12 12" fill="none">
    <Path d="M3.69232 0.921875V2.30649" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7.38464 0.921875V2.30649" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M1.61536 4.19531H9.46151" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9.69234 3.92488V7.84796C9.69234 9.23257 9.00003 10.1556 7.38464 10.1556H3.69234C2.07695 10.1556 1.38464 9.23257 1.38464 7.84796V3.92488C1.38464 2.54026 2.07695 1.61719 3.69234 1.61719H7.38464C9.00003 1.61719 9.69234 2.54026 9.69234 3.92488Z" stroke="#C28E5C" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const RowPeopleIcon = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M18 7.16C17.94 7.15 17.87 7.15 17.81 7.16C16.43 7.11 15.33 5.98 15.33 4.58C15.33 3.15 16.48 2 17.91 2C19.34 2 20.49 3.16 20.49 4.58C20.48 5.98 19.38 7.11 18 7.16Z" stroke="#C28E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16.97 14.4402C18.34 14.6702 19.85 14.4302 20.91 13.7202C22.32 12.7802 22.32 11.2402 20.91 10.3002C19.84 9.59016 18.31 9.35016 16.94 9.59016" stroke="#C28E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5.96998 7.16C6.02998 7.15 6.09998 7.15 6.15998 7.16C7.53998 7.11 8.63998 5.98 8.63998 4.58C8.63998 3.15 7.48998 2 6.05998 2C4.62998 2 3.47998 3.16 3.47998 4.58C3.48998 5.98 4.58998 7.11 5.96998 7.16Z" stroke="#C28E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 14.4402C5.63 14.6702 4.12 14.4302 3.06 13.7202C1.65 12.7802 1.65 11.2402 3.06 10.3002C4.13 9.59016 5.66 9.35016 7.03 9.59016" stroke="#C28E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 14.6288C11.94 14.6188 11.87 14.6188 11.81 14.6288C10.43 14.5788 9.32996 13.4488 9.32996 12.0488C9.32996 10.6188 10.48 9.46875 11.91 9.46875C13.34 9.46875 14.49 10.6288 14.49 12.0488C14.48 13.4488 13.38 14.5888 12 14.6288Z" stroke="#C28E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9.08997 17.7794C7.67997 18.7194 7.67997 20.2594 9.08997 21.1994C10.69 22.2694 13.31 22.2694 14.91 21.1994C16.32 20.2594 16.32 18.7194 14.91 17.7794C13.32 16.7194 10.69 16.7194 9.08997 17.7794Z" stroke="#C28E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const RowCalendarIcon = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M8 2V5" stroke="#C28E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 2V5" stroke="#C28E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 3.5C19.33 3.68 21 4.95 21 9.65V15.83C21 19.95 20 22.01 15 22.01H9C4 22.01 3 19.95 3 15.83V9.65C3 4.95 4.67 3.69 8 3.5H16Z" stroke="#C28E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M20.75 17.6016H3.25" stroke="#C28E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const RowMapIcon = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M3.27 12C2.48 11.05 2 9.83 2 8.5C2 5.48 4.47 3 7.5 3H12.5C15.52 3 18 5.48 18 8.5C18 11.52 15.53 14 12.5 14H10" stroke="#C28E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M20.73 12C21.52 12.95 22 14.17 22 15.5C22 18.52 19.53 21 16.5 21H11.5C8.48 21 6 18.52 6 15.5C6 12.48 8.47 10 11.5 10H14" stroke="#C28E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const RowLocationIcon = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M12 13.4314C13.7231 13.4314 15.12 12.0345 15.12 10.3114C15.12 8.58828 13.7231 7.19141 12 7.19141C10.2769 7.19141 8.88 8.58828 8.88 10.3114C8.88 12.0345 10.2769 13.4314 12 13.4314Z" stroke="#C28E5C" strokeWidth="1.5" />
    <Path d="M3.62001 8.49C5.59001 -0.169998 18.42 -0.159997 20.38 8.5C21.53 13.58 18.37 17.88 15.6 20.54C13.59 22.48 10.41 22.48 8.39001 20.54C5.63001 17.88 2.47001 13.57 3.62001 8.49Z" stroke="#C28E5C" strokeWidth="1.5" />
  </Svg>
);

const formatDate = (date) => {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
};

const StatCard = ({ icon, value, label }) => (
  <View style={styles.statCard}>
    <View style={styles.iconContainer}>{icon}</View>
    <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
  </View>
);

const DetailRow = ({ icon, children }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIcon}>{icon}</View>
    <View style={{ flex: 1 }}>{children}</View>
  </View>
);

const EventSummary = () => {
  const { watch, setValue } = useFormContext();
  const { t } = useTranslation("createEvent");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const eventType = watch("eventType") || "";
  const eventName = watch("eventName") || "";
  const eventDate = watch("eventDate") || "";
  const eventTime = watch("eventTime") || "";
  const address = watch("address") || {};
  const guestList = watch("guestList") || [];
  const staffList = watch("staffList") || [];
  const selectedTemplate = watch("selectedTemplate") || null;
  const confirmReviewed = watch("confirmReviewed") || false;

  const eventTypeLabel = eventType
    ? t(`event_types.${eventType}`, t(eventType) || eventType)
    : "";

  const dateStr = formatDate(eventDate);
  const dateTime = dateStr && eventTime ? `${dateStr} - ${eventTime}` : dateStr;
  const mapLink =
    address?.latitude && address?.longitude
      ? `https://maps.google.com/?q=${address.latitude},${address.longitude}`
      : "";

  const openMap = () => {
    if (mapLink) Linking.openURL(mapLink).catch(() => {});
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Stat cards row — mirrors web SummaryCards */}
        <View style={styles.statsCards}>
          <StatCard
            icon={<StatStaffIcon />}
            value={String(staffList.length || 0)}
            label={t("number_of_staff")}
          />
          <StatCard
            icon={<StatPeopleIcon />}
            value={String(guestList.length || 0)}
            label={t("number_of_invitees")}
          />
          <StatCard
            icon={<StatDateIcon />}
            value={dateStr || "—"}
            label={t("event_date")}
          />
          <StatCard
            icon={<StatTypeIcon />}
            value={eventTypeLabel || "—"}
            label={t("event_type")}
          />
        </View>

        {/* Event details panel — mirrors web EventDataDisplay */}
        <View style={styles.detailsSection}>
          <Text style={styles.detailsHeader}>{t("event_details")}</Text>
          <View style={styles.detailsContent}>
            {!!eventName && <Text style={styles.eventTitle}>{eventName}</Text>}
            {!!selectedTemplate?.bodyText && (
              <Text style={styles.invitationText}>{selectedTemplate.bodyText}</Text>
            )}

            <View style={styles.eventDetails}>
              <DetailRow icon={<RowPeopleIcon />}>
                <Text style={styles.detailValue}>
                  {guestList.length} {t("invitees")}
                </Text>
              </DetailRow>

              {!!dateTime && (
                <DetailRow icon={<RowCalendarIcon />}>
                  <Text style={styles.detailValue}>{dateTime}</Text>
                </DetailRow>
              )}

              {!!mapLink && (
                <DetailRow icon={<RowMapIcon />}>
                  <TouchableOpacity onPress={openMap} activeOpacity={0.7}>
                    <Text style={[styles.detailValue, styles.linkValue]}>
                      {t("view_on_map")}
                    </Text>
                  </TouchableOpacity>
                </DetailRow>
              )}

              {!!address?.address && (
                <DetailRow icon={<RowLocationIcon />}>
                  <Text style={styles.detailValue}>{address.address}</Text>
                </DetailRow>
              )}
            </View>
          </View>
        </View>

        {/* Confirm checkbox — mirrors web */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setValue("confirmReviewed", !confirmReviewed)}
          activeOpacity={0.7}
        >
          <View
            style={[styles.checkbox, confirmReviewed && styles.checkboxChecked]}
          >
            {confirmReviewed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>{t("confirm_reviewed")}</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  statsCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5ECE4",
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 6,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FAF1E8",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    textAlign: "center",
  },
  detailsSection: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5ECE4",
    marginBottom: 16,
    overflow: "hidden",
  },
  detailsHeader: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FAF6EF",
    borderBottomWidth: 1,
    borderBottomColor: "#F5ECE4",
  },
  detailsContent: {
    padding: 16,
    gap: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },
  invitationText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    lineHeight: 22,
  },
  eventDetails: {
    gap: 12,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailIcon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  detailValue: {
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
  },
  linkValue: {
    color: "#C28E5C",
    textDecorationLine: "underline",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5ECE4",
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#C28E5C",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
  },
  checkmark: {
    fontSize: 13,
    color: "#FFF",
    fontFamily: "Cairo_700Bold",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
    lineHeight: 20,
  },
});

export default EventSummary;

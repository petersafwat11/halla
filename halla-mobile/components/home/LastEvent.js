import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const dropdownItems = [
  { label: "تفاصيل المناسبة", step: 1 },
  { label: "قائمة الضيوف", step: 2 },
  { label: "تصميم الدعوة", step: 3 },
  { label: "تخصيص الدعوة", step: 4 },
];

const LastEvent = ({
  event,
  onEditPress,
  onTestMessagePress,
  onViewStatsPress,
  onSchedulePress,
  onNotifyStaffPress,
  onPostEventPress,
  subscription,
  isNotifyingStaff,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  if (!event) return null;

  const title = event.title || event.eventDetails?.title || "مناسبة بدون عنوان";
  const guestCount = event.guestCount || 0;
  const testMessageSent = event.testMessageSent || false;

  // Match web: template check via invitationSettings
  const hasTemplate = !!(event.invitationSettings?.selectedTemplate?.name);
  const canSendTest = hasTemplate && !testMessageSent;
  const canSchedule = hasTemplate && testMessageSent;
  const isCompleted = event.status === "completed";
  const hasSupervisors = (event.staffCount || event.staffList?.length || 0) > 0;

  // Format date and time
  const formatDateTime = () => {
    const date = event.date || event.eventDetails?.date;
    if (date) {
      const d = new Date(date);
      const dateStr = d.toLocaleDateString("ar-SA", {
        weekday: "long",
        day: "numeric",
        month: "numeric",
        year: "numeric",
      });
      const timeStr = event.entryTime || event.time || event.eventDetails?.time || "";
      return `${dateStr}${timeStr ? " - " + timeStr : ""}`;
    }
    return event.dateTime || "";
  };

  // Match web's getUnifiedStatus — based on event.status
  const getUnifiedStatus = () => {
    const statusMap = {
      draft:      { backgroundColor: "#E9ECEF", color: "#6C757D", text: "مسودة" },
      scheduled:  { backgroundColor: "#FFF3E0", color: "#F57C00", text: "مجدول" },
      live:       { backgroundColor: "#EAF4EF", color: "#2A8C5B", text: "نشطة" },
      completed:  { backgroundColor: "#F2F2F2", color: "#656565", text: "مكتمل" },
      suspended:  { backgroundColor: "#FFEBEE", color: "#C62828", text: "موقوف" },
    };
    return statusMap[event.status] || { backgroundColor: "#F9F4EF", color: "#C28E5C", text: "محفوظة" };
  };

  const statusStyle = getUnifiedStatus();

  // Match web stats keys: pending / declined / approved
  const noResponse = event.stats?.pending ?? 0;
  const declined   = event.stats?.declined ?? 0;
  const approved   = event.stats?.approved ?? 0;

  const location =
    event.locationName ||
    event.location?.address ||
    event.location?.city ||
    (typeof event.location === "string" ? event.location : "") ||
    "";

  const handleEditStep = (step) => {
    setShowDropdown(false);
    if (onEditPress) onEditPress(step);
  };

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.contentRow}>
        {/* Text Content */}
        <View style={styles.textContent}>
          {/* Title and Status */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {statusStyle.text}
              </Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.details}>
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={12} color="#C28E5C" />
              <Text style={styles.detailText}>{guestCount} ضيف</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={12} color="#C28E5C" />
              <Text style={styles.detailText}>{formatDateTime()}</Text>
            </View>
            {!!location && (
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={12} color="#C28E5C" />
                <Text style={styles.detailText}>{location}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Event Image */}
        <View style={styles.imageContainer}>
          {event.image ? (
            <Image source={{ uri: event.image }} style={styles.image} />
          ) : (
            <View style={styles.placeholderImage} />
          )}
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{noResponse}</Text>
          <Text style={styles.statLabel}>لم يرد: </Text>
          <View style={[styles.statDot, { backgroundColor: "#A0A0A0" }]} />
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{declined}</Text>
          <Text style={styles.statLabel}>معتذر: </Text>
          <View style={[styles.statDot, { backgroundColor: "#C0392B" }]} />
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{approved}</Text>
          <Text style={styles.statLabel}>موافق: </Text>
          <View style={[styles.statDot, { backgroundColor: "#2A8C5B" }]} />
        </View>
      </View>

      {/* Quota Section */}
      {subscription && (
        <View style={styles.quotaRow}>
          <View style={styles.quotaItem}>
            <Text style={styles.quotaLabel}>ضيوف المناسبة المتبقين</Text>
            <Text style={styles.quotaValue}>{event.quota?.remainingGuests ?? 0}</Text>
          </View>
          <View style={styles.quotaSeparator} />
          <View style={styles.quotaItem}>
            <Text style={styles.quotaLabel}>الرسائل التعويضية المتبقية</Text>
            <Text style={styles.quotaValue}>{event.quota?.compensationMessages ?? 0}</Text>
          </View>
        </View>
      )}

      {/* Action Buttons — matches web outline buttons */}
      <View style={styles.actionButtonsRow}>
        {canSendTest && onTestMessagePress && (
          <TouchableOpacity style={styles.outlineButton} onPress={onTestMessagePress} activeOpacity={0.7}>
            <Text style={styles.outlineButtonText}>رسالة تجريبية</Text>
          </TouchableOpacity>
        )}
        {canSchedule && onSchedulePress && (
          <TouchableOpacity style={styles.outlineButton} onPress={onSchedulePress} activeOpacity={0.7}>
            <Text style={styles.outlineButtonText}>جدولة المناسبة</Text>
          </TouchableOpacity>
        )}
        {hasSupervisors && onNotifyStaffPress && (
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={onNotifyStaffPress}
            activeOpacity={0.7}
            disabled={isNotifyingStaff}
          >
            <Text style={styles.outlineButtonText}>
              {isNotifyingStaff ? "جارٍ الإرسال..." : "إشعار الفريق"}
            </Text>
          </TouchableOpacity>
        )}
        {onViewStatsPress && (
          <TouchableOpacity style={styles.outlineButton} onPress={onViewStatsPress} activeOpacity={0.7}>
            <Text style={styles.outlineButtonText}>عرض الإحصائيات</Text>
          </TouchableOpacity>
        )}
        {isCompleted && onPostEventPress && (
          <TouchableOpacity style={styles.outlineButton} onPress={onPostEventPress} activeOpacity={0.7}>
            <Text style={styles.outlineButtonText}>مشاركة ما بعد المناسبة</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Edit Dropdown — matches web's edit button with step selection */}
      <View style={styles.dropdownWrapper}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setShowDropdown(!showDropdown)}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={12} color="#FFF" />
          <Text style={styles.editButtonText}>تعديل المناسبة</Text>
          <Ionicons
            name={showDropdown ? "chevron-up" : "chevron-down"}
            size={12}
            color="#FFF"
          />
        </TouchableOpacity>
        {showDropdown && (
          <View style={styles.dropdown}>
            {dropdownItems.map((item) => (
              <TouchableOpacity
                key={item.step}
                style={styles.dropdownItem}
                onPress={() => handleEditStep(item.step)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderTopWidth: 1,
    borderRightWidth: 6,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#C28E5C",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  contentRow: {
    flexDirection: "row",
    gap: 16,
  },
  textContent: {
    flex: 1,
    gap: 8,
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    lineHeight: 16,
    letterSpacing: 0.06,
  },
  title: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 24,
    letterSpacing: 0.024,
  },
  details: {
    gap: 8,
    alignItems: "flex-end",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 16,
    letterSpacing: 0.06,
  },
  imageContainer: {
    width: 54,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F2F2F2",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F2F2F2",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F7F7F7",
    borderRadius: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    lineHeight: 16,
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: 9999,
  },
  quotaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9F4EF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8D4C4",
  },
  quotaItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  quotaLabel: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 16,
  },
  quotaValue: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 20,
  },
  quotaSeparator: {
    width: 1,
    height: 28,
    backgroundColor: "#E8D4C4",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  outlineButton: {
    flex: 1,
    minWidth: 70,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#D6B392",
    backgroundColor: "#FFF",
  },
  outlineButtonText: {
    fontSize: 11,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
    lineHeight: 16,
  },
  dropdownWrapper: {
    position: "relative",
  },
  editButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#C28E5C",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    height: 32,
  },
  editButtonText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    lineHeight: 16,
    letterSpacing: 0.06,
  },
  dropdown: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8D4C4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  dropdownItemText: {
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
    textAlign: "right",
  },
});

export default LastEvent;

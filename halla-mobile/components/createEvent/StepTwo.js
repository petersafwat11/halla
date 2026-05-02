import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput as RNTextInput,
  ActivityIndicator,
} from "react-native";
import { useFormContext } from "react-hook-form";
import EventsService from "../../services/EventsService";
import Button from "../commen/Button";
import ListOfGuestsORModerators from "./ListOfGuestsORModerators";
import GuestQuotaCounter from "./GuestQuotaCounter";
import Svg, { Path } from "react-native-svg";
import { exportTemplateXLSX, importFromXLSX } from "../../utils/xlsxUtils";

const AddIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path
      d="M10 4.16663V15.8333M4.16667 10H15.8333"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ListIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path
      d="M6.66667 5H17.5M6.66667 10H17.5M6.66667 15H17.5M2.5 5H2.50833M2.5 10H2.50833M2.5 15H2.50833"
      stroke="#C28E5C"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const UploadIcon = ({ disabled }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
      stroke={disabled ? "#AAAAAA" : "#C28E5C"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DownloadIcon = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
      stroke="#C28E5C"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const StepTwo = ({
  guestList = [],
  staffList = [],
  subscription = null,
}) => {
  const { setValue, watch } = useFormContext();
  const formData = watch();

  const [activeTab, setActiveTab] = useState("guests");
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showModeratorModal, setShowModeratorModal] = useState(false);

  // Guest form state
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestErrors, setGuestErrors] = useState({});

  // Moderator form state
  const [moderatorName, setModeratorName] = useState("");
  const [moderatorPhone, setModeratorPhone] = useState("");
  const [moderatorErrors, setModeratorErrors] = useState({});

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [showImportErrors, setShowImportErrors] = useState(false);

  // Calculate guest limits using new subscription schema
  const guestLimit =
    subscription?.planId?.limits?.maxInvitesPerEvent ||
    subscription?.limits?.maxInvitesPerEvent ||
    null;

  const poolRemaining =
    subscription?.invitePool != null
      ? (subscription.invitePool + (subscription.compensationPool || 0)) - (subscription.invitesConsumed || 0)
      : null;

  // effectiveLimit: -1 means unlimited; null means no subscription / use fallback
  const effectiveLimit = guestLimit ?? poolRemaining ?? 300;

  const isUnlimited = effectiveLimit === -1;
  const isLimitReached = !isUnlimited && guestList.length >= effectiveLimit;

  // ============================================================================
  // GUEST HANDLERS
  // ============================================================================

  const handleAddGuest = useCallback(() => {
    // Check if limit reached before adding
    if (isLimitReached) {
      Alert.alert(
        "تم الوصول للحد الأقصى",
        "لقد وصلت للحد الأقصى من الضيوف المسموح به في باقتك. قم بترقية باقتك لإضافة المزيد من الضيوف.",
        [{ text: "حسناً" }],
      );
      return;
    }

    const guest = {
      name: guestName,
      phone: guestPhone,
    };

    const result = EventsService.addListItem(
      guest,
      formData.guestList,
      "guest",
    );

    if (result.success) {
      setValue("guestList", result.list, { shouldValidate: true });
      setGuestName("");
      setGuestPhone("");
      setGuestErrors({});
    } else {
      setGuestErrors(result.errors);
    }
  }, [guestName, guestPhone, formData.guestList, setValue, isLimitReached]);

  const handleEditGuest = useCallback(
    (id, updatedGuest) => {
      const result = EventsService.editListItem(
        id,
        updatedGuest,
        formData.guestList,
        "guest",
      );
      if (result.success) {
        setValue("guestList", result.list, { shouldValidate: true });
        return { success: true };
      }
      return { success: false, errors: result.errors };
    },
    [formData.guestList, setValue],
  );

  const handleRemoveGuest = useCallback(
    (id) => {
      Alert.alert("حذف ضيف", "هل أنت متأكد من حذف هذا الضيف؟", [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () => {
            const updatedList = EventsService.removeListItem(
              id,
              formData.guestList,
            );
            setValue("guestList", updatedList, { shouldValidate: true });
          },
        },
      ]);
    },
    [formData.guestList, setValue],
  );

  // ============================================================================
  // MODERATOR HANDLERS
  // ============================================================================

  const handleAddModerator = useCallback(() => {
    const moderator = {
      name: moderatorName,
      phone: moderatorPhone,
    };

    const result = EventsService.addListItem(
      moderator,
      formData.staffList || [],
      "moderator",
    );

    if (result.success) {
      setValue("staffList", result.list, { shouldValidate: true });
      setModeratorName("");
      setModeratorPhone("");
      setModeratorErrors({});
    } else {
      setModeratorErrors(result.errors);
    }
  }, [moderatorName, moderatorPhone, formData.staffList, setValue]);

  const handleEditModerator = useCallback(
    (id, updatedModerator) => {
      const result = EventsService.editListItem(
        id,
        updatedModerator,
        formData.staffList || [],
        "moderator",
      );
      if (result.success) {
        setValue("staffList", result.list, { shouldValidate: true });
        return { success: true };
      }
      return { success: false, errors: result.errors };
    },
    [formData.staffList, setValue],
  );

  const handleRemoveModerator = useCallback(
    (id) => {
      Alert.alert("حذف مشرف", "هل أنت متأكد من حذف هذا المشرف؟", [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () => {
            const updatedList = EventsService.removeListItem(
              id,
              formData.staffList || [],
            );
            setValue("staffList", updatedList, { shouldValidate: true });
          },
        },
      ]);
    },
    [formData.staffList, setValue],
  );

  // ============================================================================
  // IMPORT / EXPORT HANDLERS
  // ============================================================================

  const GUEST_HEADERS = [
    { key: "name", label: "الاسم" },
    { key: "phone", label: "رقم الجوال" },
  ];

  const validateImportRow = useCallback((rowData, rowNumber) => {
    const errors = [];
    if (!rowData.name || !rowData.name.trim()) errors.push("الاسم مطلوب");
    if (!rowData.phone || !rowData.phone.trim()) {
      errors.push("رقم الجوال مطلوب");
    } else if (!/^5[0-9]{8}$/.test(rowData.phone.trim())) {
      errors.push("رقم الجوال يجب أن يكون 9 أرقام ويبدأ بـ 5");
    }
    return { isValid: errors.length === 0, errors };
  }, []);

  const handleExportTemplate = useCallback(async () => {
    const sampleData = [{ name: "محمد علي", phone: "512345678" }];
    const result = await exportTemplateXLSX(
      GUEST_HEADERS,
      sampleData,
      "قالب_الضيوف"
    );
    if (!result.success) {
      Alert.alert("خطأ", result.message);
    }
  }, []);

  const handleImportGuests = useCallback(async () => {
    if (isLimitReached) {
      Alert.alert(
        "تم الوصول للحد الأقصى",
        "لقد وصلت للحد الأقصى من الضيوف المسموح به في باقتك.",
        [{ text: "حسناً" }]
      );
      return;
    }

    setIsImporting(true);
    setImportErrors([]);
    setShowImportErrors(false);

    try {
      const result = await importFromXLSX(GUEST_HEADERS, validateImportRow);

      if (result.canceled) return;

      if (!result.success) {
        Alert.alert("خطأ في الاستيراد", result.message);
        return;
      }

      const existingPhones = (formData.guestList || []).map(
        (g) => g.phone || g.mobile
      );

      const uniqueGuests = result.data.filter((g) => {
        const phone = (g.phone || "").trim();
        if (existingPhones.includes(phone)) return false;
        existingPhones.push(phone);
        return true;
      });

      // Respect guest limit
      const remaining =
        !isUnlimited && effectiveLimit > 0
          ? Math.max(0, effectiveLimit - (formData.guestList || []).length)
          : uniqueGuests.length;

      const toInsert = uniqueGuests.slice(0, remaining);
      const skipped = uniqueGuests.length - toInsert.length;

      if (toInsert.length > 0) {
        setValue("guestList", [...(formData.guestList || []), ...toInsert], {
          shouldValidate: true,
        });
      }

      if (result.errors.length > 0) {
        setImportErrors(result.errors);
        setShowImportErrors(true);
      }

      const skippedMsg =
        skipped > 0 ? `\nتم تخطي ${skipped} ضيف بسبب الحد الأقصى.` : "";
      const dupMsg =
        uniqueGuests.length < result.data.length
          ? `\nتم تخطي ${result.data.length - uniqueGuests.length} ضيف مكرر.`
          : "";

      Alert.alert(
        "تم الاستيراد",
        `تم إضافة ${toInsert.length} ضيف بنجاح.${dupMsg}${skippedMsg}${
          result.errors.length > 0
            ? `\n${result.errors.length} صف يحتوي على أخطاء.`
            : ""
        }`
      );
    } catch (error) {
      Alert.alert("خطأ", "حدث خطأ أثناء استيراد الملف");
    } finally {
      setIsImporting(false);
    }
  }, [
    isLimitReached,
    isUnlimited,
    guestLimit,
    formData.guestList,
    setValue,
    validateImportRow,
  ]);

  const currentList = activeTab === "guests" ? guestList : staffList;
  const currentCount = currentList?.length || 0;

  return (
    <View style={styles.container}>
      {/* Guest Quota Counter */}
      {subscription && activeTab === "guests" && (
        <GuestQuotaCounter
          currentGuests={guestList.length}
          subscription={subscription}
        />
      )}

      {/* Limit Reached Warning */}
      {isLimitReached && activeTab === "guests" && (
        <View style={styles.limitReachedBanner}>
          <Text style={styles.limitReachedIcon}>⚠️</Text>
          <View style={styles.limitReachedContent}>
            <Text style={styles.limitReachedText}>
              تم الوصول للحد الأقصى من الضيوف. لا يمكنك إضافة المزيد.
            </Text>
            <Text style={styles.upgradeHint}>
              قم بترقية باقتك للحصول على المزيد من الضيوف
            </Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "guests" && styles.tabActive]}
          onPress={() => setActiveTab("guests")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "guests" && styles.tabTextActive,
            ]}
          >
            الضيوف
          </Text>
          {guestList.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{guestList.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "moderators" && styles.tabActive]}
          onPress={() => setActiveTab("moderators")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "moderators" && styles.tabTextActive,
            ]}
          >
            المشرفين
          </Text>
          {staffList.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{staffList.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Add Form */}
      {activeTab === "guests" ? (
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>اسم الضيف</Text>
            <RNTextInput
              style={[
                styles.textInput,
                guestErrors.name && styles.textInputError,
                isLimitReached && styles.textInputDisabled,
              ]}
              placeholder="أدخل اسم الضيف"
              placeholderTextColor="#999"
              value={guestName}
              onChangeText={setGuestName}
              editable={!isLimitReached}
            />
            {guestErrors.name && (
              <Text style={styles.errorText}>{guestErrors.name}</Text>
            )}
          </View>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>رقم الجوال</Text>
            <RNTextInput
              style={[
                styles.textInput,
                guestErrors.phone && styles.textInputError,
                isLimitReached && styles.textInputDisabled,
              ]}
              placeholder="5xxxxxxxx"
              placeholderTextColor="#999"
              value={guestPhone}
              onChangeText={setGuestPhone}
              keyboardType="phone-pad"
              editable={!isLimitReached}
            />
            {guestErrors.phone && (
              <Text style={styles.errorText}>{guestErrors.phone}</Text>
            )}
          </View>
          <Button
            text="إضافة ضيف"
            onPress={handleAddGuest}
            disabled={!guestName.trim() || !guestPhone.trim() || isLimitReached}
          />

          {/* Import / Export Buttons */}
          <View style={styles.importExportRow}>
            <TouchableOpacity
              style={[
                styles.importExportBtn,
                isLimitReached && styles.importExportBtnDisabled,
              ]}
              onPress={handleImportGuests}
              disabled={isLimitReached || isImporting}
              activeOpacity={0.7}
            >
              {isImporting ? (
                <ActivityIndicator size="small" color="#C28E5C" />
              ) : (
                <UploadIcon disabled={isLimitReached} />
              )}
              <Text
                style={[
                  styles.importExportBtnText,
                  isLimitReached && styles.importExportBtnTextDisabled,
                ]}
              >
                استيراد Excel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.importExportBtn}
              onPress={handleExportTemplate}
              activeOpacity={0.7}
            >
              <DownloadIcon />
              <Text style={styles.importExportBtnText}>تنزيل القالب</Text>
            </TouchableOpacity>
          </View>

          {/* Import Errors */}
          {showImportErrors && importErrors.length > 0 && (
            <View style={styles.importErrorsBox}>
              <View style={styles.importErrorsHeader}>
                <Text style={styles.importErrorsTitle}>
                  أخطاء في الاستيراد ({importErrors.length})
                </Text>
                <TouchableOpacity onPress={() => setShowImportErrors(false)}>
                  <Text style={styles.importErrorsClose}>✕</Text>
                </TouchableOpacity>
              </View>
              {importErrors.map((err, idx) => (
                <Text key={idx} style={styles.importErrorItem}>
                  • سطر {err.row}: {err.errors.join("، ")}
                </Text>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>اسم المشرف</Text>
            <RNTextInput
              style={[
                styles.textInput,
                moderatorErrors.name && styles.textInputError,
              ]}
              placeholder="أدخل اسم المشرف"
              placeholderTextColor="#999"
              value={moderatorName}
              onChangeText={setModeratorName}
            />
            {moderatorErrors.name && (
              <Text style={styles.errorText}>{moderatorErrors.name}</Text>
            )}
          </View>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>رقم الجوال</Text>
            <RNTextInput
              style={[
                styles.textInput,
                moderatorErrors.phone && styles.textInputError,
              ]}
              placeholder="5xxxxxxxx"
              placeholderTextColor="#999"
              value={moderatorPhone}
              onChangeText={setModeratorPhone}
              keyboardType="phone-pad"
            />
            {moderatorErrors.phone && (
              <Text style={styles.errorText}>{moderatorErrors.phone}</Text>
            )}
          </View>
          <Button
            text="إضافة مشرف"
            onPress={handleAddModerator}
            disabled={!moderatorName.trim() || !moderatorPhone.trim()}
          />
        </View>
      )}

      {/* View List Button */}
      {currentCount > 0 && (
        <TouchableOpacity
          style={styles.viewListButton}
          onPress={() => {
            if (activeTab === "guests") {
              setShowGuestModal(true);
            } else {
              setShowModeratorModal(true);
            }
          }}
          activeOpacity={0.7}
        >
          <ListIcon />
          <Text style={styles.viewListButtonText}>
            عرض القائمة ({currentCount})
          </Text>
        </TouchableOpacity>
      )}

      {/* Guest List Modal */}
      <ListOfGuestsORModerators
        visible={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        title="قائمة الضيوف"
        list={guestList}
        type="guest"
        onEdit={handleEditGuest}
        onRemove={handleRemoveGuest}
      />

      {/* Moderator List Modal */}
      <ListOfGuestsORModerators
        visible={showModeratorModal}
        onClose={() => setShowModeratorModal(false)}
        title="قائمة المشرفين"
        list={staffList}
        type="moderator"
        onEdit={handleEditModerator}
        onRemove={handleRemoveModerator}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  tabActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#656565",
  },
  tabTextActive: {
    color: "#C28E5C",
  },
  badge: {
    backgroundColor: "#C28E5C",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
  },
  form: {
    marginBottom: 24,
  },
  viewListButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#C28E5C",
    gap: 8,
  },
  viewListButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#C28E5C",
  },
  inputWrapper: {
    marginBottom: 16,
    width: "100%",
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    textAlign: "right",
  },
  textInputError: {
    borderColor: "#e74c3c",
  },
  textInputDisabled: {
    backgroundColor: "#F5F5F5",
    borderColor: "#E0E0E0",
    color: "#AAAAAA",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 4,
  },
  importExportRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  importExportBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#C28E5C",
    backgroundColor: "#FFF",
  },
  importExportBtnDisabled: {
    borderColor: "#E0E0E0",
    backgroundColor: "#F9F9F9",
  },
  importExportBtnText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#C28E5C",
  },
  importExportBtnTextDisabled: {
    color: "#AAAAAA",
  },
  importErrorsBox: {
    marginTop: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
  },
  importErrorsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  importErrorsTitle: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    color: "#DC2626",
  },
  importErrorsClose: {
    fontSize: 14,
    color: "#DC2626",
    fontFamily: "Cairo_600SemiBold",
  },
  importErrorItem: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#991B1B",
    marginBottom: 4,
    lineHeight: 18,
  },
  limitReachedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  limitReachedIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  limitReachedContent: {
    flex: 1,
  },
  limitReachedText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#92400E",
    marginBottom: 4,
  },
  upgradeHint: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#92400E",
  },
});

export default StepTwo;

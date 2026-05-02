import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useFormContext } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { getApprovedTemplates } from "../../services/messagingService";
import TextInput from "../commen/TextInput";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const AUTO_REPLIES = {
  attendance:
    "شكراً لتأكيد حضورك! يسعدنا أن تكون معنا في هذه المناسبة. سيصلك رمز الدخول الخاص بك قريباً. 🎉",
  maybe:
    "شكراً لردّك! نأمل أن تتمكن من الحضور ونتطلع إلى رؤيتك بيننا. 🤍",
  absence:
    "شكراً لإعلامنا. نتفهم ظروفك ونتمنى لك دوام الصحة والسعادة. 🌹",
};

const TAB_OPTIONS = [
  { key: "attendance", labelAr: "الحضور" },
  { key: "maybe", labelAr: "ربما" },
  { key: "absence", labelAr: "الاعتذار" },
];

const StepFour = () => {
  const { setValue, watch } = useFormContext();
  const token = useAuthStore((state) => state.token);
  const [activeTab, setActiveTab] = useState("attendance");
  const tabAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH - 32);

  const selectedTemplate = watch("selectedTemplate");

  // Fetch approved templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ["messaging", "templates", "approved"],
    queryFn: () => getApprovedTemplates(token),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const templates = templatesData?.templates || templatesData?.data?.templates || [];

  // Set fixed auto-reply defaults on mount
  useEffect(() => {
    setValue("attendanceAutoReply", AUTO_REPLIES.attendance, { shouldDirty: false });
    setValue("absenceAutoReply", AUTO_REPLIES.absence, { shouldDirty: false });
    setValue("expectedAttendanceAutoReply", AUTO_REPLIES.maybe, { shouldDirty: false });
  }, [setValue]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleTabChange = (tabKey, index) => {
    setActiveTab(tabKey);
    Animated.spring(tabAnimation, {
      toValue: index,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
  };

  const handleTemplateSelect = (template) => {
    setValue("selectedTemplate", template, { shouldValidate: true });
    // Store bodyText as invitationMessage for preview purposes
    setValue("invitationMessage", template.bodyText || template.name || "");
  };

  const tabWidth = (containerWidth - 48) / 3;

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim }]}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
      {/* Template Selector */}
      <View style={styles.templateSection}>
        <Text style={styles.sectionLabel}>اختر قالب الرسالة</Text>
        <Text style={styles.templateHint}>
          القوالب أدناه معتمدة من Meta وجاهزة للإرسال فوراً دون انتظار
        </Text>

        {templatesLoading ? (
          <View style={styles.templateLoading}>
            <ActivityIndicator color="#C28E5C" size="small" />
            <Text style={styles.templateLoadingText}>جاري تحميل القوالب المعتمدة...</Text>
          </View>
        ) : templates.length === 0 ? (
          <View style={styles.templateEmpty}>
            <Text style={styles.templateEmptyText}>
              لا توجد قوالب معتمدة حالياً. تواصل مع الدعم لإضافة قوالب جديدة.
            </Text>
          </View>
        ) : (
          <View style={styles.templateList}>
            {templates.map((template) => {
              const isSelected = selectedTemplate?.name === template.name;
              return (
                <TouchableOpacity
                  key={template.id || template.name}
                  style={[styles.templateOption, isSelected && styles.templateOptionSelected]}
                  onPress={() => handleTemplateSelect(template)}
                  activeOpacity={0.7}
                >
                  <View style={styles.templateOptionTop}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    {isSelected && (
                      <Text style={styles.templateCheck}>✓</Text>
                    )}
                  </View>
                  {template.bodyText ? (
                    <Text style={styles.templatePreview}>
                      {template.bodyText}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Auto Replies Section — read-only */}
      <View style={styles.autoRepliesContainer}>
        <Text style={styles.sectionLabel}>الردود التلقائية</Text>
        <Text style={styles.repliesHint}>
          تُرسل هذه الرسائل تلقائياً للضيف فور اختياره — غير قابلة للتعديل
        </Text>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {TAB_OPTIONS.map((tab, index) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => handleTabChange(tab.key, index)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.labelAr}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Read-only reply box */}
        <View style={styles.readOnlyReplyBox}>
          <Text style={styles.readOnlyReplyText}>
            {AUTO_REPLIES[activeTab]}
          </Text>
        </View>
      </View>

      {/* Optional Note */}
      <TextInput
        name="note"
        label={
          <Text>
            <Text style={styles.labelText}>أضف ملاحظة </Text>
            <Text style={styles.optionalText}>(اختياري)</Text>
          </Text>
        }
        placeholder="اضف ملاحظتك هنا"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Template section
  templateSection: {
    marginBottom: 16,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
    marginBottom: 4,
  },
  templateHint: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  templateList: {
    gap: 8,
  },
  templateOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#DFDFDF",
    backgroundColor: "#FDFDFD",
    marginBottom: 8,
  },
  templateOptionSelected: {
    borderColor: "#C28E5C",
    backgroundColor: "#FDF8F4",
  },
  templateOptionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  templateName: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
    flex: 1,
  },
  templateCheck: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#C28E5C",
    marginStart: 8,
  },
  templatePreview: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 20,
  },
  templateLoading: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#DFDFDF",
    backgroundColor: "#FDFDFD",
    gap: 8,
  },
  templateLoadingText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
  },
  templateEmpty: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#DFDFDF",
    backgroundColor: "#FDFDFD",
    alignItems: "center",
  },
  templateEmptyText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    textAlign: "center",
  },
  // Auto replies section
  autoRepliesContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#DFDFDF",
    backgroundColor: "#FDFDFD",
  },
  repliesHint: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#F7F7F7",
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
  },
  tabTextActive: {
    fontFamily: "Cairo_600SemiBold",
    color: "#09090B",
  },
  readOnlyReplyBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#DFDFDF",
    minHeight: 60,
  },
  readOnlyReplyText: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    lineHeight: 24,
    textAlign: "right",
  },
  labelText: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
  },
  optionalText: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#767676",
  },
});

export default StepFour;

import React from "react";
import {
  View,
  StyleSheet,
  Linking,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import LocalizedText from "../../components/commen/LocalizedText";
import { Button } from "../../components/commen";
import { LEGAL_CONTACT } from "@halaa/shared/legal/contact";

export default function VendorApplicationPendingScreen({ navigation, route }) {
  const { t } = useTranslation("auth");
  const applicationId = route?.params?.applicationId || "";

  const handleContactSupport = () => {
    Linking.openURL(`mailto:${LEGAL_CONTACT.supportEmail.value}`).catch(() => {});
  };

  const handleGoMarketplace = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Marketplace" }],
    });
  };

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Welcome" }],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name="clock-time-four-outline"
              size={52}
              color="#c28e5c"
            />
          </View>

          <View style={styles.badge}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#a46e38" />
            <LocalizedText style={styles.badgeText}>
              {t("signupForm.vendor.pendingApproval.badge", {
                defaultValue: "طلبك قيد المراجعة",
              })}
            </LocalizedText>
          </View>

          <LocalizedText style={styles.title}>
            {t("signupForm.vendor.pendingApproval.title", {
              defaultValue: "تم استلام طلب الانضمام بنجاح",
            })}
          </LocalizedText>

          <LocalizedText style={styles.description}>
            {t("signupForm.vendor.pendingApproval.description", {
              defaultValue:
                "شكراً لاهتمامك بالانضمام إلى منصة هلا كمزود خدمة. طلبك ومستنداتك قيد المراجعة والتدقيق حالياً.",
            })}
          </LocalizedText>

          {applicationId ? (
            <View style={styles.idBox}>
              <LocalizedText style={styles.idLabel}>
                {t("signupForm.vendor.pendingApproval.applicationIdLabel", {
                  defaultValue: "رقم الطلب",
                })}
                :
              </LocalizedText>
              <LocalizedText style={styles.idValue}>#{applicationId}</LocalizedText>
            </View>
          ) : null}

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="time-outline" size={18} color="#c28e5c" />
                <LocalizedText style={styles.infoTitle}>
                  {t("signupForm.vendor.pendingApproval.reviewTimeTitle", {
                    defaultValue: "مدة المراجعة المتوقعة",
                  })}
                </LocalizedText>
              </View>
              <LocalizedText style={styles.infoDesc}>
                {t("signupForm.vendor.pendingApproval.reviewTimeDescription", {
                  defaultValue: "تتم مراجعة الطلبات والتحقق من المستندات خلال 1 إلى 3 أيام عمل.",
                })}
              </LocalizedText>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="mail-outline" size={18} color="#c28e5c" />
                <LocalizedText style={styles.infoTitle}>
                  {t("signupForm.vendor.pendingApproval.nextStepsTitle", {
                    defaultValue: "الخطوات التالية",
                  })}
                </LocalizedText>
              </View>
              <LocalizedText style={styles.infoDesc}>
                {t("signupForm.vendor.pendingApproval.nextStepsDescription", {
                  defaultValue:
                    "سنقوم بإرسال رسالة بريد إلكتروني تحتوي على نتيجة مراجعة الطلب وتفاصيل تفعيل حسابك لتتمكن من تسجيل الدخول إلى لوحة التحكم.",
                })}
              </LocalizedText>
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              text={t("signupForm.vendor.pendingApproval.actions.marketplace", {
                defaultValue: "تصفح الخدمات",
              })}
              onPress={handleGoMarketplace}
              style={styles.primaryBtn}
            />

            <Button
              text={t("signupForm.vendor.pendingApproval.actions.home", {
                defaultValue: "العودة للرئيسية",
              })}
              onPress={handleGoHome}
              variant="outline"
              style={styles.secondaryBtn}
            />

            <Button
              text={t("signupForm.vendor.pendingApproval.actions.contactSupport", {
                defaultValue: "تواصل مع الدعم الفني",
              })}
              onPress={handleContactSupport}
              variant="ghost"
              style={styles.ghostBtn}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#faf8f5",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0e8df",
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#fdf5ec",
    borderWidth: 2,
    borderColor: "#ecd5be",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#fdf5ec",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ecd5be",
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#a46e38",
  },
  title: {
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
    color: "#1e1e1e",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 30,
  },
  description: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  idBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fcfaf8",
    borderWidth: 1,
    borderColor: "#d9c4b0",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: "100%",
    marginBottom: 20,
  },
  idLabel: {
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: "#777",
  },
  idValue: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#c28e5c",
    letterSpacing: 1,
  },
  infoSection: {
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: "#fdfbf9",
    borderWidth: 1,
    borderColor: "#f2ece4",
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoTitle: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#333",
  },
  infoDesc: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#777",
    lineHeight: 18,
  },
  actions: {
    width: "100%",
    gap: 10,
  },
  primaryBtn: {
    width: "100%",
  },
  secondaryBtn: {
    width: "100%",
  },
  ghostBtn: {
    width: "100%",
  },
});

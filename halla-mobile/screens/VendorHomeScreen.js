import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../components/plans";
import Services from "../components/vendor/home/Services";
import AddServicePopup from "../components/vendor/home/AddServicePopup";
import { useAuthStore } from "../stores/authStore";
import { useTranslation } from "../localization/hooks/useTranslation";
import { useVendorStats, useVendorServices } from "../hooks";
import {
  useDeleteVendorService,
  useToggleServiceStatus,
  useAddVendorService,
} from "../hooks/mutations/useVendorMutations";
import { useToast } from "../contexts/ToastContext";
import NotificationBell from "../components/notifications/NotificationBell";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
  "https://labbe-backend-production.up.railway.app";

const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  if (image.startsWith("/uploads")) return `${API_BASE}${image}`;
  return null;
};

const VendorHomeScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { t } = useTranslation("vendor");
  const toast = useToast();
  const [addPopupVisible, setAddPopupVisible] = useState(false);

  const vendorName = user?.roleData?.brandName || user?.name || t("defaultVendorName");

  const { data: statsData } = useVendorStats();
  const { data: services } = useVendorServices();

  const deleteServiceMutation = useDeleteVendorService();
  const toggleStatusMutation = useToggleServiceStatus();
  const addServiceMutation = useAddVendorService();

  const activeServices = statsData?.activeServices || 0;
  const totalServices = statsData?.totalServices || 0;
  const rating = statsData?.avgRating?.toFixed(1) || "0";

  const mappedServices = useMemo(() => {
    if (!services || !Array.isArray(services)) return [];
    return services.map((s) => ({
      id: s.id,
      name: s.name,
      imageUri: getImageUrl(s.image),
      guestCount: s.capacity || null,
      photoCount: s.imageCount || null,
      categories: s.tags || [],
      price: s.price?.toLocaleString() || "0",
      isAvailable: s.status === "active",
    }));
  }, [services]);

  const handleDeleteService = useCallback(
    (serviceId) => {
      Alert.alert("حذف الخدمة", "هل أنت متأكد من حذف هذه الخدمة؟", [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () => {
            deleteServiceMutation.mutate(serviceId, {
              onSuccess: () => toast.success("تم حذف الخدمة بنجاح"),
              onError: () => toast.error("فشل حذف الخدمة"),
            });
          },
        },
      ]);
    },
    [deleteServiceMutation, toast],
  );

  const handleToggleService = useCallback(
    (serviceId) => {
      toggleStatusMutation.mutate(serviceId, {
        onError: () => toast.error("فشل تغيير حالة الخدمة"),
      });
    },
    [toggleStatusMutation, toast],
  );

  const handleAddServiceSubmit = useCallback(
    (formData) => {
      const payload = {
        name: formData.serviceName,
        type: formData.serviceType,
        description: formData.description,
        price: formData.price,
        tags: formData.tags,
        image: formData.serviceImage,
      };
      addServiceMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("تم إضافة الخدمة بنجاح");
          setAddPopupVisible(false);
        },
        onError: () => toast.error("فشل إضافة الخدمة"),
      });
    },
    [addServiceMutation, toast],
  );

  const topBarActions = (
    <View style={styles.topBarActions}>
      <NotificationBell
        onPress={() => navigation.navigate("Notifications")}
        color="#F9F4EF"
        size={20}
      />
    </View>
  );

  const greetingContent = (
    <View style={styles.greetingContainer}>
      <Text style={styles.greetingText}>{t("greeting")}</Text>
      <Text style={styles.organizationName}>{vendorName}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#C28E5C" />
      <View style={styles.container}>
        <TopBar rightContent={topBarActions} leftContent={greetingContent} />

        {/* Header with stats cards */}
        <View style={styles.header}>
          <View style={styles.textureLeft}>
            <View style={styles.textureLine1} />
            <View style={styles.textureLine2} />
          </View>
          <View style={styles.textureRight}>
            <View style={styles.textureLine1} />
            <View style={styles.textureLine2} />
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{t("dashboard.title")}</Text>
            <Text style={styles.headerSubtitle}>
              {t("dashboard.subtitle", { count: totalServices })}
            </Text>
          </View>

          {/* Stats Cards */}
          <View style={styles.quickActions}>
            <View style={styles.quickActionButton}>
              <Text style={styles.statValue}>{activeServices}</Text>
              <Text style={styles.quickActionText}>خدمات نشطة</Text>
            </View>
            <View style={styles.quickActionButton}>
              <Text style={styles.statValue}>{totalServices}</Text>
              <Text style={styles.quickActionText}>إجمالي الخدمات</Text>
            </View>
            <View style={styles.quickActionButton}>
              <Text style={styles.statValue}>{rating}</Text>
              <Text style={styles.quickActionText}>التقييم</Text>
            </View>
          </View>
        </View>

        {/* Services List */}
        <Services
          services={mappedServices}
          onAddService={() => setAddPopupVisible(true)}
          onEditService={() => setAddPopupVisible(true)}
          onDeleteService={handleDeleteService}
          onToggleService={handleToggleService}
        />
      </View>

      <AddServicePopup
        visible={addPopupVisible}
        onClose={() => setAddPopupVisible(false)}
        onSubmit={handleAddServiceSubmit}
        isLoading={addServiceMutation.isPending}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#C28E5C",
  },
  container: {
    flex: 1,
    backgroundColor: "#F9F4EF",
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  greetingContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
  },
  greetingText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#FFF",
    lineHeight: 16,
    textAlign: "right",
  },
  organizationName: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
    lineHeight: 24,
    letterSpacing: 0.08,
    textAlign: "right",
  },
  header: {
    backgroundColor: "#C28E5C",
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    position: "relative",
    overflow: "hidden",
  },
  textureLeft: {
    position: "absolute",
    left: -190,
    top: -86,
    width: 460,
    height: 436,
    opacity: 0.08,
  },
  textureRight: {
    position: "absolute",
    right: -300,
    top: -86,
    width: 460,
    height: 436,
    opacity: 0.08,
  },
  textureLine1: {
    width: 470,
    height: 50,
    opacity: 0.1,
    position: "absolute",
    top: 34,
  },
  textureLine2: {
    width: 495,
    height: 50,
    opacity: 0.1,
    position: "absolute",
    left: 116,
    top: 0,
  },
  headerContent: {
    alignItems: "flex-end",
    zIndex: 1,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
    lineHeight: 36,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    textAlign: "center",
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
  },
});

export default VendorHomeScreen;

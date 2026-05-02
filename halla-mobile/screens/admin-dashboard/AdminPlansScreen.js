import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAdminPlans } from "../../hooks";
import { useUpdatePlan } from "../../hooks/mutations/useAdminMutations";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { useTranslation } from "../../localization";
import { isSuperAdmin } from "../../utils/adminPermissions";
import TopBar from "../../components/plans/TopBar";
import {
  PlanList,
  PlanTabs,
  EditPlanModal,
} from "../../components/admin-dashboard/plans";
import {
  colors,
  spacing,
  backgrounds,
} from "../../styles/tokens";

const SUBSCRIPTION_TYPES = ["subscription", "lite", "monthly", "pro", "elite"];

const AdminPlansScreen = () => {
  const toast = useToast();
  const { t } = useTranslation("admin");
  const role = useAuthStore((state) => state.role);
  const canEdit = isSuperAdmin(role);

  const [activeTab, setActiveTab] = useState("all");
  const [editModal, setEditModal] = useState({ visible: false, plan: null });

  const {
    data: plansData,
    isLoading,
    error,
    refetch,
  } = useAdminPlans();

  if (error) {
    toast.error(t("common.error"));
  }

  // Normalize: backend returns { status, data: { plans: [] } }
  const allPlans = useMemo(() => {
    const d = plansData?.data || plansData;
    return d?.plans || [];
  }, [plansData]);

  // Client-side filter matching web's filter tabs
  const currentPlans = useMemo(() => {
    if (activeTab === "all") return allPlans;
    if (activeTab === "subscription") {
      return allPlans.filter((p) => SUBSCRIPTION_TYPES.includes(p.planType));
    }
    return allPlans.filter((p) => p.planType === activeTab);
  }, [allPlans, activeTab]);

  const handleEdit = (plan) => {
    setEditModal({ visible: true, plan });
  };

  const handleEditSave = () => {
    setEditModal({ visible: false, plan: null });
    toast.success(t("common.success"));
    refetch();
  };

  const handleEditClose = () => {
    setEditModal({ visible: false, plan: null });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("plans.title")} showBack={true} />

        {/* Tab filter */}
        <PlanTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Plan list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listScrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={colors.primary[500]}
            />
          }
        >
          <PlanList
            plans={currentPlans}
            loading={isLoading}
            canEdit={canEdit}
            onEdit={handleEdit}
          />
        </ScrollView>
      </View>

      {/* Edit modal */}
      <EditPlanModal
        visible={editModal.visible}
        plan={editModal.plan}
        onClose={handleEditClose}
        onSave={handleEditSave}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: backgrounds.card[8],
  },
  container: {
    flex: 1,
    backgroundColor: backgrounds.artboard,
  },
  listScrollContent: {
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[32],
  },
});

export default AdminPlansScreen;

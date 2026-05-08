import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAdminPlans } from "../../../hooks";
import { useAuthStore } from "../../../stores/authStore";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { isSuperAdmin } from "../../../utils/adminPermissions";
import TopBar from "../../../components/plans/TopBar";
import {
  PlanList,
  PlanTabs,
  EditPlanModal,
} from "../../../components/admin-dashboard/plans";
import {
  colors,
  spacing,
  backgrounds,
} from "../../../styles/tokens";

// Match planType prefixes for the tabs:
//   "host_event"   → per-event host plans (basic_event, premium_event)
//   "host_monthly" → recurring host plans (basic_monthly, premium_monthly)
//   "business"     → whitelabel plans     (business_event, business_quarterly, business_annual)
//   "trial"        → exact match on planType === "trial" (handled below)
const TYPE_PREFIX_BY_TAB = {
  host_event: ["basic_event", "premium_event"],
  host_monthly: ["basic_monthly", "premium_monthly"],
  business: ["business_"],
};

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

  useEffect(() => {
    if (error) {
      toast.error(t("common.error"));
    }
  }, [error, toast, t]);

  const allPlans = useMemo(() => {
    const d = plansData?.data || plansData;
    return d?.plans || [];
  }, [plansData]);

  const currentPlans = useMemo(() => {
    if (activeTab === "all") return allPlans;
    const prefixes = TYPE_PREFIX_BY_TAB[activeTab];
    if (prefixes) {
      return allPlans.filter((p) => prefixes.some((pref) => p.planType?.startsWith(pref)));
    }
    return allPlans.filter((p) => p.planType === activeTab);
  }, [allPlans, activeTab]);

  const handleEdit = useCallback((plan) => {
    setEditModal({ visible: true, plan });
  }, []);

  // The modal owns the mutation (`useUpdatePlan` already invalidates
  // ['admin','plans'] on success, so we don't need to refetch here).
  // This handler just closes the sheet.
  const handleEditSave = useCallback(() => {
    setEditModal({ visible: false, plan: null });
  }, []);

  const handleEditClose = useCallback(() => {
    setEditModal({ visible: false, plan: null });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("plans.title")} showBack={true} />

        <PlanTabs activeTab={activeTab} onTabChange={setActiveTab} />

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

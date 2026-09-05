import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import KeyboardSafeModalSheet from "../../../components/commen/keyboard/KeyboardSafeModalSheet";
import TextInput from "../../../components/commen/DirectionalTextInput";
import DirectionalIonicon from "../../../components/common/DirectionalIonicon";
import {
  useAdminFulfillment,
  useAdminTransitionFulfillment,
} from "../../../hooks/addons";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation, useLanguage } from "../../../localization";
import TopBar from "../../../components/plans/TopBar";
import AdminPageHeader from "../../../components/admin-dashboard/common/AdminPageHeader";
import AdminFlatList from "../../../components/admin-dashboard/common/AdminFlatList";
import StatusBadge from "../../../components/admin-dashboard/common/StatusBadge";
import {
  DESIGN_FULFILLMENT_STATUS,
  DESIGN_TEMPLATE_TIERS,
  getNextFulfillmentStatus,
} from "@halaa/shared/constants/addons";
import { formatDateTime, formatCurrency } from "@halaa/shared/utils/locale";
import { colors, backgrounds, typography, spacing, borderRadius } from "../../../styles/tokens";

const FILTER_IDS = ["all", "paid", "queued", "in_progress", "fulfilled"];

const AdminCustomDesignsScreen = () => {
  const toast = useToast();
  const { t } = useTranslation("admin");
  const { currentLanguage } = useLanguage();
  const isAr = currentLanguage === "ar";
  const locale = isAr ? "ar" : "en";

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [customerNote, setCustomerNote] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const { data, isLoading, error, refetch } = useAdminFulfillment({ page: 1, limit: 100 });
  const transitionMutation = useAdminTransitionFulfillment();

  useEffect(() => {
    if (error) toast.error(t("messages.error"));
  }, [error, t, toast]);

  const rawItems = useMemo(() => data?.data || data?.items || [], [data]);

  const tierMap = useMemo(() => {
    const map = new Map();
    DESIGN_TEMPLATE_TIERS.forEach((tier) => {
      map.set(tier.type, isAr ? tier.nameAr : tier.nameEn);
    });
    return map;
  }, [isAr]);

  const filtered = useMemo(() => {
    let result = rawItems;
    if (activeFilter !== "all") {
      result = result.filter((item) => item.status === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const ref = (item.id || item._id || "").toLowerCase();
        const hostName = (item.userId?.name || item.user?.name || "").toLowerCase();
        const hostPhone = (item.userId?.phoneNumber || item.user?.phoneNumber || "").toLowerCase();
        return ref.includes(q) || hostName.includes(q) || hostPhone.includes(q);
      });
    }
    return result;
  }, [rawItems, activeFilter, searchQuery]);

  const filterOptions = useMemo(
    () =>
      FILTER_IDS.map((id) => ({
        id,
        label: t(`customDesigns.filters.${id}`, id),
        count: id === "all" ? rawItems.length : rawItems.filter((item) => item.status === id).length,
      })),
    [rawItems, t]
  );

  const openTransitionModal = (order) => {
    setSelectedOrder(order);
    setCustomerNote(order.fulfillment?.customerNote || "");
    setInternalNotes(order.fulfillment?.internalNotes || "");
  };

  const closeTransitionModal = () => {
    setSelectedOrder(null);
    setCustomerNote("");
    setInternalNotes("");
  };

  const handleConfirmTransition = async () => {
    if (!selectedOrder) return;
    const nextStatus = getNextFulfillmentStatus(selectedOrder.status);
    if (!nextStatus) return;

    try {
      await transitionMutation.mutateAsync({
        addonId: selectedOrder.id || selectedOrder._id,
        toStatus: nextStatus,
        customerNote: customerNote.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
      });
      toast.success(t("customDesigns.transitionSuccess", "تم تحديث حالة الطلب بنجاح"));
      closeTransitionModal();
      refetch();
    } catch (err) {
      toast.error(err?.message || t("customDesigns.transitionError", "تعذر تحديث حالة الطلب"));
    }
  };

  const renderItem = ({ item }) => {
    const orderId = item.id || item._id || "";
    const orderRef = orderId ? orderId.slice(-8).toUpperCase() : "";
    const hostName = item.userId?.name || item.user?.name || "-";
    const hostPhone = item.userId?.phoneNumber || item.user?.phoneNumber || "";
    const tierName = tierMap.get(item.templateType) || item.templateType || t("customDesigns.unknownTier", "تصميم مخصص");
    const nextStatus = getNextFulfillmentStatus(item.status);

    const nextActionLabels = {
      [DESIGN_FULFILLMENT_STATUS.QUEUED]: t("customDesigns.actions.moveToQueue", "نقل للانتظار"),
      [DESIGN_FULFILLMENT_STATUS.IN_PROGRESS]: t("customDesigns.actions.startWork", "بدء التنفيذ"),
      [DESIGN_FULFILLMENT_STATUS.FULFILLED]: t("customDesigns.actions.markFulfilled", "إكمال وتوصيل"),
    };

    return (
      <View style={styles.card} testID="custom-design-item-card">
        <View style={styles.cardHeader}>
          <View style={styles.cardRefWrap}>
            <Text style={styles.orderRef}>#{orderRef}</Text>
            <Text style={styles.tierName}>{tierName}</Text>
          </View>
          <StatusBadge status={item.status} size="small" />
        </View>

        <View style={styles.hostRow}>
          <Ionicons name="person-outline" size={16} color={colors.natural[600]} />
          <Text style={styles.hostName}>{hostName}</Text>
          {hostPhone ? <Text style={styles.hostPhone}>{hostPhone}</Text> : null}
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t("customDesigns.columns.price", "السعر")}:</Text>
          <Text style={styles.detailValue}>
            {formatCurrency(item.price, locale, item.currency || "SAR")}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t("customDesigns.columns.requestedAt", "تاريخ الطلب")}:</Text>
          <Text style={styles.detailValue}>
            {formatDateTime(item.fulfillment?.requestedAt || item.createdAt, locale)}
          </Text>
        </View>

        {item.fulfillment?.expectedDeliveryAt ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t("customDesigns.columns.expectedDelivery", "التسليم المتوقع")}:</Text>
            <Text style={[styles.detailValue, styles.deliveryHighlight]}>
              {formatDateTime(item.fulfillment.expectedDeliveryAt, locale)}
            </Text>
          </View>
        ) : null}

        {item.fulfillment?.customerNote ? (
          <View style={styles.noteBanner}>
            <Text style={styles.noteLabel}>{t("customDesigns.customerNoteLabel", "ملاحظة العميل")}:</Text>
            <Text style={styles.noteText}>{item.fulfillment.customerNote}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          {nextStatus ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openTransitionModal(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>
                {nextActionLabels[nextStatus] || nextStatus}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.completedText}>
              {t("customDesigns.status.fulfilled", "مكتمل")}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const nextStatusForModal = selectedOrder ? getNextFulfillmentStatus(selectedOrder.status) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("customDesigns.title", "تنفيذ التصاميم المخصصة")} showBack={true} />

        <AdminPageHeader
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t("customDesigns.searchPlaceholder", "البحث بالاسم أو رقم الطلب أو الجوال...")}
          filterOptions={filterOptions}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        <AdminFlatList
          data={filtered}
          keyExtractor={(item) => (item.id || item._id)?.toString()}
          renderItem={renderItem}
          loading={isLoading}
          onRefresh={refetch}
          emptyIcon="color-palette-outline"
          emptyTitle={t("customDesigns.empty.title", "لا توجد طلبات تصاميم")}
          emptyMessage={
            searchQuery || activeFilter !== "all"
              ? t("common.noSearchResults", "لا توجد نتائج مطابقة")
              : t("customDesigns.empty.message", "لم يتم تقديم أي طلبات تصاميم مخصصة بعد.")
          }
        />
      </View>

      {/* Transition Confirmation Modal */}
      <KeyboardSafeModalSheet
        visible={Boolean(selectedOrder)}
        onClose={closeTransitionModal}
        onRequestClose={closeTransitionModal}
        centered
        animationType="fade"
        dismissOnBackdropPress={false}
        contentContainerStyle={styles.modalBody}
        sheetStyle={styles.modalContent}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {t("customDesigns.modalTitle", "تحديث حالة التنفيذ")}
          </Text>
          <TouchableOpacity onPress={closeTransitionModal}>
            <Ionicons name="close" size={24} color={colors.natural[600]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalScroll}>
          {selectedOrder ? (
            <View style={styles.statusFlow}>
              <Text style={styles.flowStatus}>{selectedOrder.status}</Text>
              <DirectionalIonicon name="arrow-forward" size={16} color={colors.natural[500]} />
              <Text style={[styles.flowStatus, styles.flowNextStatus]}>
                {nextStatusForModal}
              </Text>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>
            {t("customDesigns.customerNoteLabel", "ملاحظة للعميل (تظهر في الجدول الزمني)")}
          </Text>
          <TextInput
            style={styles.textInput}
            value={customerNote}
            onChangeText={setCustomerNote}
            placeholder={t("customDesigns.customerNotePlaceholder", "أدخل ملاحظة إضافية للعميل...")}
            placeholderTextColor={colors.natural[400]}
            multiline={true}
            numberOfLines={3}
            maxLength={2000}
          />

          <Text style={styles.inputLabel}>
            {t("customDesigns.internalNotesLabel", "ملاحظات إدارية داخلية")}
          </Text>
          <TextInput
            style={styles.textInput}
            value={internalNotes}
            onChangeText={setInternalNotes}
            placeholder={t("customDesigns.internalNotesPlaceholder", "أدخل ملاحظات داخلية لفريق العمل...")}
            placeholderTextColor={colors.natural[400]}
            multiline={true}
            numberOfLines={2}
            maxLength={2000}
          />
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={closeTransitionModal}
            disabled={transitionMutation.isPending}
          >
            <Text style={styles.cancelBtnText}>{t("buttons.cancel", "إلغاء")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirmTransition}
            disabled={transitionMutation.isPending}
          >
            <Text style={styles.confirmBtnText}>
              {transitionMutation.isPending
                ? t("customDesigns.saving", "جاري الحفظ...")
                : t("customDesigns.confirmTransition", "تأكيد التحديث")}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModalSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  container: { flex: 1, backgroundColor: backgrounds.artboard },
  card: {
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[16],
    borderWidth: 1,
    borderColor: colors.natural[200],
    padding: spacing[16],
    marginHorizontal: spacing[16],
    marginVertical: spacing[8],
    gap: spacing[8],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  cardRefWrap: {
    flexDirection: "column",
    gap: 2,
  },
  orderRef: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    color: colors.secondary[900],
  },
  tierName: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.label.medium,
    color: colors.natural[600],
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    marginTop: spacing[4],
  },
  hostName: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[800],
  },
  hostPhone: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.small,
    color: colors.natural[500],
    marginStart: spacing[8],
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.medium,
    color: colors.natural[500],
  },
  detailValue: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[900],
  },
  deliveryHighlight: {
    color: colors.primary[600],
  },
  noteBanner: {
    backgroundColor: colors.natural[100],
    borderRadius: borderRadius[8],
    padding: spacing[8],
    marginTop: spacing[4],
  },
  noteLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.small,
    color: colors.secondary[700],
  },
  noteText: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.small,
    color: colors.natural[700],
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: spacing[8],
    paddingTop: spacing[8],
    borderTopWidth: 1,
    borderTopColor: colors.natural[150],
  },
  actionBtn: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius[8],
  },
  actionBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[50],
  },
  completedText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[400],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[20],
  },
  modalContent: {
    width: "100%",
    maxHeight: "80%",
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[20],
    padding: spacing[20],
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
  },
  modalTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.small,
    color: colors.secondary[900],
  },
  modalBody: {
    padding: spacing[16],
  },
  modalScroll: {
    marginVertical: spacing[12],
  },
  statusFlow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    backgroundColor: colors.natural[100],
    padding: spacing[10],
    borderRadius: borderRadius[8],
    marginBottom: spacing[12],
  },
  flowStatus: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[700],
  },
  flowNextStatus: {
    color: colors.primary[600],
    fontFamily: "Cairo_700Bold",
  },
  inputLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.medium,
    color: colors.secondary[800],
    marginTop: spacing[8],
    marginBottom: spacing[4],
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.natural[250],
    borderRadius: borderRadius[8],
    padding: spacing[10],
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[900],
    backgroundColor: colors.natural[50],
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing[10],
    paddingTop: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colors.natural[200],
  },
  cancelBtn: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius[8],
    borderWidth: 1,
    borderColor: colors.natural[300],
  },
  cancelBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[600],
  },
  confirmBtn: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius[8],
  },
  confirmBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[50],
  },
});

export default AdminCustomDesignsScreen;
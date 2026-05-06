import React, { useState, useMemo, useEffect } from "react";
import { View, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useAdminDiscounts,
  useDeleteDiscount,
  useToggleDiscount,
} from "../../../hooks";
import { useAuthStore } from "../../../stores/authStore";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import TopBar from "../../../components/plans/TopBar";
import AdminPageHeader from "../../../components/admin-dashboard/common/AdminPageHeader";
import AdminFlatList from "../../../components/admin-dashboard/common/AdminFlatList";
import { DiscountListItem, DiscountFormModal } from "../../../components/admin-dashboard/discounts";
import { backgrounds } from "../../../styles/tokens";

const FILTER_IDS = ["all", "active", "inactive"];

const AdminDiscountsScreen = () => {
  const toast = useToast();
  const { t } = useTranslation("admin");
  const role = useAuthStore((state) => state.user?.role);
  const canEdit   = canEditPage(role, PAGES.DISCOUNTS);
  const canDelete = canDeleteOnPage(role, PAGES.DISCOUNTS);

  const [searchQuery, setSearchQuery]     = useState("");
  const [activeFilter, setActiveFilter]   = useState("all");
  const [formModal, setFormModal]         = useState({ visible: false, discount: null });

  const { data, isLoading, error, refetch } = useAdminDiscounts({ page: 1, limit: 100 });
  const deleteDiscount = useDeleteDiscount();
  const toggleDiscount = useToggleDiscount();

  useEffect(() => {
    if (error) toast.error(t("common.error"));
  }, [error]);

  const rawDiscounts = useMemo(() => {
    const d = data?.data || data;
    return d?.discounts || [];
  }, [data]);

  const getStatus = (discount) => {
    if (discount.validUntil && new Date(discount.validUntil) < new Date())
      return "expired";
    if (discount.maxUses > 0 && discount.usedCount >= discount.maxUses)
      return "exhausted";
    return discount.isActive ? "active" : "inactive";
  };

  const filtered = useMemo(() => {
    let result = rawDiscounts;

    if (activeFilter === "active") {
      result = result.filter((d) => getStatus(d) === "active");
    } else if (activeFilter === "inactive") {
      result = result.filter((d) => getStatus(d) !== "active");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.code?.toLowerCase().includes(q) ||
          d.descriptionEn?.toLowerCase().includes(q) ||
          d.descriptionAr?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [rawDiscounts, activeFilter, searchQuery]);

  const filterOptions = useMemo(() =>
    FILTER_IDS.map((id) => ({
      id,
      label: t(`discounts.filters.${id}`),
      count: id === "all"
        ? rawDiscounts.length
        : id === "active"
          ? rawDiscounts.filter((d) => getStatus(d) === "active").length
          : rawDiscounts.filter((d) => getStatus(d) !== "active").length,
    })),
    [rawDiscounts, t],
  );

  const handleToggle = (discount) => {
    const isActivating = !discount.isActive;
    Alert.alert(
      isActivating ? t("discounts.actions.activate") : t("discounts.actions.deactivate"),
      `"${discount.code}"?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: isActivating ? t("discounts.actions.activate") : t("discounts.actions.deactivate"),
          onPress: async () => {
            try {
              await toggleDiscount.mutateAsync(discount.id);
              toast.success(t("discounts.success.toggled"));
              refetch();
            } catch {
              toast.error(t("discounts.errors.toggleFailed"));
            }
          },
        },
      ],
    );
  };

  const handleDelete = (discount) => {
    Alert.alert(
      t("discounts.delete.title"),
      `${t("discounts.delete.message")} "${discount.code}"? ${t("common.deleteConfirmMessage")}`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("discounts.actions.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDiscount.mutateAsync(discount.id);
              toast.success(t("discounts.success.deleted"));
              refetch();
            } catch {
              toast.error(t("discounts.errors.deleteFailed"));
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("discounts.title")} showBack={true} />

        <AdminPageHeader
          onAdd={canEdit ? () => setFormModal({ visible: true, discount: null }) : undefined}
          addLabel={t("discounts.addDiscount")}
          addIcon="add-outline"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t("discounts.searchPlaceholder")}
          filterOptions={filterOptions}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        <AdminFlatList
          data={filtered}
          keyExtractor={(item) => (item.id || item._id)?.toString()}
          renderItem={({ item }) => (
            <DiscountListItem
              discount={item}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={(d) => setFormModal({ visible: true, discount: d })}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          )}
          loading={isLoading}
          onRefresh={refetch}
          emptyIcon="pricetag-outline"
          emptyTitle={t("discounts.empty.title")}
          emptyMessage={
            searchQuery || activeFilter !== "all"
              ? t("common.noSearchResults")
              : t("discounts.empty.message")
          }
        />
      </View>

      <DiscountFormModal
        visible={formModal.visible}
        discount={formModal.discount}
        onClose={() => setFormModal({ visible: false, discount: null })}
        onSave={() => refetch()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  container: { flex: 1, backgroundColor: backgrounds.artboard },
});

export default AdminDiscountsScreen;

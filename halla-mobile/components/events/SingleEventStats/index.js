import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import StatsCards from "../StatsCards";
import TabsSearchAndFilters from "../TabsSearchAndFilters";
import EventActionsHeader from "../../home/EventActionsHeader";
import GuestsTab from "./GuestsTab";
import StaffTabContent, { useStaffTokens } from "./StaffTab";
import AddPopup from "./AddPopup";
import useEventStatsActions from "./useEventStatsActions";
import styles from "./styles";

const SingleEventStats = ({ event, stats, onBack, onRefresh }) => {
  const { t } = useTranslation("events");
  const [activeTab, setActiveTab] = useState("guests");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Optimistic flags for QR rotation / access revocation so the badge
  // shows immediately, before the next stats poll comes back. The flag
  // also disables the action until the next refresh confirms backend
  // state.
  const [guestActions, setGuestActions] = useState({});
  const [staffActions, setStaffActions] = useState({});

  const eventId = event?._id || event?.id;
  const { staffTokensByPhone, refreshStaffTokens } = useStaffTokens(
    eventId,
    activeTab === "staff"
  );

  const {
    popupLoading,
    exporting,
    handlePopupSave,
    handleGuestEdit,
    handleGuestDelete,
    handleGuestRotateQr,
    handleGuestRevokeAccess,
    handleModeratorEdit,
    handleModeratorDelete,
    handleModeratorRevoke,
    handleExportGuests,
  } = useEventStatsActions({
    event,
    t,
    onRefresh,
    refreshStaffTokens,
    setGuestActions,
    setStaffActions,
    setEditingItem,
    setShowPopup,
  });

  const guestStats = {
    confirmed: stats?.confirmed || 0,
    declined: stats?.declined || 0,
    maybe: stats?.maybe || 0,
    pending: stats?.noResponse || 0,
  };

  const handleAddPress = useCallback(() => {
    setEditingItem(null);
    setShowPopup(true);
  }, []);

  const handlePopupClose = useCallback(() => {
    setShowPopup(false);
    setEditingItem(null);
  }, []);

  const handlePopupSaveWrapped = useCallback(
    (data) => handlePopupSave({ activeTab, editingItem, data }),
    [handlePopupSave, activeTab, editingItem]
  );

  return (
    <View style={styles.container}>
      <View style={styles.actionsHeaderContainer}>
        <EventActionsHeader
          event={{
            id: eventId,
            testMessageSent: event.testMessageSent,
            whatsappTemplateStatus: event.whatsappTemplateStatus,
            launchSettings: event.launchSettings,
            staffCount: event.staffList?.length || 0,
          }}
          isAdmin={false}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statsCard}>
          <View style={styles.statsCardHeader}>
            <Text style={styles.statsCardTitle}>متابعة الحضور</Text>
          </View>
          <StatsCards stats={guestStats} />
        </View>
      </View>

      <View style={styles.listContainer}>
        <TabsSearchAndFilters
          onTabChange={setActiveTab}
          onSearchChange={setSearchQuery}
          onFilterPress={() => {}}
        />

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "guests" ? (
            <GuestsTab
              stats={stats}
              searchQuery={searchQuery}
              guestActions={guestActions}
              onEdit={handleGuestEdit}
              onDelete={handleGuestDelete}
              onRotateQr={handleGuestRotateQr}
              onRevokeAccess={handleGuestRevokeAccess}
              t={t}
            />
          ) : (
            <StaffTabContent
              stats={stats}
              searchQuery={searchQuery}
              staffActions={staffActions}
              staffTokensByPhone={staffTokensByPhone}
              onEdit={handleModeratorEdit}
              onDelete={handleModeratorDelete}
              onRevoke={handleModeratorRevoke}
            />
          )}
        </ScrollView>
      </View>

      {/* Guests-tab export FAB stacked above the add FAB. Both anchor to
          the same right-edge column. */}
      <View style={styles.fabColumn} pointerEvents="box-none">
        {activeTab === "guests" && (
          <TouchableOpacity
            style={styles.exportFab}
            onPress={handleExportGuests}
            disabled={exporting}
            activeOpacity={0.7}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="download-outline" size={22} color="#FFF" />
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.floatingButton}
          activeOpacity={0.7}
          onPress={handleAddPress}
        >
          <View style={styles.floatingButtonInner}>
            <Ionicons name="person-add-outline" size={30} color="#FFF" />
          </View>
        </TouchableOpacity>
      </View>

      <AddPopup
        visible={showPopup}
        onClose={handlePopupClose}
        onSave={handlePopupSaveWrapped}
        activeTab={activeTab}
        initialData={editingItem}
        loading={popupLoading}
      />
    </View>
  );
};

export default SingleEventStats;

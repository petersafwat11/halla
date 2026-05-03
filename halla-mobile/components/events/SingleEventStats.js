import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import {
  addGuest,
  updateGuest,
  deleteGuest,
  addStaff,
  updateStaff,
  deleteStaff,
  revokeStaffAccess,
  rotateGuestQr,
  revokeGuestAccess,
} from "../../services/eventsService2";
import StatsCards from "./StatsCards";
import TabsSearchAndFilters from "./TabsSearchAndFilters";
import GuestListItem from "./GuestListItem";
import ModeratorListItem from "./ModeratorListItem";
import AddGuestOrModeratorPopup from "./AddGuestOrmoderatorPopup";
import EventActionsHeader from "../home/EventActionsHeader";

const SingleEventStats = ({ event, stats, onBack, onRefresh }) => {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState("guests");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [popupLoading, setPopupLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Format response date to Arabic
  const formatResponseDate = (respondAt) => {
    if (!respondAt) return "لم يرد بعد";
    const date = new Date(respondAt);
    return date.toLocaleDateString("ar-SA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Format guests from backend data
  const guests = (stats?.guests || []).map((guest) => ({
    id: guest.guestId || guest._id || guest.id,
    name: guest.name || "ضيف",
    phone: guest.phone || "",
    email: guest.email || "",
    status: guest.status || "invited",
    responseDate: formatResponseDate(guest.respondAt || guest.respondedAt),
    addedBy: guest.addedBy || ""
  }));

  // Format staff from backend data
  const staff = (stats?.staff || []).map((s) => ({
    id: s._id || s.id || String(Math.random()),
    name: s.name || "مشرف",
    phone: s.phone || ""
  }));

  // Use stats from backend
  const guestStats = {
    confirmed: stats?.confirmed || 0,
    declined: stats?.declined || 0,
    maybe: stats?.maybe || 0,
    pending: stats?.noResponse || 0
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };

  const handleFilterPress = () => {
    // Handle filter button press
    console.log("Filter pressed");
  };

  const handleAddPress = () => {
    setEditingItem(null);
    setShowPopup(true);
  };

  const handlePopupClose = () => {
    setShowPopup(false);
    setEditingItem(null);
  };

  const handlePopupSave = async (data) => {
    try {
      setPopupLoading(true);

      if (activeTab === "guests") {
        if (editingItem) {
          await updateGuest(
            event._id || event.id,
            editingItem.id,
            data,
            token
          );
          Alert.alert("نجاح", "تم تعديل الضيف بنجاح");
        } else {
          // Add guest
          await addGuest(event._id || event.id, data, token);
          Alert.alert("نجاح", "تم إضافة الضيف بنجاح");
        }
      } else {
        if (editingItem) {
          // Edit moderator
          await updateStaff(
            event._id || event.id,
            editingItem.id,
            data,
            token
          );
          Alert.alert("نجاح", "تم تعديل المشرف بنجاح");
        } else {
          // Add moderator
          await addStaff(event._id || event.id, data, token);
          Alert.alert("نجاح", "تم إضافة المشرف بنجاح");
        }
      }

      setShowPopup(false);
      setEditingItem(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error saving:", error);
      Alert.alert("خطأ", error.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setPopupLoading(false);
    }
  };

  const handleGuestEdit = (guest) => {
    setEditingItem(guest);
    setShowPopup(true);
  };

  const handleGuestDelete = (guest) => {
    Alert.alert("تأكيد الحذف", "هل أنت متأكد من حذف هذا الضيف؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGuest(event._id || event.id, guest.id, token);
            Alert.alert("نجاح", "تم حذف الضيف بنجاح");
            if (onRefresh) onRefresh();
          } catch (error) {
            console.error("Error deleting guest:", error);
            Alert.alert("خطأ", error.message || "حدث خطأ أثناء الحذف");
          }
        }
      }
    ]);
  };

  const handleModeratorEdit = (moderator) => {
    setEditingItem(moderator);
    setShowPopup(true);
  };

  const handleModeratorDelete = async (moderator) => {
    try {
      await deleteStaff(event._id || event.id, moderator.id, token);
      Alert.alert("نجاح", "تم حذف المشرف بنجاح");
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error deleting moderator:", error);
      Alert.alert("خطأ", error.message || "حدث خطأ أثناء الحذف");
    }
  };

  // Phase 4 W2-STAFF — revoke a moderator's StaffAccessToken via the
  // Phase 3e.1 endpoint. The backend resolves the actual token from the
  // staff member's phone on the event roster.
  const handleModeratorRevoke = async (moderator) => {
    try {
      const result = await revokeStaffAccess(
        event._id || event.id,
        moderator.id,
        token
      );
      if (result?.wasAlreadyRevoked) {
        Alert.alert("المشرف", "تم إلغاء صلاحية هذا المشرف بالفعل.");
      } else {
        Alert.alert("نجاح", "تم إلغاء صلاحية وصول المشرف.");
      }
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error revoking moderator:", error);
      Alert.alert("خطأ", error.message || "حدث خطأ أثناء إلغاء الصلاحية");
    }
  };

  // Phase 4 W2-QR — rotate a guest's QR.
  const handleGuestRotateQr = async (guest) => {
    try {
      const result = await rotateGuestQr(event._id || event.id, guest.id, token);
      Alert.alert(
        "نجاح",
        result?.qrUrl
          ? "تم إنشاء رمز QR جديد. سيُرسل إلى الضيف عبر القناة المعتادة."
          : "تم تحديث رمز الدخول."
      );
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error rotating QR:", error);
      Alert.alert("خطأ", error.message || "تعذر تحديث رمز QR");
    }
  };

  // Phase 4 W2-GAT — revoke a guest's post-event access.
  const handleGuestRevokeAccess = async (guest) => {
    try {
      await revokeGuestAccess(event._id || event.id, guest.id, token);
      Alert.alert("نجاح", "تم إلغاء صلاحية الضيف لمحتوى ما بعد المناسبة.");
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error revoking guest access:", error);
      Alert.alert("خطأ", error.message || "تعذر إلغاء الصلاحية");
    }
  };

  // Apply search filtering
  const filteredGuests = guests.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return g.name.toLowerCase().includes(q) || g.phone.includes(q);
  });

  const filteredStaff = staff.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.phone.includes(q);
  });

  const currentData = activeTab === "guests" ? filteredGuests : filteredStaff;
  const ListItemComponent =
    activeTab === "guests" ? GuestListItem : ModeratorListItem;

  return (
    <View style={styles.container}>
      {/* Event Actions Header */}
      <View style={styles.actionsHeaderContainer}>
        <EventActionsHeader
          event={{
            id: event._id || event.id,
            testMessageSent: event.testMessageSent,
            whatsappTemplateStatus: event.whatsappTemplateStatus,
            launchSettings: event.launchSettings,
            staffCount: event.staffList?.length || 0,
          }}
          isAdmin={false}
        />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsCard}>
          <View style={styles.statsCardHeader}>
            <Text
              style={styles.statsCardTitle}
            >
              متابعة الحضور
            </Text>
          </View>
          <StatsCards stats={guestStats} />
        </View>
      </View>

      {/* Tabs, Search, and List */}
      <View style={styles.listContainer}>
        <TabsSearchAndFilters
          onTabChange={handleTabChange}
          onSearchChange={handleSearchChange}
          onFilterPress={handleFilterPress}
        />

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {currentData.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name={activeTab === "guests" ? "people-outline" : "person-add-outline"}
                size={40}
                color="#C8C8C8"
              />
              <Text style={styles.emptyStateText}>
                {activeTab === "guests" ? "لا يوجد مدعوين حالياً" : "لا يوجد مشرفين حالياً"}
              </Text>
            </View>
          ) : (
            currentData.map((item, index) => (
              <ListItemComponent
                key={item.id || index}
                {...(activeTab === "guests"
                  ? {
                      guest: item,
                      onEdit: handleGuestEdit,
                      onDelete: handleGuestDelete,
                      onRotateQr: handleGuestRotateQr,
                      onRevokeAccess: handleGuestRevokeAccess,
                    }
                  : {
                      moderator: item,
                      onEdit: handleModeratorEdit,
                      onDelete: handleModeratorDelete,
                      onRevoke: handleModeratorRevoke,
                    })}
                index={index}
              />
            ))
          )}
        </ScrollView>
      </View>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        activeOpacity={0.7}
        onPress={handleAddPress}
      >
        <View style={styles.floatingButtonInner}>
          <Ionicons name="person-add-outline" size={30} color="#FFF" />
        </View>
      </TouchableOpacity>

      {/* Add Guest/Moderator Popup */}
      <AddGuestOrModeratorPopup
        visible={showPopup}
        onClose={handlePopupClose}
        onSave={handlePopupSave}
        type={activeTab === "guests" ? "guest" : "moderator"}
        initialData={editingItem}
        loading={popupLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F4EF"
  },
  actionsHeaderContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#FFF",
  },
  header: {
    backgroundColor: "#C28E5C",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },backButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center"
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
    textAlign: "center",
    flex: 1
  },  actionButton: {
    justifyContent: "center",
    alignItems: "center"
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    lineHeight: 16
  },
  reminderButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center"
  },
  reminderButtonText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF"
  },
  statsContainer: {
    paddingVertical: 24,
    paddingHorizontal: 12
  },
  statsCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  statsCardHeader: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12
  },
  statsCardTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 24,
  },  listContainer: {
    flex: 1,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    marginHorizontal: 12
  },
  list: {
    flex: 1
  },
  listContent: {
    padding: 12
  },
  floatingButton: {
    position: "absolute",
    right: 24,
    bottom: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8
  },
  floatingButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 105,
    backgroundColor: "#C28E5C",
    justifyContent: "center",
    alignItems: "center"
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#9CA3AF",
    lineHeight: 20
  }
});

export default SingleEventStats;

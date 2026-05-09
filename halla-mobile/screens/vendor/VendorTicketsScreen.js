import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization/hooks/useTranslation";
import { useToast } from "../../contexts/ToastContext";
import { useTickets, useCreateTicket, useUpdateTicket, useDeleteTicket } from "../../hooks";
import TopBar from "../../components/plans/TopBar";
import Button from "../../components/commen/Button";
import DropdownInput from "../../components/commen/DropdownInput";
import TextAreaInput from "../../components/commen/TextAreaInput";

const STATUS_COLORS = {
  open: "#FFA500",
  in_progress: "#2196F3",
  waiting_response: "#9b59b6",
  resolved: "#4CAF50",
  closed: "#666666",
};

const PRIORITY_COLORS = {
  urgent: "#E74C3C",
  high: "#F44336",
  medium: "#FFA500",
  low: "#4CAF50",
};

const VendorTicketsScreen = ({ navigation }) => {
  const { t } = useTranslation("tickets");
  const toast = useToast();
  const { data: response, isLoading, error, refetch } = useTickets();
  const createMutation = useCreateTicket();
  const updateMutation = useUpdateTicket();
  const deleteMutation = useDeleteTicket();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [formData, setFormData] = useState({ subject: "", type: "other", message: "" });

  const tickets = useMemo(() => response?.data || [], [response]);

  const ticketTypes = useMemo(() => [
    { label: t("types.technical"), value: "technical" },
    { label: t("types.payment"), value: "payment" },
    { label: t("types.event"), value: "event" },
    { label: t("types.user"), value: "user" },
    { label: t("types.inquiry"), value: "inquiry" },
    { label: t("types.issue"), value: "issue" },
    { label: t("types.request"), value: "request" },
    { label: t("types.suggestion"), value: "suggestion" },
    { label: t("types.other"), value: "other" },
  ], [t]);

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleCreateTicket = useCallback(() => {
    setEditingTicket(null);
    setFormData({ subject: "", type: "other", message: "" });
    setModalVisible(true);
  }, []);

  const handleEditTicket = useCallback((ticket) => {
    if (ticket.status !== "open") return;
    setEditingTicket(ticket);
    setFormData({ subject: ticket.subject || "", type: ticket.type, message: ticket.message });
    setModalVisible(true);
  }, []);

  const handleDeleteTicket = useCallback(async (ticketId) => {
    try {
      await deleteMutation.mutateAsync(ticketId);
      toast.success(t("messages.deleteSuccess"));
    } catch {
      toast.error(t("messages.deleteError"));
    }
  }, [deleteMutation, toast, t]);

  const handleSubmitTicket = useCallback(async () => {
    if (!formData.subject?.trim()) {
      toast.error(t("validation.ticketSubjectRequired"));
      return;
    }
    if (!formData.message?.trim() || formData.message.trim().length < 10) {
      toast.error(t("validation.ticketMessageMin"));
      return;
    }

    try {
      if (editingTicket) {
        await updateMutation.mutateAsync({ ticketId: editingTicket.id, data: formData });
        toast.success(t("messages.updateSuccess"));
      } else {
        await createMutation.mutateAsync(formData);
        toast.success(t("messages.createSuccess"));
      }
      setModalVisible(false);
    } catch {
      toast.error(editingTicket ? t("messages.updateError") : t("messages.createError"));
    }
  }, [formData, editingTicket, createMutation, updateMutation, toast, t]);

  const renderTicketItem = useCallback(({ item }) => (
    <TouchableOpacity style={styles.ticketCard} onPress={() => handleEditTicket(item)}>
      <View style={styles.ticketHeader}>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] || "#999999" }]}>
          <Text style={styles.statusText}>{t(`status.${item.status}`)}</Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[item.priority] || "#999999" }]}>
          <Text style={styles.priorityText}>{t(`priority.${item.priority}`)}</Text>
        </View>
      </View>
      <Text style={styles.ticketType}>{t(`types.${item.type}`)}</Text>
      <Text style={styles.ticketMessage} numberOfLines={2}>{item.message}</Text>
      <View style={styles.ticketFooter}>
        <Text style={styles.ticketDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        <TouchableOpacity onPress={() => handleDeleteTicket(item.id || item._id)}>
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  ), [handleEditTicket, handleDeleteTicket, t]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container}>
          <TopBar title={t("title")} showBack={true} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#C28E5C" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container}>
          <TopBar title={t("title")} showBack={true} />
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#E5E7EA" />
            <Text style={styles.errorText}>{t("messages.loadError")}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("title")} showBack={true} />
        <FlatList
          data={tickets}
          renderItem={renderTicketItem}
          keyExtractor={(item) => (item._id || item.id)?.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#C28E5C" />
              <Text style={styles.emptyText}>{t("emptyState")}</Text>
            </View>
          }
        />
        <TouchableOpacity style={styles.fab} onPress={handleCreateTicket}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>

        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingTicket ? t("form.editTitle") : t("form.title")}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#2C2C2C" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                <TextAreaInput
                  label={t("form.subjectLabel")}
                  value={formData.subject}
                  onChangeText={(text) => setFormData({ ...formData, subject: text })}
                  placeholder={t("form.subjectPlaceholder")}
                  minHeight={60}
                />
                <DropdownInput
                  label={t("form.typeLabel")}
                  value={formData.type}
                  options={ticketTypes}
                  onSelect={(value) => setFormData({ ...formData, type: value })}
                />
                <TextAreaInput
                  label={t("form.messageLabel")}
                  value={formData.message}
                  onChangeText={(text) => setFormData({ ...formData, message: text })}
                  placeholder={t("form.messagePlaceholder")}
                  minHeight={120}
                />
              </ScrollView>
              <View style={styles.modalFooter}>
                <Button
                  title={editingTicket ? t("form.update") : t("form.create")}
                  onPress={handleSubmitTicket}
                  loading={createMutation.isPending || updateMutation.isPending}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#C28E5C" },
  container: { flex: 1, backgroundColor: "#F9F4EF" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    color: "#656565",
    marginTop: 12,
  },
  listContent: { padding: 16 },
  ticketCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  ticketHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontFamily: "Cairo_600SemiBold", fontSize: 11, color: "#FFF" },
  priorityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  priorityText: { fontFamily: "Cairo_600SemiBold", fontSize: 11, color: "#FFF" },
  ticketType: { fontFamily: "Cairo_700Bold", fontSize: 14, color: "#C28E5C", marginBottom: 4 },
  ticketMessage: { fontFamily: "Cairo_400Regular", fontSize: 13, color: "#656565", marginBottom: 8 },
  ticketFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ticketDate: { fontFamily: "Cairo_400Regular", fontSize: 11, color: "#999" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  emptyText: { fontFamily: "Cairo_600SemiBold", fontSize: 14, color: "#656565", marginTop: 16 },
  fab: { position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: "#C28E5C", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%", paddingBottom: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#E5E7EA" },
  modalTitle: { fontFamily: "Cairo_700Bold", fontSize: 18, color: "#2C2C2C" },
  modalBody: { padding: 20 },
  modalFooter: { paddingHorizontal: 20, paddingTop: 10 },
});

export default VendorTicketsScreen;

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useLanguage, useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { TicketCard, TicketModal, TicketRatingModal } from "../../components/tickets";
import {
  useTickets,
  useCreateTicket,
  useUpdateTicket,
  useDeleteTicket
} from "../../hooks";
import { TopBar } from "../../components/plans";

export default function TicketsScreen() {
  const { t } = useTranslation("tickets");
  const toast = useToast();
  const { token } = useAuthStore();
  const navigation = useNavigation();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingTicket, setRatingTicket] = useState(null);

  const fabScale = React.useRef(new Animated.Value(0)).current;

  // Fetch tickets using React Query
  const { data: response, isLoading: loading, error, refetch } = useTickets();
  const tickets = response?.data || [];

  // Mutations
  const createTicketMutation = useCreateTicket();
  const updateTicketMutation = useUpdateTicket();
  const deleteTicketMutation = useDeleteTicket();

  useEffect(() => {
    // Animate FAB button
    Animated.spring(fabScale, {
      toValue: 1,
      delay: 300,
      tension: 50,
      friction: 7,
      useNativeDriver: true
    }).start();
  }, []);

  // Show error toast if query fails
  useEffect(() => {
    if (error) {
      toast.error(t("messages.fetchError"));
    }
  }, [error, t]);

  const handleCreateTicket = async (data) => {
    try {
      await createTicketMutation.mutateAsync(data);
      toast.success(t("messages.createSuccess"));
      setModalVisible(false);
    } catch (error) {
      toast.error(error.message || t("messages.saveError"));
    }
  };

  const handleUpdateTicket = async (data) => {
    try {
      await updateTicketMutation.mutateAsync({
        ticketId: editingTicket.id,
        data
      });
      toast.success(t("messages.updateSuccess"));
      setModalVisible(false);
      setEditingTicket(null);
    } catch (error) {
      toast.error(error.message || t("messages.saveError"));
    }
  };

  const handleDeleteTicket = (ticketId) => {
    Alert.alert(
      t("actions.deleteConfirm"),
      "",
      [
        {
          text: t("popup.cancel"),
          style: "cancel"
        },
        {
          text: t("actions.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTicketMutation.mutateAsync(ticketId);
              toast.success(t("messages.deleteSuccess"));
            } catch (error) {
              toast.error(error.message || t("messages.deleteError"));
            }
          }
        }],
      { cancelable: true }
    );
  };

  const handleEditTicket = (ticket) => {
    setEditingTicket(ticket);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingTicket(null);
  };

  const handleRateTicket = (ticket) => {
    setRatingTicket(ticket);
    setRatingModalVisible(true);
  };

  const handleCloseRatingModal = () => {
    setRatingModalVisible(false);
    setRatingTicket(null);
  };

  const handleBack = () => {
    if (navigation?.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleSubmit = (data) => {
    if (editingTicket) {
      handleUpdateTicket(data);
    } else {
      handleCreateTicket(data);
    }
  };

  const renderTicket = ({ item, index }) => (
    <TicketCard
      ticket={item}
      onDelete={handleDeleteTicket}
      onEdit={handleEditTicket}
      onRate={handleRateTicket}
      index={index}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="ticket-outline" size={80} color="#e0e0e0" />
      <Text style={styles.emptyTitle}>
        {t("noTickets.title")}
      </Text>
      <Text
        style={styles.emptyDescription}
      >
        {t("noTickets.message")}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container}>
          <TopBar
            title={t("pageTitle")}
            showBack={navigation?.canGoBack?.()}
            onBack={handleBack}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#c28e5c" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar
          title={t("pageTitle")}
          showBack={navigation?.canGoBack?.()}
          onBack={handleBack}
        />

        <FlatList
          data={tickets}
          renderItem={renderTicket}
          keyExtractor={(item) => (item._id || item.id)?.toString()}
          contentContainerStyle={[
            styles.listContent,
            tickets.length === 0 && styles.listContentEmpty]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor="#c28e5c"
              colors={["#c28e5c"]}
            />
          }
        />

        <Animated.View
          style={[
            styles.fabContainer,
            { transform: [{ scale: fabScale }] }]}
        >
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        <TicketModal
          visible={modalVisible}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
          initialData={
            editingTicket
              ? { subject: editingTicket.subject, type: editingTicket.type, message: editingTicket.message }
              : null
          }
          loading={createTicketMutation.isPending || updateTicketMutation.isPending}
        />

        <TicketRatingModal
          visible={ratingModalVisible}
          onClose={handleCloseRatingModal}
          ticket={ratingTicket}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#C28E5C"
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  listContent: {
    padding: 16,
    paddingBottom: 100
  },
  listContentEmpty: {
    flexGrow: 1
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    marginTop: 16,
    marginBottom: 8
  },
  emptyDescription: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 22
  },
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 24
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#c28e5c",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  }
});

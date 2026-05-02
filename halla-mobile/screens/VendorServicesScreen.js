import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import Services from "../components/vendor/home/Services";
import AddServicePopup from "../components/vendor/home/AddServicePopup";
import { useVendorServices } from "../hooks";
import {
  useDeleteVendorService,
  useToggleServiceStatus,
  useAddVendorService,
  useUpdateVendorService,
} from "../hooks/mutations/useVendorMutations";
import { useToast } from "../contexts/ToastContext";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
  "https://labbe-backend-production.up.railway.app";

const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  if (image.startsWith("/uploads")) return `${API_BASE}${image}`;
  return null;
};

const VendorServicesScreen = ({ navigation }) => {
  const { t } = useTranslation("vendor");
  const toast = useToast();
  const [addPopupVisible, setAddPopupVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const {
    data: services,
    isLoading,
    refetch,
  } = useVendorServices();

  const deleteServiceMutation = useDeleteVendorService();
  const toggleStatusMutation = useToggleServiceStatus();
  const addServiceMutation = useAddVendorService();
  const updateServiceMutation = useUpdateVendorService();

  // Map backend response to ServiceCard props (includes raw fields for edit pre-fill)
  const mappedServices = useMemo(() => {
    if (!services || !Array.isArray(services)) return [];
    return services.map((s) => ({
      id: s.id,
      name: s.name,
      imageUri: getImageUrl(s.image),
      categories: s.tags || [],
      price: s.price?.toLocaleString() || "0",
      isAvailable: s.status === "active",
      rating: s.rating || 0,
      category: s.category,
      // Raw fields for edit pre-fill
      _raw: {
        description: s.description || "",
        serviceType: s.category || "",
        price: s.price != null ? String(s.price) : "",
        tags: s.tags || [],
        image: s.image,
      },
    }));
  }, [services]);

  const handleDeleteService = useCallback(
    (serviceId) => {
      Alert.alert(
        t("services.deleteConfirm"),
        t("services.deleteConfirmMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: () => {
              deleteServiceMutation.mutate(serviceId, {
                onSuccess: () => toast.success(t("services.deleteSuccess")),
                onError: () => toast.error(t("services.deleteError")),
              });
            },
          },
        ],
      );
    },
    [deleteServiceMutation, toast, t],
  );

  const handleToggleService = useCallback(
    (serviceId) => {
      toggleStatusMutation.mutate(serviceId, {
        onSuccess: () => toast.success(t("services.toggleSuccess")),
        onError: () => toast.error(t("services.toggleError")),
      });
    },
    [toggleStatusMutation, toast, t],
  );

  const handleEditService = useCallback(
    (service) => {
      setEditingService(service);
      setAddPopupVisible(true);
    },
    [],
  );

  const handleAddService = useCallback(() => {
    setEditingService(null);
    setAddPopupVisible(true);
  }, []);

  const handleAddServiceSubmit = useCallback(
    (formData) => {
      const payload = {
        name: formData.serviceName,
        type: formData.serviceType,
        description: formData.description,
        price: formData.price,
        image: formData.serviceImage,
        tags: formData.tags,
      };

      if (editingService) {
        // Update existing service
        updateServiceMutation.mutate(
          { serviceId: editingService.id, data: payload },
          {
            onSuccess: () => {
              toast.success(t("services.updateSuccess"));
              setAddPopupVisible(false);
              setEditingService(null);
            },
            onError: () => toast.error(t("services.updateError")),
          },
        );
      } else {
        // Create new service
        addServiceMutation.mutate(payload, {
          onSuccess: () => {
            toast.success(t("services.addSuccess"));
            setAddPopupVisible(false);
          },
          onError: () => toast.error(t("services.addError")),
        });
      }
    },
    [addServiceMutation, updateServiceMutation, editingService, toast, t],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.container}>
        <Services
          services={mappedServices}
          onAddService={handleAddService}
          onEditService={handleEditService}
          onDeleteService={handleDeleteService}
          onToggleService={handleToggleService}
        />
      </View>

      <AddServicePopup
        visible={addPopupVisible}
        onClose={() => {
          setAddPopupVisible(false);
          setEditingService(null);
        }}
        onSubmit={handleAddServiceSubmit}
        isLoading={addServiceMutation.isPending || updateServiceMutation.isPending}
        editingService={editingService}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F9F4EF",
  },
});

export default VendorServicesScreen;

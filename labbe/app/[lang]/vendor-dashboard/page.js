"use client";
import React, { useState, useMemo, useCallback } from "react";
import styles from "./page.module.css";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { useRouter } from "next/navigation";
import UseLanguageChange from "@/hooks/UseLanguageChange";

import VendorStatsCards from "@/ui/vendor/statsCards/VendorStatsCards";
import ServiceCard from "@/ui/vendor/serviceCard/ServiceCard";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import AddServicePopup from "@/ui/vendor/addServicePopup/AddServicePopup";
import DeleteConfirmation from "@/ui/vendor/modals/DeleteConfirmation";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

import {
  useMyServices,
  useServiceStats,
  useServiceMutation,
  vendorServicesKeys,
} from "@/hooks/vendorServices";
import { useQueryClient } from "@tanstack/react-query";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";

const VendorServicesPage = () => {
  const { t } = useTranslation("vendorServices");
  const router = useRouter();
  const { currentLocale } = UseLanguageChange();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const {
    data: servicesData,
    isLoading: servicesLoading,
    error: servicesError,
  } = useMyServices();
  const { data: statsData, isLoading: statsLoading } = useServiceStats();
  const toggleStatusMutation = useServiceMutation("toggleStatus");
  const deleteServiceMutation = useServiceMutation("deleteService");

  const stats = useMemo(() => {
    const data = statsData?.data?.stats;
    if (!data) {
      return { rating: "0", inactiveServices: 0, activeServices: 0, totalServices: 0 };
    }
    return {
      rating: data.avgRating?.toFixed(1) || "0",
      inactiveServices: (data.totalServices || 0) - (data.activeServices || 0),
      activeServices: data.activeServices || 0,
      totalServices: data.totalServices || 0,
    };
  }, [statsData]);

  const services = useMemo(() => {
    const list = servicesData?.data;
    if (!Array.isArray(list)) return [];
    return list.map((service) => ({
      id: service.id,
      title: service.name,
      tags: service.tags || [],
      isAvailable: service.status === "active",
      price: service.price,
      image: service.image || "/images/placeholder-service.jpg",
      rating: service.rating || 0,
      category: service.category,
      _raw: {
        description: service.description || "",
        serviceType: service.category || "",
        price: service.price != null ? String(service.price) : "",
        duration: service.duration || "",
        included: service.included || [],
        tags: service.tags || [],
        image: service.image,
      },
    }));
  }, [servicesData]);

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const query = searchQuery.toLowerCase();
    return services.filter(
      (service) =>
        service.title.toLowerCase().includes(query) ||
        service.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [services, searchQuery]);

  const handleToggleStatus = useCallback(
    async (serviceId) => {
      try {
        await toggleStatusMutation.mutateAsync(serviceId);
        toastUtils.success(t("success.updated"));
      } catch (error) {
        handleError(error, t, { fallbackMessage: "errors.update_failed" });
      }
    },
    [toggleStatusMutation, t]
  );

  const handleRequestDelete = useCallback((serviceId) => {
    setPendingDeleteId(serviceId);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteServiceMutation.mutateAsync(pendingDeleteId);
      toastUtils.success(t("success.deleted"));
    } catch (error) {
      handleError(error, t, { fallbackMessage: "errors.delete_failed" });
    } finally {
      setPendingDeleteId(null);
    }
  }, [deleteServiceMutation, pendingDeleteId, t]);

  const handleAddService = useCallback(() => {
    setEditingService(null);
    setIsPopupOpen(true);
  }, []);

  const handleEditService = useCallback((service) => {
    setEditingService(service);
    setIsPopupOpen(true);
  }, []);

  const handlePopupClose = useCallback(() => {
    setIsPopupOpen(false);
    setEditingService(null);
  }, []);

  const handlePopupSuccess = useCallback(() => {
    setIsPopupOpen(false);
    setEditingService(null);
    queryClient.invalidateQueries({ queryKey: vendorServicesKeys.all });
  }, [queryClient]);

  const handleComplaints = () => {
    router.push(`/${currentLocale}/vendor-dashboard/tickets`);
  };

  if (servicesLoading || statsLoading) {
    return <SimpleLoading />;
  }

  if (servicesError) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{t("errors.loadFailed")}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackMessage={t("errors.boundary")}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerRight}>
              <h1 className={styles.pageTitle}>{t("pageTitle")}</h1>
            </div>

            <div className={styles.headerLeft}>
              <button className={styles.primaryButton} onClick={handleAddService}>
                <span>{t("buttons.addService")}</span>
                <Image src={"/svg/vendor/add.svg"} width={16} height={16} alt="add" />
              </button>
              <button className={styles.secondaryButton} onClick={handleComplaints}>
                <span>{t("buttons.complaints")}</span>
                <Image src={"/svg/vendor/tickets.svg"} width={16} height={16} alt="ticket" />
              </button>
            </div>
          </div>
        </div>

        <VendorStatsCards stats={stats} />

        <div className={styles.filtersSection}>
          <div className={styles.filtersSectionContent}>
            <div className={styles.filtersRight}>
              <h2 className={styles.filtersTitle}>{t("filters.allServices")}</h2>
            </div>

            <div className={styles.filtersLeft}>
              <div className={styles.searchBox}>
                <input
                  type="text"
                  placeholder={t("search.placeholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
                <Image src="/svg/vendor/Search.svg" alt="Search" width={14} height={14} />
              </div>

              <button className={styles.moreButton}>
                <Image src="/svg/vendor/more.svg" alt="More" width={24} height={24} />
              </button>
            </div>
          </div>
        </div>

        <div className={styles.servicesGrid}>
          {filteredServices.length > 0 ? (
            filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onToggleStatus={handleToggleStatus}
                onDelete={handleRequestDelete}
                onEdit={handleEditService}
              />
            ))
          ) : (
            <div className={styles.noServices}>
              {searchQuery ? t("noSearchResults") : t("noServices")}
            </div>
          )}
        </div>

        <PopupLayout isOpen={isPopupOpen} onClose={handlePopupClose} size="auto">
          <AddServicePopup
            onClose={handlePopupClose}
            onSuccess={handlePopupSuccess}
            editingService={editingService}
          />
        </PopupLayout>

        <DeleteConfirmation
          isOpen={!!pendingDeleteId}
          onClose={() => setPendingDeleteId(null)}
          onConfirm={handleConfirmDelete}
          title={t("confirmDelete.title")}
          message={t("confirmDelete.message")}
          confirmText={t("confirmDelete.confirm")}
          cancelText={t("confirmDelete.cancel")}
          isLoading={deleteServiceMutation.isPending}
        />
      </div>
    </ErrorBoundary>
  );
};

export default VendorServicesPage;

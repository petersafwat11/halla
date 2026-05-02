"use client";
import React, { useState, useMemo } from "react";
import styles from "./page.module.css";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { useRouter } from "next/navigation";
import UseLanguageChange from "@/hooks/UseLanguageChange";

// UI Components
import VendorStatsCards from "@/ui/vendor/statsCards/VendorStatsCards";
import ServiceCard from "@/ui/vendor/serviceCard/ServiceCard";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import AddServicePopup from "@/ui/vendor/addServicePopup/AddServicePopup";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

// Hooks
import { useMyServices, useServiceStats, useServiceMutation } from "@/hooks/reactQueryHooks/useServices";
import { useQueryClient } from "@tanstack/react-query";

const VendorServicesPage = () => {
  const { t } = useTranslation("vendorServices");
  const router = useRouter();
  const { currentLocale } = UseLanguageChange();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddServicePopupOpen, setIsAddServicePopupOpen] = useState(false);

  // React Query hooks
  const { data: servicesData, isLoading: servicesLoading, error: servicesError } = useMyServices();
  const { data: statsData, isLoading: statsLoading } = useServiceStats();
  const toggleStatusMutation = useServiceMutation("toggleStatus");
  const deleteServiceMutation = useServiceMutation("deleteService");

  // Memoized stats
  const stats = useMemo(() => {
    const data = statsData?.data?.stats;
    if (!data) {
      return {
        rating: "0",
        inactiveServices: 0,
        activeServices: 0,
        totalServices: 0,
      };
    }
    return {
      rating: data.avgRating?.toFixed(1) || "0",
      inactiveServices: (data.totalServices || 0) - (data.activeServices || 0),
      activeServices: data.activeServices || 0,
      totalServices: data.totalServices || 0,
    };
  }, [statsData]);

  // Memoized services with mapping
  const services = useMemo(() => {
    if (!servicesData?.data) return [];
    return servicesData.data.map((service) => ({
      id: service.id,
      title: service.name,
      tags: service.tags || [],
      isAvailable: service.status === "active",
      price: service.price,
      image: service.image || "/images/placeholder-service.jpg",
      rating: service.rating || 0,
      category: service.category,
    }));
  }, [servicesData]);

  // Filtered services based on search
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const query = searchQuery.toLowerCase();
    return services.filter((service) =>
      service.title.toLowerCase().includes(query) ||
      service.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [services, searchQuery]);

  // Handlers
  const handleToggleStatus = async (serviceId) => {
    try {
      await toggleStatusMutation.mutateAsync(serviceId);
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleDeleteService = async (serviceId) => {
    const confirmed = window.confirm(
      t("confirmDelete", "Are you sure you want to delete this service?")
    );
    if (!confirmed) return;
    try {
      await deleteServiceMutation.mutateAsync(serviceId);
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  };

  const handleAddService = () => {
    setIsAddServicePopupOpen(true);
  };

  const handleAddServiceSuccess = () => {
    setIsAddServicePopupOpen(false);
    queryClient.invalidateQueries({ queryKey: ["vendor-services"] });
  };

  const handleComplaints = () => {
    router.push(`/${currentLocale}/vendor-dashboard/tickets`);
  };

  const handlePromoteProfile = () => {
    // Placeholder for future implementation
    console.log("Promote profile - coming soon");
  };

  // Loading state
  if (servicesLoading || statsLoading) {
    return <SimpleLoading />;
  }

  // Error state
  if (servicesError) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{t("errors.loadFailed", "Failed to load services")}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackMessage={t("errors.boundary", "Failed to load vendor dashboard")}>
      <div className={styles.container}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerRight}>
              <h1 className={styles.pageTitle}>{t("pageTitle")}</h1>
              <p className={styles.pageSubtitle}>{t("pageSubtitle")}</p>
            </div>

            <div className={styles.headerLeft}>
              <button className={styles.primaryButton} onClick={handleAddService}>
                <span>{t("buttons.addService")}</span>
                <Image
                  src={"/svg/vendor/add.svg"}
                  width={16}
                  height={16}
                  alt="add"
                />
              </button>
              <button
                className={styles.secondaryButton}
                onClick={handleComplaints}
              >
                <span>{t("buttons.complaints")}</span>
                <Image
                  src={"/svg/vendor/tickets.svg"}
                  width={16}
                  height={16}
                  alt="ticket"
                />
              </button>
              <button
                className={styles.secondaryButton}
                onClick={handlePromoteProfile}
              >
                <span>{t("buttons.promoteProfile")}</span>
                <Image
                  src={"/svg/vendor/ads.svg"}
                  width={16}
                  height={16}
                  alt="advertise"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <VendorStatsCards stats={stats} />

        {/* Filters and Search Section */}
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
                <Image
                  src="/svg/vendor/Search.svg"
                  alt="Search"
                  width={14}
                  height={14}
                />
              </div>

              <button className={styles.moreButton}>
                <Image
                  src="/svg/vendor/more.svg"
                  alt="More"
                  width={24}
                  height={24}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className={styles.servicesGrid}>
          {filteredServices.length > 0 ? (
            filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDeleteService}
              />
            ))
          ) : (
            <div className={styles.noServices}>
              {searchQuery
                ? t("noSearchResults", "No services match your search")
                : t("noServices", "No services available")}
            </div>
          )}
        </div>

        {/* Add Service Popup */}
        <PopupLayout
          isOpen={isAddServicePopupOpen}
          onClose={() => setIsAddServicePopupOpen(false)}
          size="auto"
        >
          <AddServicePopup
            onClose={() => setIsAddServicePopupOpen(false)}
            onSuccess={handleAddServiceSuccess}
          />
        </PopupLayout>
      </div>
    </ErrorBoundary>
  );
};

export default VendorServicesPage;

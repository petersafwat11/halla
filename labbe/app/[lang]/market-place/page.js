"use client";
import React, { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePublicVendorServices } from "@/hooks/vendorServices";
import { getImageUrl } from "@/utils/vendorHelpers";
import styles from "./page.module.css";
import ServiceCard from "./_components/card/Card";
import Pagination from "./_components/pagination/Pagination";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import VendorInfoPopup from "./_components/vendorInfoPopup/VendorInfoPopup";

const ITEMS_PER_PAGE = 12;

const MarketPlacePage = () => {
  const { t } = useTranslation("marketplace");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const { data: servicesData, isLoading } = usePublicVendorServices({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const vendors = useMemo(() => {
    const data = servicesData?.data || [];
    return Array.isArray(data) ? data : [];
  }, [servicesData]);

  const totalItems = servicesData?.pagination?.total ?? vendors.length;
  const totalPages =
    servicesData?.pagination?.pages ?? Math.ceil(totalItems / ITEMS_PER_PAGE);

  const handleOpenVendorInfo = useCallback((vendor) => {
    setSelectedVendor(vendor);
  }, []);

  const handleCloseVendorInfo = useCallback(() => {
    setSelectedVendor(null);
  }, []);

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>{t("hero.eyebrow")}</span>
          <h1 className={styles.heroTitle}>{t("hero.title")}</h1>
          <p className={styles.heroSubtitle}>{t("hero.subtitle")}</p>
        </div>
      </section>

      <section className={styles.gridSection}>
        {isLoading ? (
          <div className={styles.loadingWrapper}>
            <SimpleLoading />
          </div>
        ) : vendors.length > 0 ? (
          <>
            <div className={styles.servicesGrid}>
              {vendors.map((service) => {
                const location = service.serviceLocation?.regionNameAr
                  ? `${service.serviceLocation.cityNameAr || ""}, ${service.serviceLocation.regionNameAr}`
                  : "";
                const image =
                  getImageUrl(service.image || service.vendor?.logo) ||
                  "/images/placeholder-vendor.jpg";
                const vendorForPopup = {
                  id: service.id,
                  name: service.name || t("services.defaultName"),
                  image,
                  logo: getImageUrl(service.vendor?.logo) || null,
                  companyName: service.vendor?.brandName || "",
                  rating: service.rating || 0,
                  reviewCount: service.reviewsCount || 0,
                  duration: service.duration || "",
                  price: service.price ? String(service.price) : "",
                  currency: service.priceUnit || "",
                  included: service.included || [],
                  location: location || t("services.defaultLocation"),
                  website: service.vendor?.website || "",
                  email: service.vendor?.email || "",
                  phone: service.vendor?.phone || "",
                };
                return (
                  <ServiceCard
                    key={service.id}
                    service={{
                      id: service.id,
                      image,
                      rating: service.rating || 0,
                      reviewsCount: service.reviewsCount || 0,
                      title: service.name || t("services.defaultName"),
                      location: location || t("services.defaultLocation"),
                      tags: service.tags || [],
                      price: service.price
                        ? `${service.price} ${t("currency")}`
                        : "",
                      description: service.description || "",
                      vendorName: service.vendor?.brandName || "",
                      onCallClick: () => handleOpenVendorInfo(vendorForPopup),
                    }}
                  />
                );
              })}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} aria-hidden="true">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 7h18M5 7v12a2 2 0 002 2h10a2 2 0 002-2V7M9 7V5a3 3 0 016 0v2"
                  stroke="#C28E5C"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3>{t("emptyState.title")}</h3>
            <p>{t("emptyState.description")}</p>
          </div>
        )}
      </section>

      <VendorInfoPopup
        isOpen={!!selectedVendor}
        onClose={handleCloseVendorInfo}
        vendor={selectedVendor}
      />
    </div>
  );
};

export default MarketPlacePage;

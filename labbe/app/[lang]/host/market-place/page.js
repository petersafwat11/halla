"use client";
import React, { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePublicVendors } from "@/hooks/vendors";
import styles from "./page.module.css";
import ServiceCard from "../../market-place/_components/card/Card";
import Pagination from "../../market-place/_components/pagination/Pagination";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import VendorInfoPopup from "../../market-place/_components/vendorInfoPopup/VendorInfoPopup";

const ITEMS_PER_PAGE = 12;

const MarketPlacePage = () => {
  const { t } = useTranslation("marketplace");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const { data: vendorsData, isLoading } = usePublicVendors({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const vendors = useMemo(() => {
    const data = vendorsData?.data || [];
    return Array.isArray(data) ? data : [];
  }, [vendorsData]);

  const totalItems = vendorsData?.pagination?.total ?? vendors.length;
  const totalPages =
    vendorsData?.pagination?.pages ?? Math.ceil(totalItems / ITEMS_PER_PAGE);

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
              {vendors.map((vendor) => {
                const locations = vendor.serviceLocation;
                const cityName = locations?.cityNameAr || locations?.cityNameEn || "";
                const regionName = locations?.regionNameAr || locations?.regionNameEn || "";
                const location = [cityName, regionName].filter(Boolean).join(", ") || t("services.defaultLocation");

                const minPrice = vendor.minPrice != null
                  ? `${t("vendor.startsFrom")} ${vendor.minPrice} ${t("currency")}`
                  : null;

                const vendorForPopup = {
                  id: vendor.id,
                  brandName: vendor.brandName,
                  description: vendor.description,
                  logo: vendor.logo,
                  coverImage: vendor.coverImage,
                  portfolio: vendor.portfolio,
                  rating: vendor.rating,
                  reviewCount: vendor.numberOfRatings,
                  location,
                  email: vendor.email,
                  mobile: vendor.mobile,
                  socialLinks: vendor.socialLinks,
                  services: vendor.services,
                };

                return (
                  <ServiceCard
                    key={vendor.id}
                    service={{
                      id: vendor.id,
                      image: vendor.coverImage,
                      logo: vendor.logo,
                      rating: vendor.rating || 0,
                      reviewsCount: vendor.numberOfRatings || 0,
                      title: vendor.brandName,
                      location,
                      tags: vendor.serviceCategories || [],
                      price: minPrice || "",
                      vendorName: vendor.brandName,
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

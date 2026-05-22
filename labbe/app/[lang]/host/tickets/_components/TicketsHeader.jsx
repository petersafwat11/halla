"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams, usePathname } from "next/navigation";
import { IoIosArrowForward } from "react-icons/io";
import styles from "./TicketsHeader.module.css";
import Button from "@/ui/commen/button/Button";
import SearchBar from "./SearchBar";

const TicketsHeader = ({
  onCreateTicket,
  searchQuery,
  onSearchChange,
  t: tProp,
}) => {
  const { t: tLocal, i18n } = useTranslation("tickets");
  const router = useRouter();
  const { lang } = useParams();
  const pathname = usePathname() || "";
  const isArabic = i18n.language === "ar";
  const t = tProp || tLocal;

  const dashboardBase = pathname.includes("/vendor-dashboard")
    ? `/${lang}/vendor-dashboard`
    : pathname.includes("/admin-dash")
    ? `/${lang}/admin-dash`
    : `/${lang}/host`;

  return (
    <div className={styles.header}>
      <div className={styles.page_title}>
        <IoIosArrowForward
          onClick={() => router.push(dashboardBase)}
          style={{
            transform: isArabic ? "rotate(0deg)" : "rotate(180deg)",
            cursor: "pointer",
            fontSize: "2.4rem",
            color: "#2c2c2c",
            // marginLeft: isArabic ? "0" : ".5rem",
            // marginRight: isArabic ? "1rem" : "0",
          }}
        />
        <h1 className={styles.title}>{t("pageTitle") || "الشكاوى"}</h1>
      </div>

      <div className={styles.leftSection}>
        <div className={styles.actionsGroup}>
          <SearchBar
            value={searchQuery}
            onChange={onSearchChange}
            placeholder={t("searchPlaceholder") || "ابحث في الشكاوى..."}
          />
          <Button
            variant="primary"
            title={t("createTicket") || "انشئ شكوى"}
            onClick={onCreateTicket}
          />
        </div>
      </div>
    </div>
  );
};

export default TicketsHeader;

"use client";
import React, { useState, useEffect } from "react";
import styles from "./additionalLinksSection.module.css";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import DynamicForm from "@/ui/vendor/dynamicForm/DynamicForm";
import { socialLinksSchema } from "@/utils/schemas/vendorSettings";
import {
  FaGlobe,
  FaInstagram,
  FaFacebookF,
  FaSnapchatGhost,
} from "react-icons/fa";
import { FaXTwitter, FaTiktok } from "react-icons/fa6";

const AdditionalLinksSection = ({ data, onSave }) => {
  const { t } = useTranslation("vendorSettings");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Use data directly as passed from parent
  const displayData = {
    website: data?.website || "",
    instagram: data?.instagram || "",
    facebook: data?.facebook || "",
    twitter: data?.twitter || "",
    tiktok: data?.tiktok || "",
  };

  const socialLinks = [
    {
      key: "website",
      label: t("additionalLinks.websiteLink", "رابط الموقع"),
      icon: <FaGlobe size={16} color="#6366f1" />,
    },
    {
      key: "instagram",
      label: t("additionalLinks.instagramLink", "انستجرام"),
      icon: <FaInstagram size={16} color="#E4405F" />,
    },
    {
      key: "facebook",
      label: t("additionalLinks.facebookLink", "فيسبوك"),
      icon: <FaFacebookF size={16} color="#1877F2" />,
    },
    {
      key: "twitter",
      label: t("additionalLinks.twitterLink", "تويتر"),
      icon: <FaXTwitter size={16} color="#000" />,
    },
    {
      key: "tiktok",
      label: t("additionalLinks.tiktokLink", "تيك توك"),
      icon: <FaTiktok size={16} color="#000" />,
    },
  ];

  const handleEditClick = () => {
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  const handleFormSubmit = async (formData) => {
    setIsLoading(true);
    try {
      if (onSave) {
        await onSave({
          socialLinks: {
            website: formData.website || "",
            instagram: formData.instagram || "",
            facebook: formData.facebook || "",
            twitter: formData.twitter || "",
            tiktok: formData.tiktok || "",
          },
        });
      }
      setIsPopupOpen(false);
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>{t("additionalLinks.title")}</div>
          <button
            type="button"
            className={styles.editButton}
            onClick={handleEditClick}
          >
            <Image
              src="/svg/vendor/edit.svg"
              alt={t("buttons.edit")}
              width={24}
              height={24}
            />
          </button>
        </div>

        <div className={styles.content}>
          {socialLinks.map((link) => (
            <div key={link.key} className={styles.fieldGroup}>
              <label className={styles.label}>
                <span className={styles.icon}>{link.icon}</span> {link.label}
              </label>
              <div className={styles.value}>{displayData[link.key] || "-"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Popup */}
      <PopupLayout isOpen={isPopupOpen} onClose={handleClosePopup}>
        <DynamicForm
          schema={socialLinksSchema}
          initialData={displayData}
          onSubmit={handleFormSubmit}
          onCancel={handleClosePopup}
          isLoading={isLoading}
        />
      </PopupLayout>
    </>
  );
};

export default AdditionalLinksSection;

"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import DynamicForm from "@/ui/vendor/dynamicForm/DynamicForm";
import { socialLinksSchema } from "@/utils/schemas/vendorSettings";
import { FaGlobe, FaInstagram, FaFacebookF, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter, FaTiktok } from "react-icons/fa6";
import { SectionCard, FieldGrid, ReadField } from "../_shared/SettingsPrimitives";

const AdditionalLinksSection = ({ data, onSave }) => {
  const { t } = useTranslation("vendorSettings");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const displayData = {
    website: data?.website || "",
    instagram: data?.instagram || "",
    facebook: data?.facebook || "",
    twitter: data?.twitter || "",
    tiktok: data?.tiktok || "",
    whatsapp: data?.whatsapp || "",
  };

  const socialLinks = [
    {
      key: "whatsapp",
      label: t("additionalLinks.whatsapp", "WhatsApp"),
      icon: <FaWhatsapp size={16} color="#25D366" />,
    },
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
            whatsapp: formData.whatsapp || "",
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
      <SectionCard
        title={t("additionalLinks.title")}
        onEdit={() => setIsPopupOpen(true)}
      >
        <FieldGrid>
          {socialLinks.map((link) => (
            <ReadField
              key={link.key}
              label={link.label}
              value={displayData[link.key]}
              icon={link.icon}
            />
          ))}
        </FieldGrid>
      </SectionCard>

      <PopupLayout isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
        <DynamicForm
          schema={socialLinksSchema(t)}
          initialData={displayData}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsPopupOpen(false)}
          isLoading={isLoading}
        />
      </PopupLayout>
    </>
  );
};

export default AdditionalLinksSection;

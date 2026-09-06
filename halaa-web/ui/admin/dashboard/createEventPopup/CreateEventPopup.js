"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import styles from "./createEventPopup.module.css";
import Button from "@/ui/commen/button/Button";
import { useAdminHosts, useVerifyHostPhoneMutation } from "@/hooks/admin";

const CreateEventPopup = ({ onClose }) => {
  const { t } = useTranslation("adminDashboard");
  const router = useRouter();
  const params = useParams();

  // State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [filteredHosts, setFilteredHosts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Refs
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const { data: hostsResponse } = useAdminHosts({});
  const hosts = hostsResponse?.data?.hosts || [];

  const verifyHostPhone = useVerifyHostPhoneMutation();

  // Filter hosts based on phone number input
  useEffect(() => {
    if (phoneNumber.trim()) {
      const searchTerm = phoneNumber.trim();
      const filtered = hosts.filter(
        (host) =>
          host.phoneNumber?.includes(searchTerm) ||
          host.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredHosts(filtered);
      // Keep dropdown open even if no matches to show "no results"
      setShowDropdown(true);
    } else {
      // Show all hosts when input is empty but focused
      setFilteredHosts(hosts);
    }
  }, [phoneNumber, hosts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handlers
  const handleSelectHost = useCallback((host) => {
    setPhoneNumber(host.phoneNumber);
    setShowDropdown(false);
    setError("");
  }, []);

  const handleInputChange = useCallback((e) => {
    setPhoneNumber(e.target.value);
    setError("");
  }, []);

  const handleInputFocus = useCallback(() => {
    // Show dropdown on focus - either filtered results or all hosts
    if (phoneNumber.trim()) {
      setShowDropdown(true);
    } else {
      setFilteredHosts(hosts);
      setShowDropdown(hosts.length > 0);
    }
  }, [phoneNumber, hosts]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");

      // Validation - only check if a phone number was selected
      if (!phoneNumber) {
        setError(t("errors.phoneRequired", "يرجى اختيار مستخدم من القائمة"));
        return;
      }

      setIsLoading(true);

      try {
        // Verify host exists in database
        const response = await verifyHostPhone.mutateAsync(phoneNumber);

        if (!response.data?.isValid) {
          setError(
            t("errors.hostNotFound", "لم يتم العثور على مستخدم بهذا الرقم")
          );
          setIsLoading(false);
          return;
        }

        // Navigate to create event page
        onClose();
        router.push(
          `/${params.lang
          }/admin-dash/create-event?phoneNumber=${encodeURIComponent(
            phoneNumber
          )}`
        );
      } catch (err) {
        console.error("Error verifying host:", err);
        setError(
          err.response?.data?.message ||
          t("errors.general", "حدث خطأ. يرجى المحاولة مرة أخرى")
        );
        setIsLoading(false);
      }
    },
    [phoneNumber, t, onClose, router, params.lang, verifyHostPhone]
  );

  // Render dropdown items
  const renderDropdown = () => {
    if (!showDropdown) return null;

    if (filteredHosts.length === 0) {
      return (
        <div ref={dropdownRef} className={styles.dropdown}>
          <div className={styles.noResults}>
            {t("createEvent.noResults", "لا توجد نتائج")}
          </div>
        </div>
      );
    }

    return (
      <div ref={dropdownRef} className={styles.dropdown}>
        {filteredHosts.map((host) => (
          <div
            key={host._id}
            className={styles.dropdownItem}
            onClick={() => handleSelectHost(host)}
          >
            <span className={styles.hostName}>{host.name || "مستخدم"}</span>
            <span className={styles.hostPhone}>{host.phoneNumber}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.popup}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          {t("createEvent.title", "إنشاء مناسبة جديدة")}
        </h2>
        <p className={styles.description}>
          {t(
            "createEvent.description",
            "أدخل رقم هاتف المستخدم لإنشاء مناسبة له"
          )}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Phone Number Input */}
        <div className={styles.inputGroup}>
          <label htmlFor="phoneNumber" className={styles.label}>
            {t("createEvent.phoneLabel", "رقم الجوال")}
            <span className={styles.required}>*</span>
          </label>

          <div className={styles.inputWrapper}>
            <input
              ref={inputRef}
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder="05xxxxxxxx"
              className={`${styles.input} ${error ? styles.inputError : ""}`}
              dir="ltr"
              disabled={isLoading}
              autoComplete="off"
            />
            {renderDropdown()}
          </div>

          {error && <span className={styles.errorText}>{error}</span>}

          <p className={styles.hint}>
            {t("createEvent.phoneHint", "ابحث واختر رقم المستخدم من القائمة")}
          </p>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            title={t("cancel", "إلغاء")}
            onClick={onClose}
            disabled={isLoading}
          />
          <Button
            type="submit"
            variant="primary"
            title={
              isLoading
                ? t("loading", "جاري التحميل...")
                : t("continue", "متابعة")
            }
            disabled={isLoading}
          />
        </div>
      </form>
    </div>
  );
};

export default CreateEventPopup;

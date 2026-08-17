"use client";
import React, { useState, useCallback } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./staffPopup.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import MobileInputGroup from "@/ui/commen/inputs/mobileInputGroup/MobileInputGroup";
import Button from "@/ui/commen/button/Button";
import Table from "@/ui/commen/new-table/Table";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

const StaffPopup = ({
  staffList = [],
  onAdd,
  onEdit,
  onDelete,
  onClose,
  title = "مشرفين البوابة",
}) => {
  const { t } = useTranslation("createEvent");
  const [currentItem, setCurrentItem] = useState({ name: "", phone: "" });
  const [localErrors, setLocalErrors] = useState({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Reset current item
  const resetCurrentItem = () => {
    setCurrentItem({ name: "", phone: "" });
    setLocalErrors({});
    setShowValidationErrors(false);
  };

  // Input change handler
  const handleInputChange = useCallback((field, value) => {
    setCurrentItem((prev) => ({ ...prev, [field]: value }));
    setLocalErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
    setShowValidationErrors(false);
  }, []);

  // Validation
  const validateItem = useCallback(() => {
    const newErrors = {};
    const name = (currentItem.name || "").trim();
    const phone = (currentItem.phone || "").trim();

    if (!name) {
      newErrors.name = t("staff_name_required", "اسم الموظف مطلوب");
    }

    if (!phone) {
      newErrors.phone = t("staff_phone_required", "رقم الجوال مطلوب");
    } else if (!/^5[0-9]{8}$/.test(phone)) {
      newErrors.phone = t("staff_phone_invalid_pattern", "رقم الجوال يجب أن يكون 9 أرقام ويبدأ بـ 5");
    }

    // Check for duplicate phone (exclude current item when editing)
    if (phone) {
      const phoneExists = staffList.some(
        (item) => item.phone === phone && item.id !== currentItem.id
      );
      if (phoneExists) {
        newErrors.phone = t("staff_phone_duplicate", "هذا الرقم موجود بالفعل في القائمة");
      }
    }

    setLocalErrors(newErrors);
    setShowValidationErrors(Object.keys(newErrors).length > 0);
    return Object.keys(newErrors).length === 0;
  }, [currentItem, staffList, t]);

  // Add handler
  const handleAdd = () => {
    if (!validateItem()) return;
    const newItem = {
      name: currentItem.name?.trim() || "",
      phone: currentItem.phone?.trim() || "",
      id: Date.now(),
    };
    onAdd(newItem);
    resetCurrentItem();
  };

  // Edit handler
  const handleEditSubmit = () => {
    if (!validateItem()) return;
    const updatedItem = {
      name: currentItem.name?.trim() || "",
      phone: currentItem.phone?.trim() || "",
      id: currentItem.id,
    };
    onEdit(updatedItem);
    resetCurrentItem();
  };

  // Edit click handler
  const handleEditClick = useCallback(
    (id) => {
      const item = staffList.find((item) => item.id === id);
      if (item) {
        setCurrentItem({
          name: item.name || "",
          phone: item.phone || "",
          id: item.id,
        });
        setLocalErrors({});
        setShowValidationErrors(false);
      }
    },
    [staffList]
  );

  const isEditing = currentItem.id !== undefined;

  // Create a form context for MobileInputGroup
  const methods = useForm({
    mode: "onChange",
    defaultValues: {
      phone: "",
      name: "",
    },
  });

  return (
    <FormProvider {...methods}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("staff_popup_title", title)}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.description}>
            {t("staff_popup_desc", "أضف مشرفين البوابة المسؤولين عن تسجيل حضور الضيوف. سيتمكنون من الوصول لصفحة تسجيل الحضور عبر رابط خاص.")}
          </p>

          <div className={styles.formSection}>
            <div className={styles.formGrid}>
              <MobileInputGroup
                label={t("staff_phone", "رقم الجوال")}
                placeholder={t("staff_phone_placeholder", "5xxxxxxxx")}
                type="tel"
                required
                value={currentItem.phone || ""}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                error={showValidationErrors ? localErrors.phone : ""}
              />
              <InputGroup
                label={t("staff_name", "اسم الموظف")}
                placeholder={t("staff_name_placeholder", "ادخل اسم الموظف")}
                required
                value={currentItem.name || ""}
                onChange={(e) => handleInputChange("name", e.target.value)}
                error={showValidationErrors ? localErrors.name : ""}
              />
            </div>

            <div className={styles.buttonGroup}>
              {isEditing ? (
                <>
                  <Button
                    variant="primary"
                    title={t("staff_update", "تحديث")}
                    onClick={handleEditSubmit}
                  />
                  <Button
                    variant="secondary"
                    title={t("staff_cancel", "إلغاء")}
                    onClick={resetCurrentItem}
                  />
                </>
              ) : (
                <Button
                  variant="primary"
                  title={t("staff_add_to_list", "إضافة إلى القائمة")}
                  onClick={handleAdd}
                />
              )}
            </div>
          </div>

          {staffList.length > 0 && (
            <div className={styles.tableSection}>
              <Table
                title={t("staff_popup_title", title)}
                headers={[t("staff_phone", "رقم الجوال"), t("name", "الاسم")]}
                data={staffList}
                actions={[
                  {
                    icon: <FiEdit2 size={18} />,
                    text: t("staff_edit", "تعديل"),
                    onClick: (row) => handleEditClick(row.id),
                  },
                  {
                    icon: <FiTrash2 size={18} />,
                    text: t("staff_delete", "حذف"),
                    onClick: (row) => onDelete(row.id),
                  },
                ]}
                showSearch={false}
                showFilter={false}
                showExport={false}
                showCheckboxes={false}
              />
            </div>
          )}
        </div>
      </div>
    </FormProvider>
  );
};

export default StaffPopup;

"use client";
import React from "react";
// Reuse InputGroup's styling so the category field matches the name/phone
// inputs. InputGroup itself can't be used here because it doesn't forward a
// `list` attribute (needed for the native datalist "select or create" combo).
import styles from "@/ui/commen/inputs/inputGroup/inputGroup.module.css";

/**
 * Optional free-text category field with a "select existing or type a new
 * one" datalist. Works in every browser with no extra dependency. Options
 * are the host's existing category labels (from the guest book) merged with
 * any already on the current list.
 */
const CategoryCombobox = ({
  label,
  placeholder,
  value,
  onChange,
  options = [],
  disabled = false,
  listId = "guest-category-options",
}) => {
  return (
    <div className={styles.inputGroup}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.inputContainer}>
        <input
          className={styles.input}
          list={listId}
          placeholder={placeholder}
          value={value || ""}
          onChange={onChange}
          disabled={disabled}
          maxLength={60}
          autoComplete="off"
          style={{ direction: "rtl" }}
        />
        <datalist id={listId}>
          {options.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      </div>
    </div>
  );
};

export default CategoryCombobox;

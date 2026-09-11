"use client";
import React, { useState, useRef, useEffect } from "react";
import styles from "./inputGroup.module.css";
import Image from "next/image";
import { get, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

const InputSelect = ({
  label,
  placeholder,
  name,
  iconPath,
  onIconClick,
  hintMessage,
  required,
  options = [],
  disabled = false,
}) => {
  const { t, i18n } = useTranslation("common");
  const {
    register,
    formState: { errors },
    watch,
    setValue,
    clearErrors,
  } = useFormContext();
  const error = get(errors, name)?.message;
  const watchedValue = watch(name);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownRef = useRef(null);

  // Find the selected option based on watched value
  useEffect(() => {
    if (watchedValue) {
      const option = options.find((opt) => opt.value === watchedValue);
      setSelectedOption(option);
      if (!isSearching) {
        setSearchTerm(option ? option.label : "");
      }
    } else {
      setSelectedOption(null);
      if (!isSearching) {
        setSearchTerm("");
      }
    }
  }, [watchedValue, isSearching,options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsSearching(false);
        // Reset search term to selected option label when closing
        if (selectedOption) {
          setSearchTerm(selectedOption.label);
        } else {
          setSearchTerm("");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedOption]);

  const handleInputClick = () => {
    if (!disabled) {
      setActiveIndex(0);
      setIsOpen(true);
      setIsSearching(true);
      // Clear search term when opening to show all options
      setSearchTerm("");
    }
  };

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    clearErrors(name);
    setSearchTerm(option.label);
    setIsSearching(false);
    setValue(name, option.value, { shouldValidate: true, shouldDirty: true });
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setActiveIndex(0);
    const value = e.target.value;
    setSearchTerm(value);
    setIsSearching(true);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (!disabled && !isOpen) {
      setIsOpen(true);
      setIsSearching(true);
      setSearchTerm("");
    }
  };

  const handleInputBlur = (e) => {
    // Don't close immediately to allow option clicks
    setTimeout(() => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(document.activeElement)
      ) {
        setIsOpen(false);
        setIsSearching(false);
        // Reset to selected option or clear
        if (selectedOption) {
          setSearchTerm(selectedOption.label);
        } else {
          setSearchTerm("");
        }
      }
    }, 150);
  };

  // Filter options based on search term, but show all if not searching or search term is empty
  const filteredOptions =
    isSearching && searchTerm.trim()
      ? options.filter((option) =>
          option.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : options;

  const displayValue = isSearching
    ? searchTerm
    : selectedOption
    ? selectedOption.label
    : searchTerm;

  return (
    <div className={styles.input_group}>
      <label className={styles.label} htmlFor={name}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <div className={styles.input_container} ref={dropdownRef}>
        <input
          id={name}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${name}-options`}
          aria-autocomplete="list"
          aria-invalid={!!error}
          aria-activedescendant={isOpen && filteredOptions[activeIndex] ? `${name}-option-${activeIndex}` : undefined}
          className={error ? styles.input_error : styles.input}
          type="text"
          placeholder={placeholder}
          name={name}
          value={displayValue}
          onChange={handleInputChange}
          onClick={handleInputClick}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={(event) => {
            if (["ArrowDown", "ArrowUp"].includes(event.key)) {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((index) => isOpen ? Math.max(0, Math.min(filteredOptions.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))) : 0);
            } else if (event.key === "Enter" && isOpen) {
              event.preventDefault();
              if (filteredOptions[activeIndex]) handleOptionClick(filteredOptions[activeIndex]);
            } else if (event.key === "Escape" && isOpen) {
              event.preventDefault(); event.stopPropagation(); setIsOpen(false); setIsSearching(false);
            }
          }}
          disabled={disabled}
          autoComplete="off"
          readOnly={!isSearching}
          style={{
            paddingInlineEnd: iconPath ? "4.8rem" : "3rem",
            cursor: disabled ? "not-allowed" : "text",
            backgroundImage: "url('/svg/events/brown-down-arrow.svg')",
            backgroundRepeat: "no-repeat",
            backgroundPosition: `${i18n.dir() === "rtl" ? "left" : "right"} 1.2rem center`,
            backgroundSize: "1.6rem",
            transition: "all 0.2s ease",
          }}
        />
        {/* Hidden input for form registration with the actual value */}
        <input
          type="hidden"
          {...register(name)}
          value={watchedValue || ""}
        />
        {iconPath && (
          <Image
            className={styles.icon}
            src={`/svg/${iconPath}`}
            alt="icon"
            width={24}
            height={24}
            onClick={onIconClick}
          />
        )}

        {/* Custom Dropdown */}
        <div
          id={`${name}-options`}
          role="listbox"
          aria-label={label}
          hidden={!isOpen}
          className={styles.dropdown}
          style={{
            transform: isOpen ? "scaleY(1)" : "scaleY(0)",
            transformOrigin: "top",
            transition: "transform 0.2s ease",
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none",
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                id={`${name}-option-${index}`}
                role="option"
                aria-selected={selectedOption?.value === option.value}
                key={index}
                className={`${styles.dropdown_option} ${
                  selectedOption?.value === option.value
                    ? styles.dropdown_option_selected
                    : ""
                } ${isOpen && activeIndex === index ? styles.dropdown_option_active : ""}`}
                onClick={() => handleOptionClick(option)}
                onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking
              >
                {option.label}
              </div>
            ))
          ) : (
            <div className={styles.dropdown_option}>{t("noOptionsFound", i18n.dir() === "rtl" ? "لا توجد خيارات" : "No options found")}</div>
          )}
        </div>
      </div>
      {error && (
        <div className={styles.error_container}>
          <p className={styles.error}>{error}</p>
        </div>
      )}
      {hintMessage && <p className={styles.hint}>{hintMessage}</p>}
    </div>
  );
};

export default InputSelect;

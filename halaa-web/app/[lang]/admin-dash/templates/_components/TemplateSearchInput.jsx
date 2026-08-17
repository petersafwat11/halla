"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./TemplatesPageContent.module.css";

export default function TemplateSearchInput({ value, onChange, placeholder }) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const next = e.target.value;
    setLocalValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next), 300);
  };

  return (
    <div className={styles.searchWrapper}>
      <svg
        className={styles.searchIcon}
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.7541 13.7541L17.4999 17.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <input
        type="search"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        className={styles.searchInput}
      />
    </div>
  );
}

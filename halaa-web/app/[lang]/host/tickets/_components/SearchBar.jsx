"use client";
import React from "react";
import styles from "./SearchBar.module.css";
import Image from "next/image";

const SearchBar = ({ value, onChange, placeholder }) => {
  return (
    <div className={styles.container}>
      <div className={styles.searchWrapper}>
        <Image
          src="/svg/events/search.svg"
          alt="search"
          width={20}
          height={20}
          className={styles.searchIcon}
        />
        <input
          type="text"
          placeholder={placeholder || "البحث في الشكاوى..."}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.searchInput}
        />
      </div>
    </div>
  );
};

export default SearchBar;

"use client";
import React from "react";
import { FaUserCircle } from "react-icons/fa";
import styles from "./likesPopup.module.css";

/**
 * Modal listing the guests who liked the post. `likes` is an array of
 * `{ _id, guest: { _id, name } }`.
 */
const LikesPopup = ({ likes = [], title, emptyText, closeLabel, onClose }) => {
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className={styles.modal}>
        <header className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={closeLabel}
          >
            ✕
          </button>
        </header>
        <div className={styles.list}>
          {likes.length === 0 ? (
            <p className={styles.empty}>{emptyText}</p>
          ) : (
            likes.map((l) => (
              <div key={l._id || l.guest?._id} className={styles.row}>
                <FaUserCircle className={styles.avatar} />
                <span className={styles.name}>{l.guest?.name || "Guest"}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LikesPopup;

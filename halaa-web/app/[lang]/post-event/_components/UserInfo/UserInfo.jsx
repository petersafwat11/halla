"use client";
import React from "react";
import Image from "next/image";
import { FaUserCircle } from "react-icons/fa";
import styles from "./userInfo.module.css";

const UserInfo = ({ name, date, avatarUrl }) => {
  return (
    <div className={styles.userInfoContainer}>
      <div className={styles.userDetails}>
        <div className={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              width={38}
              height={38}
              className={styles.avatar}
            />
          ) : (
            <FaUserCircle className={styles.avatarIcon} size={38} />
          )}
        </div>

        <div className={styles.userName}>{name}</div>
      </div>

      <div className={styles.dateText}>{date}</div>
    </div>
  );
};

export default UserInfo;

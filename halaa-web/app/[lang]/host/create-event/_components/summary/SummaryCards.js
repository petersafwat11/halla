"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./summary.module.css";

const SummaryCards = ({ eventData }) => {
  const { t } = useTranslation("createEvent");

  return (
    <div className={styles.statsCards}>
      <div className={styles.statCard}>
        <div className={styles.iconContainer}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5.53841 5.53726C6.81291 5.53726 7.8461 4.50407 7.8461 3.22957C7.8461 1.95506 6.81291 0.921875 5.53841 0.921875C4.2639 0.921875 3.23071 1.95506 3.23071 3.22957C3.23071 4.50407 4.2639 5.53726 5.53841 5.53726Z"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M1.57397 10.1526C1.57397 8.36649 3.35091 6.92188 5.5386 6.92188"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.40027 9.87573C9.21595 9.87573 9.8772 9.21449 9.8772 8.3988C9.8772 7.58312 9.21595 6.92188 8.40027 6.92188C7.58459 6.92188 6.92334 7.58312 6.92334 8.3988C6.92334 9.21449 7.58459 9.87573 8.40027 9.87573Z"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10.154 10.1529L9.6925 9.69141"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className={styles.statValue}>{eventData.staffCount}</div>
        <div className={styles.statLabel}>{t("number_of_staff")}</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.iconContainer}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8.30799 3.30342C8.2803 3.2988 8.24799 3.2988 8.2203 3.30342C7.58338 3.28034 7.07568 2.7588 7.07568 2.11265C7.07568 1.45265 7.60645 0.921875 8.26645 0.921875C8.92645 0.921875 9.45722 1.45726 9.45722 2.11265C9.45261 2.7588 8.94491 3.28034 8.30799 3.30342Z"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7.83276 6.66289C8.46506 6.76904 9.16199 6.65827 9.65122 6.33058C10.302 5.89673 10.302 5.18596 9.65122 4.75212C9.15737 4.42443 8.45122 4.31365 7.81891 4.42442"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2.75525 3.30342C2.78294 3.2988 2.81525 3.2988 2.84294 3.30342C3.47986 3.28034 3.98756 2.7588 3.98756 2.11265C3.98756 1.45265 3.45679 0.921875 2.79679 0.921875C2.13679 0.921875 1.60602 1.45726 1.60602 2.11265C1.61063 2.7588 2.11833 3.28034 2.75525 3.30342Z"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3.23061 6.66289C2.5983 6.76904 1.90138 6.65827 1.41215 6.33058C0.76138 5.89673 0.76138 5.18596 1.41215 4.75212C1.906 4.42443 2.61215 4.31365 3.24446 4.42442"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M5.53864 6.75263C5.51095 6.74802 5.47864 6.74802 5.45095 6.75263C4.81403 6.72956 4.30634 6.20802 4.30634 5.56186C4.30634 4.90186 4.8371 4.37109 5.4971 4.37109C6.1571 4.37109 6.68787 4.90648 6.68787 5.56186C6.68326 6.20802 6.17557 6.73417 5.53864 6.75263Z"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4.19535 8.20677C3.54458 8.64061 3.54458 9.35138 4.19535 9.78523C4.93381 10.2791 6.14304 10.2791 6.88151 9.78523C7.53228 9.35138 7.53228 8.64061 6.88151 8.20677C6.14766 7.71754 4.93381 7.71754 4.19535 8.20677Z"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className={styles.statValue}>{eventData.guests}</div>
        <div className={styles.statLabel}>{t("number_of_invitees")}</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.iconContainer}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3.69232 0.921875V2.30649"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7.38464 0.921875V2.30649"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7.38464 1.61719C8.92157 1.70026 9.69234 2.28642 9.69234 4.45565V7.30796C9.69234 9.2095 9.2308 10.1603 6.92311 10.1603H4.15387C1.84618 10.1603 1.38464 9.2095 1.38464 7.30796V4.45565C1.38464 2.28642 2.15541 1.70488 3.69234 1.61719H7.38464Z"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9.57692 8.125H1.5"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M5.53849 3.80859C4.9708 3.80859 4.4908 4.11782 4.4908 4.71782C4.4908 5.00398 4.62464 5.2209 4.82772 5.35936C4.54618 5.52552 4.38464 5.79321 4.38464 6.10706C4.38464 6.67936 4.82311 7.03475 5.53849 7.03475C6.24926 7.03475 6.69234 6.67936 6.69234 6.10706C6.69234 5.79321 6.5308 5.5209 6.24464 5.35936C6.45234 5.21629 6.58157 5.00398 6.58157 4.71782C6.58157 4.11782 6.10618 3.80859 5.53849 3.80859ZM5.53849 5.11936C5.29849 5.11936 5.12311 4.97629 5.12311 4.75013C5.12311 4.51936 5.29849 4.38552 5.53849 4.38552C5.77849 4.38552 5.95387 4.51936 5.95387 4.75013C5.95387 4.97629 5.77849 5.11936 5.53849 5.11936ZM5.53849 6.46244C5.23387 6.46244 5.01234 6.31013 5.01234 6.03321C5.01234 5.75629 5.23387 5.60859 5.53849 5.60859C5.84311 5.60859 6.06464 5.7609 6.06464 6.03321C6.06464 6.31013 5.84311 6.46244 5.53849 6.46244Z"
              fill="#C28E5C"
            />
          </svg>
        </div>
        <div className={styles.statValue}>{eventData.date}</div>
        <div className={styles.statLabel}>{t("event_date")}</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.iconContainer}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3.69232 0.921875V2.30649"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7.38464 0.921875V2.30649"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M1.61536 4.19531H9.46151"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9.69234 3.92488V7.84796C9.69234 9.23257 9.00003 10.1556 7.38464 10.1556H3.69234C2.07695 10.1556 1.38464 9.23257 1.38464 7.84796V3.92488C1.38464 2.54026 2.07695 1.61719 3.69234 1.61719H7.38464C9.00003 1.61719 9.69234 2.54026 9.69234 3.92488Z"
              stroke="#C28E5C"
              strokeWidth="0.692308"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className={styles.statValue}>{eventData.eventType}</div>
        <div className={styles.statLabel}>{t("event_type")}</div>
      </div>
    </div>
  );
};

export default SummaryCards;

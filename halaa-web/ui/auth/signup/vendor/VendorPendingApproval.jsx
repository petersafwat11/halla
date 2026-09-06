"use client";
import React from "react";
import styles from "./vendorPendingApproval.module.css";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaClock, FaEnvelope, FaHeadset } from "react-icons/fa";
import { LEGAL_CONTACT } from "@halaa/shared/legal/contact";

const VendorPendingApproval = ({ lang = "ar" }) => {
  const { t } = useTranslation("signup");
  const searchParams = useSearchParams();
  const applicationId = searchParams?.get("id") || "";

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper} aria-hidden="true">
          <FaClock />
        </div>

        <div className={styles.badge}>
          <FaClock size={12} />
          <span>
            {t("signupForm.vendor.pendingApproval.badge", {
              defaultValue: "طلبك قيد المراجعة",
            })}
          </span>
        </div>

        <h1 className={styles.title}>
          {t("signupForm.vendor.pendingApproval.title", {
            defaultValue: "تم استلام طلب الانضمام بنجاح",
          })}
        </h1>

        <p className={styles.description}>
          {t("signupForm.vendor.pendingApproval.description", {
            defaultValue:
              "شكراً لاهتمامك بالانضمام إلى منصة هلا كمزود خدمة. طلبك الآن قيد المراجعة والتحقق من البيانات والمستندات المرفقة من قبل فريق العمل.",
          })}
        </p>

        {applicationId && (
          <div className={styles.idBox}>
            <span className={styles.idLabel}>
              {t("signupForm.vendor.pendingApproval.applicationIdLabel", {
                defaultValue: "رقم الطلب",
              })}
              :
            </span>
            <span className={styles.idValue}>#{applicationId}</span>
          </div>
        )}

        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <div className={styles.infoTitle}>
              <FaClock color="#c28e5c" />
              <span>
                {t("signupForm.vendor.pendingApproval.reviewTimeTitle", {
                  defaultValue: "مدة المراجعة المتوقعة",
                })}
              </span>
            </div>
            <p className={styles.infoDesc}>
              {t("signupForm.vendor.pendingApproval.reviewTimeDescription", {
                defaultValue:
                  "تتم مراجعة الطلبات والتحقق من المستندات خلال 1 إلى 3 أيام عمل.",
              })}
            </p>
          </div>

          <div className={styles.infoCard}>
            <div className={styles.infoTitle}>
              <FaEnvelope color="#c28e5c" />
              <span>
                {t("signupForm.vendor.pendingApproval.nextStepsTitle", {
                  defaultValue: "الخطوات التالية",
                })}
              </span>
            </div>
            <p className={styles.infoDesc}>
              {t("signupForm.vendor.pendingApproval.nextStepsDescription", {
                defaultValue:
                  "سنقوم بإرسال رسالة بريد إلكتروني تحتوي على نتيجة مراجعة الطلب وتفاصيل تفعيل الحساب بمجرد اعتماده لتتمكن من تسجيل الدخول إلى لوحة التحكم.",
              })}
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          <Link
            href={`/${lang}/market-place`}
            className={styles.primaryBtn}
          >
            {t("signupForm.vendor.pendingApproval.actions.marketplace", {
              defaultValue: "تصفح الخدمات",
            })}
          </Link>

          <Link href={`/${lang}`} className={styles.secondaryBtn}>
            {t("signupForm.vendor.pendingApproval.actions.home", {
              defaultValue: "العودة للرئيسية",
            })}
          </Link>

          <a
            href={`mailto:${LEGAL_CONTACT.supportEmail.value}`}
            className={styles.secondaryBtn}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaHeadset style={{ marginInlineEnd: "0.8rem" }} />
            {t("signupForm.vendor.pendingApproval.actions.contactSupport", {
              defaultValue: "تواصل مع الدعم الفني",
            })}
          </a>
        </div>
      </div>
    </div>
  );
};

export default VendorPendingApproval;

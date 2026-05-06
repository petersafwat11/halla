"use client";

import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useAdminVendor } from "@/hooks/reactQueryHooks/useAdmin";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import ErrorFallback from "@/ui/common/error/ErrorFallback";
import VendorDetailsWrapper from "./VendorDetailsWrapper";
import styles from "./VendorDetailsContent.module.css";

export default function VendorDetailsContent({ vendorId }) {
  const { t } = useTranslation("adminVendorDetails");
  const router = useRouter();
  const { data, isLoading, error } = useAdminVendor(vendorId);

  if (isLoading) {
    return <SimpleLoading message={t("loading.vendorData")} />;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <ErrorFallback
          message={t("errors.loadFailed")}
          onRetry={() => router.back()}
        />
      </div>
    );
  }

  const vendorData = data?.data?.vendor || data?.data || data;

  return <VendorDetailsWrapper vendorData={vendorData} error={null} />;
}

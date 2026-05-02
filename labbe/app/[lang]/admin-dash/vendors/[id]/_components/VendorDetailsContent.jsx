"use client";
import { useAdminVendor } from "@/hooks/reactQueryHooks/useAdmin";
import { useRouter } from "next/navigation";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import VendorDetailsWrapper from "../_components/VendorDetailsWrapper";
import styles from "./VendorDetailsContent.module.css";

export default function VendorDetailsContent({ vendorId }) {
  const router = useRouter();
  const { data, isLoading, error } = useAdminVendor(vendorId);

  if (isLoading) {
    return <SimpleLoading />;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h2>Error Loading Vendor</h2>
        <p>{error.message}</p>
        <button onClick={() => router.back()}>Go Back</button>
      </div>
    );
  }

  const vendorData = data?.data?.vendor || data?.data || data;

  return <VendorDetailsWrapper vendorData={vendorData} error={null} />;
}

import React from "react";
import { cookies } from "next/headers";
import { whitelabelAPI } from "@/services/adminDashboard";
import WhitelabelDetailsWrapper from "./_components/WhitelabelDetailsWrapper";

const WhitelabelDetailsPage = async ({ params }) => {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const { id } = await params;

  let whitelabelData = null;
  let error = null;

  try {
    const response = await whitelabelAPI.getById(id, token);
    whitelabelData = response.data;
  } catch (err) {
    console.error("Error fetching whitelabel details:", err.message);
    error = err.message || "فشل في تحميل بيانات العلامة البيضاء";
  }

  return (
    <WhitelabelDetailsWrapper whitelabelData={whitelabelData} error={error} />
  );
};

export default WhitelabelDetailsPage;

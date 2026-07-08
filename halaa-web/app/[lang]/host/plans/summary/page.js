"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

/**
 * Summary page redirect - summary is accessed via plans page flow
 */
export default function SummaryRedirect() {
  const router = useRouter();
  const { lang } = useParams();

  useEffect(() => {
    router.replace(`/${lang}/host/plans`);
  }, [router, lang]);

  return null;
}

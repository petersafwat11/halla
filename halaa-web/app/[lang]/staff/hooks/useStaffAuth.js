"use client";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "next/navigation";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { isStaffAuthenticated, setStaffToken } from "@/utils/staffToken";

/**
 * Hook that handles staff portal authentication.
 * Reads token / phone / eventId from URL search params, calls the
 * appropriate verification endpoint and stores the result in local state.
 *
 * Surfaces 410 GONE reasons (`staff_revoked` / `staff_expired`) as distinct
 * error messages.
 */
export function useStaffAuth() {
  const { t } = useTranslation("staff");
  const searchParams = useSearchParams();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [staffInfo, setStaffInfo] = useState(null);
  const [eventInfo, setEventInfo] = useState(null);
  const [eventId, setEventId] = useState(null);

  useEffect(() => {
    const verify = (params) =>
      apiRequest({
        method: "GET",
        path: API_PATHS.staff.verifyStaffAccess,
        params,
      });

    const verifyAccess = async () => {
      const token = searchParams.get("token");
      const phone = searchParams.get("phone");
      const eventIdParam = searchParams.get("eventId");

      try {
        let response;
        if (token) {
          response = await verify({ token });
        } else if (phone && eventIdParam) {
          response = await verify({ phone, eventId: eventIdParam });
        } else if (isStaffAuthenticated()) {
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        } else {
          setAuthError(t("errors.noAccessToken"));
          setIsLoading(false);
          return;
        }

        if (response.data?.sessionToken) {
          setStaffToken(response.data.sessionToken);
        }

        if (response.data?.verified) {
          setIsAuthenticated(true);
          setStaffInfo(response.data.staff);
          setEventInfo(response.data.event);
          setEventId(response.data.event._id);
        } else {
          setAuthError(t("errors.accessDenied"));
        }
      } catch (error) {
        const reason =
          error?.data?.reason || error?.response?.data?.reason || null;
        if (reason === "staff_revoked") {
          setAuthError(t("errors.staffRevoked"));
        } else if (reason === "staff_expired") {
          setAuthError(t("errors.staffExpired"));
        } else {
          setAuthError(t("errors.verificationFailed"));
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifyAccess();
  }, [searchParams, t]);

  return { isAuthenticated, isLoading, authError, staffInfo, eventInfo, eventId };
}

"use client";

import useAuthStore from "@/stores/authStore";
import PlansPage from "./PlansPage";
import BusinessPlansPage from "./BusinessPlansPage";

/**
 * Client-side branch between the personal-host plans page and the business
 * plans page. The web auth store holds the full user DTO (including
 * `accountType`), so we resolve the variant here rather than server-side —
 * the SSR layer only has the `userType`/`access_token` cookies, not the
 * account type. Both branches' queries are prefetched best-effort on the
 * server, so the correct page hydrates without a visible refetch.
 */
const PlansPageRouter = () => {
  const user = useAuthStore((state) => state.user);
  const isBusiness = user?.accountType === "business";

  return isBusiness ? <BusinessPlansPage /> : <PlansPage />;
};

export default PlansPageRouter;

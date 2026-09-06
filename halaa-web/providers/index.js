import initTranslations from "@/localization/i18n";
import ClientComponentsTranslationsProvider from "./ClientCompTrans";
import { headers } from "next/headers";
import { publicNamespacesForPath } from "@/localization/publicNamespaces";

const i18nNamespaces = [
  "common",
  "login",
  "forgetPassword",
  "changePassword",
  "signup",
  "continueSignup",
  "createEvent",
  "home-events",
  "host-events",
  "settings",
  "plans",
  "adminEvents",
  "adminHosts",
  "adminBusinesses",
  "adminVendors",
  "adminVendorDetails",
  "adminPayments",
  "adminSettings",
  "adminModerators",
  "adminDashboard",
  "admin",
  "adminTickets",
  "vendorSettings",
  "vendorServices",
  "hostPayments",
  "table",
  "tickets",
  "ticketRating",
  "staff",
  "postEvent",
  "businessPlans",
  "adminDiscounts",
  "landing",
  "marketplace",
  "guest-portal",
];

export default async function GlobalProvider({ children, lang }) {
  const pathname = (await headers()).get("x-halaa-pathname");
  const namespaces = publicNamespacesForPath(pathname) || i18nNamespaces;
  const { resources } = await initTranslations(lang, namespaces);

  return (
    <ClientComponentsTranslationsProvider
      namespaces={namespaces}
      locale={lang}
      resources={resources}
    >
      {children}
    </ClientComponentsTranslationsProvider>
  );
}

import initTranslations from "@/localization/i18n";
import ClientComponentsTranslationsProvider from "./ClientCompTrans";

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
  "adminWhitelabels",
  "adminDiscounts",
  "landing",
  "marketplace",
  "guest-portal",
];

export default async function GlobalProvider({ children, lang }) {
  const { t, resources } = await initTranslations(lang, i18nNamespaces);

  return (
    <ClientComponentsTranslationsProvider
      namespaces={i18nNamespaces}
      locale={lang}
      resources={resources}
    >
      {children}
    </ClientComponentsTranslationsProvider>
  );
}

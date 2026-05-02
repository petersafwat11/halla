import React from "react";
import initTranslations from "@/localization/i18n";
import ClientComponentsTranslationsProvider from "@/providers/ClientCompTrans";
import PaymentsClient from "./_components/PaymentsClient";

const i18nNamespaces = ["hostPayments", "table"];

const PaymentsPage = async ({ params }) => {
  const { lang } = params;
  const { t, resources } = await initTranslations(lang, i18nNamespaces);

  return (
    <ClientComponentsTranslationsProvider
      locale={lang}
      namespaces={i18nNamespaces}
      resources={resources}
    >
      <PaymentsClient />
    </ClientComponentsTranslationsProvider>
  );
};

export default PaymentsPage;

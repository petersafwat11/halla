import React from "react";
import initTranslations from "@/localization/i18n";
import ClientComponentsTranslationsProvider from "@/providers/ClientCompTrans";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import PaymentsClient from "./_components/PaymentsClient";

const i18nNamespaces = ["hostPayments", "table"];

const PaymentsPage = async ({ params }) => {
  const { lang } = await params;
  const { resources } = await initTranslations(lang, i18nNamespaces);

  return (
    <ClientComponentsTranslationsProvider
      locale={lang}
      namespaces={i18nNamespaces}
      resources={resources}
    >
      <ErrorBoundary>
        <PaymentsClient />
      </ErrorBoundary>
    </ClientComponentsTranslationsProvider>
  );
};

export default PaymentsPage;

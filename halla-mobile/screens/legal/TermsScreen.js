import React from "react";
import { useTranslation } from "../../localization";
import LegalScreen from "./LegalScreen";
import termsData from "./data/terms.json";

const TermsScreen = () => {
  const { currentLanguage } = useTranslation();
  const data = termsData[currentLanguage] || termsData.ar;

  return <LegalScreen data={data} />;
};

export default TermsScreen;

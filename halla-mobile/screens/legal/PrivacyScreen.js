import React from "react";
import { useTranslation } from "../../localization";
import LegalScreen from "./LegalScreen";
import privacyData from "./data/privacy.json";

const PrivacyScreen = () => {
  const { currentLanguage } = useTranslation();
  const data = privacyData[currentLanguage] || privacyData.ar;

  return <LegalScreen data={data} />;
};

export default PrivacyScreen;

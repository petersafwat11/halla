import React from "react";
import { useTranslation } from "../../localization";
import { getLegalDocument } from "@halaa/shared/legal";
import LegalScreen from "./LegalScreen";

const PrivacyScreen = () => {
  const { currentLanguage } = useTranslation();
  const data = getLegalDocument("privacy", currentLanguage);

  return <LegalScreen data={data} />;
};

export default PrivacyScreen;

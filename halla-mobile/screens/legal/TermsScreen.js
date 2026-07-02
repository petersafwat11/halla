import React from "react";
import { useTranslation } from "../../localization";
import { getLegalDocument } from "@halla/shared/legal";
import LegalScreen from "./LegalScreen";

const TermsScreen = () => {
  const { currentLanguage } = useTranslation();
  const data = getLegalDocument("terms", currentLanguage);

  return <LegalScreen data={data} />;
};

export default TermsScreen;

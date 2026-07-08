import React from "react";
import { useTranslation } from "../../localization";
import { getLegalDocument } from "@halaa/shared/legal";
import LegalScreen from "./LegalScreen";

const SupportScreen = () => {
  const { currentLanguage } = useTranslation();
  const data = getLegalDocument("support", currentLanguage);

  return <LegalScreen data={data} />;
};

export default SupportScreen;

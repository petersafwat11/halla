import React from "react";
import { useTranslation } from "../../localization";
import { getLegalDocument } from "@halaa/shared/legal";
import LegalScreen from "./LegalScreen";

const CommunityRulesScreen = () => {
  const { currentLanguage } = useTranslation();
  const data = getLegalDocument("community-rules", currentLanguage);

  return <LegalScreen data={data} />;
};

export default CommunityRulesScreen;

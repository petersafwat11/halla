import React from "react";
import { useTranslation } from "../../localization";
import { getLegalDocument } from "@halaa/shared/legal";
import LegalScreen from "./LegalScreen";

const DeletionScreen = () => {
  const { currentLanguage } = useTranslation();
  const data = getLegalDocument("deletion", currentLanguage);

  return <LegalScreen data={data} />;
};

export default DeletionScreen;

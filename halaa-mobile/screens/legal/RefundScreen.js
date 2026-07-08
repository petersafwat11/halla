import React from "react";
import { useTranslation } from "../../localization";
import { getLegalDocument } from "@halla/shared/legal";
import LegalScreen from "./LegalScreen";

const RefundScreen = () => {
  const { currentLanguage } = useTranslation();
  const data = getLegalDocument("refund", currentLanguage);

  return <LegalScreen data={data} />;
};

export default RefundScreen;

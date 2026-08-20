/**
 * PurchaseLegalLinks — legal links for the purchase surface.
 * Reuses the shared LegalLinks primitive with purchase documents.
 */

import React from "react";
import LegalLinks from "../legal/LegalLinks";
import { spacing } from "../../styles/tokens";

const PURCHASE_DOCS = ["terms", "privacy", "refund", "support"];

const PurchaseLegalLinks = ({ t, lang = "ar" }) => {
  return (
    <LegalLinks
      docTypes={PURCHASE_DOCS}
      lang={lang}
      style={{ marginTop: spacing[8] }}
    />
  );
};

export default PurchaseLegalLinks;

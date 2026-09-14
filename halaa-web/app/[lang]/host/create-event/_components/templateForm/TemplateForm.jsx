"use client";

import React, { useMemo } from "react";
import DynamicTemplateForm from "./DynamicTemplateForm";
import { withTemplateTextLimits } from "@halaa/shared/utils/templateTextLimits";

export default function TemplateForm(props) {
  const template = useMemo(
    () =>
      withTemplateTextLimits({
        ...props.template,
        fields: props.template?.fields || [],
      }),
    [props.template],
  );
  // Zero-field templates still need a preview and a Save action to bake their asset.
  if (!props.isOpen) return null;
  if (!props.template) return null;
  return <DynamicTemplateForm {...props} template={template} />;
}

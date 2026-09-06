"use client";

import React from "react";
import DynamicTemplateForm from "./DynamicTemplateForm";

export default function TemplateForm(props) {
  // Zero-field templates still need a preview and a Save action to bake their asset.
  if (!props.isOpen) return null;
  if (!props.template) return null;
  return <DynamicTemplateForm {...props} template={{ ...props.template, fields: props.template.fields || [] }} />;
}

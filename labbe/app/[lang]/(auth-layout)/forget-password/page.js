"use client";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import ForgetPassword from "@/ui/auth/forget-password/ForgetPassword";
import { forgotPasswordSchema } from "@halla/shared/schemas/auth";

const ForgetPasswordPage = () => {
  const { t } = useTranslation("forgetPassword");

  const methods = useForm({
    resolver: zodResolver(forgotPasswordSchema(t)),
    defaultValues: {
      email: "",
    },
  });

  return (
    <FormProvider {...methods}>
      <ForgetPassword />
    </FormProvider>
  );
};

export default ForgetPasswordPage;

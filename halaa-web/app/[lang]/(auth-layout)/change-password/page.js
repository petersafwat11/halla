"use client";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import ChangePassword from "@/ui/auth/change-password/ChangePassword";
import { resetPasswordSchema } from "@halaa/shared/schemas/auth";

const ChangePasswordPage = () => {
  const { t } = useTranslation("changePassword");

  const methods = useForm({
    resolver: zodResolver(resetPasswordSchema(t)),
    mode: "onBlur",
    defaultValues: {
      password: "",
      passwordConfirm: "",
    },
  });

  return (
    <FormProvider {...methods}>
      <ChangePassword />
    </FormProvider>
  );
};

export default ChangePasswordPage;

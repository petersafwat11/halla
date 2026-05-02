"use client";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import ChangePassword from "@/ui/auth/change-password/ChangePassword";
import { resetPasswordSchema } from "@/utils/schemas/authSchema";

const ChangePasswordPage = () => {
  const { t } = useTranslation("changePassword");

  const methods = useForm({
    resolver: zodResolver(resetPasswordSchema(t)),
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

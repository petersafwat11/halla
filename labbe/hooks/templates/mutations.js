"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { templatesService } from "@/services/templatesService";
import { templatesKeys, templateCategoriesKeys } from "./keys";

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => templatesService.adminCreateTemplate(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: templatesKeys.all }),
  });
}

export function useUpdateTemplate(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => templatesService.adminUpdateTemplate(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: templatesKeys.all });
      if (id) qc.invalidateQueries({ queryKey: templatesKeys.detail(id) });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => templatesService.adminDeleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: templatesKeys.all }),
  });
}

export function useDuplicateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => templatesService.adminDuplicateTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: templatesKeys.all }),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => templatesService.adminCreateCategory(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateCategoriesKeys.all }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => templatesService.adminUpdateCategory(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateCategoriesKeys.all }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => templatesService.adminDeleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateCategoriesKeys.all }),
  });
}

"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { templatesService } from "@/services/templatesService";
import { TEMPLATES_QK } from "@/hooks/queries/useTemplates";

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => templatesService.adminCreateTemplate(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useUpdateTemplate(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => templatesService.adminUpdateTemplate(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      if (id) qc.invalidateQueries({ queryKey: TEMPLATES_QK.byId(id) });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => templatesService.adminDeleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useDuplicateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => templatesService.adminDuplicateTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => templatesService.adminCreateCategory(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["template-categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => templatesService.adminUpdateCategory(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["template-categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => templatesService.adminDeleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["template-categories"] }),
  });
}

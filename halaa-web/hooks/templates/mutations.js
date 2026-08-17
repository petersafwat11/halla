"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { templatesKeys, templateCategoriesKeys } from "./keys";

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.templates.adminCreate,
        data: body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: templatesKeys.all }),
  });
}

export function useUpdateTemplate(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      apiRequest({
        method: "PUT",
        path: API_PATHS.templates.adminUpdate(id),
        data: body,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: templatesKeys.all });
      if (id) qc.invalidateQueries({ queryKey: templatesKeys.detail(id) });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiRequest({
        method: "DELETE",
        path: API_PATHS.templates.adminDelete(id),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: templatesKeys.all }),
  });
}

export function useDuplicateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.templates.adminDuplicate(id),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: templatesKeys.all }),
  });
}

/**
 * Upload a template image. Backend proxies to S3 to avoid browser→S3 CORS.
 * Returns `{ s3Key }`. Optional `onProgress` callback (0–100).
 */
export function useAdminUploadTemplateImage() {
  return useMutation({
    mutationFn: async ({ file, templateId = "new", onProgress } = {}) => {
      const formData = new FormData();
      formData.append("image", file);

      const result = await apiRequest({
        method: "POST",
        path: `${API_PATHS.templates.adminUploadImage}?templateId=${encodeURIComponent(
          templateId,
        )}`,
        data: formData,
        config: {
          headers: { "Content-Type": undefined },
          ...(typeof onProgress === "function" && {
            onUploadProgress: (e) => {
              if (e.total) onProgress(Math.round((e.loaded / e.total) * 100));
            },
          }),
        },
      });

      const { s3Key } = result?.data || result;
      return { s3Key };
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.templates.adminCreateCategory,
        data: body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateCategoriesKeys.all }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) =>
      apiRequest({
        method: "PUT",
        path: API_PATHS.templates.adminUpdateCategory(id),
        data: body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateCategoriesKeys.all }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiRequest({
        method: "DELETE",
        path: API_PATHS.templates.adminDeleteCategory(id),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateCategoriesKeys.all }),
  });
}

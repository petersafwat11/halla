import { API_BASE_URL } from "../config/api";

export function resolveMediaUri(value) {
  if (!value) return null;
  if (typeof value === "object" && value.uri) return value.uri;
  if (typeof value !== "string") return null;
  if (/^(https?:|file:|blob:|data:)/i.test(value)) return value;

  const base = (API_BASE_URL || "")
    .replace(/\/api\/v\d+$/, "")
    .replace(/\/api$/, "");
  return `${base}/${value.replace(/^\//, "")}`;
}

export default resolveMediaUri;

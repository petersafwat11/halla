import { API_BASE_URL } from "../config/api";

const API_HOST = API_BASE_URL.replace(/\/api\/v2\/?$/, "").replace(/\/api\/?$/, "");

export const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith("http")) return image;

  if (image.includes("\\") || /^[A-Z]:/i.test(image)) {
    const uploadsMatch = image.match(/uploads[\\/](.+)$/);
    if (uploadsMatch) {
      return `${API_HOST}/uploads/${uploadsMatch[1].replace(/\\/g, "/")}`;
    }
    const publicMatch = image.match(/public[\\/]uploads[\\/](.+)$/);
    if (publicMatch) {
      return `${API_HOST}/uploads/${publicMatch[1].replace(/\\/g, "/")}`;
    }
  }

  if (image.startsWith("/uploads")) return `${API_HOST}${image}`;

  const cleanPath = image.startsWith("/") ? image.slice(1) : image;
  return `${API_HOST}/${cleanPath}`;
};

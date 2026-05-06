const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
  "https://labbe-backend-production.up.railway.app";

export const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  if (image.startsWith("/uploads")) return `${API_BASE}${image}`;
  return null;
};

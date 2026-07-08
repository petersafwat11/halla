const apiBase = process.env.INTERNAL_API_URL || "http://localhost:8000/api/v2";

export async function getPublicVendor(vendorId, lang = "ar") {
  const response = await fetch(
    `${apiBase}/vendors/public/${vendorId}?lang=${lang}`,
    { cache: "no-store" }
  );

  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to load vendor");

  const payload = await response.json();
  return payload?.data?.vendor || null;
}

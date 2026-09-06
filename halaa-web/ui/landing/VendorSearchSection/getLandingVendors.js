import "server-only";

const apiBase = (process.env.INTERNAL_API_URL || "http://localhost:8000/api/v2").replace(/\/$/, "");

async function fetchPublicJson(path, revalidate) {
  const response = await fetch(`${apiBase}${path}`, {
    next: { revalidate },
    signal: AbortSignal.timeout(2500),
  });

  if (!response.ok) {
    throw new Error(`Public marketplace request failed with ${response.status}`);
  }

  return response.json();
}

export function mapVendorForCard(vendor, categoryLabels, lang) {
  const locationData = vendor.location || vendor.serviceLocation;
  const city = lang === "ar" ? locationData?.cityNameAr : locationData?.cityNameEn;
  const region = lang === "ar" ? locationData?.regionNameAr : locationData?.regionNameEn;

  return {
    id: vendor.id || vendor._id,
    brandName: vendor.brandName,
    tagline: vendor.tagline,
    shortDescription: vendor.shortDescription,
    logo: vendor.logo,
    presentationImage: vendor.presentationImage,
    coverImage: vendor.coverImage,
    categories: (vendor.categories || vendor.serviceCategories || []).map(
      (key) => categoryLabels.get(key) || key
    ),
    location: [city, region].filter(Boolean).join(lang === "ar" ? "، " : ", "),
    startingPrice:
      (vendor.startingPrice ? { amount: vendor.startingPrice.amount, currency: vendor.startingPrice.currency || 'SAR' } : null) ||
      (vendor.minPrice != null
        ? { amount: vendor.minPrice, currency: vendor.currency || "SAR" }
        : null),
  };
}

export async function getLandingVendors(lang = "ar") {
  try {
    const vendorsPromise = fetchPublicJson(
      `/vendors/public?${new URLSearchParams({ lang, page: "1", limit: "3" })}`,
      300
    );
    const categoriesPromise = fetchPublicJson("/vendors/categories", 3600).catch(() => null);
    const [vendorsPayload, categoriesPayload] = await Promise.all([
      vendorsPromise,
      categoriesPromise,
    ]);

    const vendors = Array.isArray(vendorsPayload?.data) ? vendorsPayload.data : [];
    const categories = categoriesPayload?.data?.categories || [];
    const categoryLabels = new Map(
      categories.map((category) => [
        category.key,
        lang === "ar" ? category.nameAr : category.nameEn,
      ])
    );

    return vendors.map((vendor) => mapVendorForCard(vendor, categoryLabels, lang));
  } catch {
    // The landing page must remain available if the marketplace API is briefly unavailable.
    // Rendering no cards is safer than restoring fabricated fallback vendors.
    return [];
  }
}

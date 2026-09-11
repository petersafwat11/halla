import { addonCatalogCode, resolvePurchasable } from "./catalog.js";

/**
 * Resolve every selected native checkout item before the first store sheet.
 * A cart is atomic from the user's perspective: if any add-on is unavailable,
 * no item should be purchased yet.
 */
export const resolveNativeCheckoutAddons = (
  addonItems = [],
  catalogEntries = [],
  offerings = {},
) => {
  const items = addonItems.map((addon) => {
    const catalogCode = addonCatalogCode(addon);
    const purchasable = catalogCode
      ? resolvePurchasable(catalogEntries, offerings, catalogCode)
      : null;
    return { addon, catalogCode, purchasable };
  });

  return {
    items,
    unavailable: items.find(
      (item) => !item.catalogCode || !item.purchasable?.available,
    ) || null,
  };
};

export const purchaseChangeInfoForItem = (item, changeInfo) =>
  item?.kind === "plan" ? changeInfo : null;

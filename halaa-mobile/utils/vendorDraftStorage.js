import AsyncStorage from "@react-native-async-storage/async-storage";

import { createVendorDraftPayload } from "./vendorDraftPayload";

export { createVendorDraftPayload } from "./vendorDraftPayload";

const DRAFT_STORAGE_KEY = "@halaa_vendor_signup_draft_v1";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const getDraftStorageKey = (locale) => `${DRAFT_STORAGE_KEY}_${locale === "en" ? "en" : "ar"}`;

export const saveVendorDraft = async (formValues, locale = "ar") => {
  if (!formValues) return;

  try {
    const draftPayload = createVendorDraftPayload(formValues, locale);

    await AsyncStorage.setItem(getDraftStorageKey(locale), JSON.stringify(draftPayload));
  } catch (err) {
    // Ignore storage errors
  }
};

export const loadVendorDraft = async (locale = "ar") => {
  try {
    const raw = await AsyncStorage.getItem(getDraftStorageKey(locale));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) {
      await clearVendorDraft(locale);
      return null;
    }

    if (Date.now() - parsed.timestamp > DRAFT_TTL_MS) {
      await clearVendorDraft(locale);
      return null;
    }

    return parsed.data;
  } catch (err) {
    return null;
  }
};

export const clearVendorDraft = async (locale) => {
  try {
    if (locale) {
      await AsyncStorage.removeItem(getDraftStorageKey(locale));
    } else {
      await AsyncStorage.multiRemove([
        getDraftStorageKey("ar"),
        getDraftStorageKey("en"),
        DRAFT_STORAGE_KEY,
      ]);
    }
  } catch (err) {
    // Ignore
  }
};

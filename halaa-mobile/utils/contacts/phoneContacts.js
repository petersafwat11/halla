/**
 * Native phone-contact import via expo-contacts.
 *
 * This is the *real* device-address-book import (the heart of the original
 * client request) — possible only in the native app, not on the web.
 *
 * Requires `expo-contacts` (run `npx expo install expo-contacts`) + the
 * config plugin in app.json, then rebuild the dev client (contacts is a
 * native module — Expo Go won't pick up the new permission).
 *
 * Privacy: we read name + phone only, never upload the full phonebook, and
 * only the contacts the host explicitly selects become guests.
 */
import * as Contacts from "expo-contacts";

/**
 * Normalize an arbitrary phone string to the app's canonical Saudi mobile
 * form (`5xxxxxxxx`, 9 digits). Returns null when it isn't a Saudi mobile.
 * Identical to the web util so both platforms dedupe consistently.
 */
export const normalizeSaudiMobile = (raw) => {
  if (!raw) return null;
  let d = String(raw).replace(/[^\d+]/g, "");
  d = d.replace(/^\+/, "");
  if (d.startsWith("00966")) d = d.slice(5);
  else if (d.startsWith("966")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return /^5\d{8}$/.test(d) ? d : null;
};

export const isContactsAvailable = () =>
  !!Contacts && typeof Contacts.requestPermissionsAsync === "function";

/**
 * Request contacts permission. Returns the status string
 * ('granted' | 'denied' | 'undetermined').
 */
export const requestContactsPermission = async () => {
  const { status } = await Contacts.requestPermissionsAsync();
  return status;
};

/**
 * Load device contacts mapped to `{ id, name, phones: string[] }` where each
 * phone is a normalized Saudi mobile. Contacts without a valid Saudi mobile
 * are dropped. Extracts name + phone numbers only.
 */
export const loadDeviceContacts = async () => {
  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
  });

  return (data || [])
    .map((c, i) => {
      const phones = Array.from(
        new Set(
          (c.phoneNumbers || [])
            .map((p) => normalizeSaudiMobile(p.number || p.digits))
            .filter(Boolean)
        )
      );
      return {
        id: c.id || `contact_${i}`,
        name: (c.name || "").trim(),
        phones,
      };
    })
    .filter((c) => c.name && c.phones.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
};

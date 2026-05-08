// Icon-only mapping for host-plan features. Labels are now i18n keys
// resolved as `plans:features.{key}.label` — keep this table aligned with
// the locale entries when adding/removing keys.
export const FEATURE_MAP = {
  hasInAppInvites:        { icon: "phone-portrait-outline" },
  hasWhatsAppInvites:     { icon: "logo-whatsapp" },
  hasSMSInvites:          { icon: "chatbox-outline" },
  hasQRCode:              { icon: "qr-code-outline" },
  hasQRScanning:          { icon: "scan-outline" },
  hasFlexibleEntryMode:   { icon: "options-outline" },
  hasStaffCheckIn:        { icon: "people-outline" },
  hasStaffAssignment:     { icon: "shield-outline" },
  hasRSVPTracking:        { icon: "chatbubbles-outline" },
  hasAutoReminders:       { icon: "notifications-outline" },
  hasEmailNotifications:  { icon: "mail-outline" },
  hasCompensationInvites: { icon: "gift-outline" },
  hasBasicTemplates:      { icon: "calendar-outline" },
};

export const FEATURE_KEYS = Object.keys(FEATURE_MAP);

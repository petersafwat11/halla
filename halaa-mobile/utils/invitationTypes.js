/**
 * Invitation types for create-event Step 4 (mobile).
 *
 * Mirror of `halaa-web/utils/invitationTypes.js` and the backend enum in
 * `halaa-backend/src/shared/constants/status.js` (INVITATION_TYPE). Keep the
 * string values in sync across web / mobile / backend.
 *
 * One enum encodes two dimensions: whether guests can reply
 * (confirm/decline) and whether confirmation sends a QR entry code.
 */
export const INVITATION_TYPES = {
  REPLY_AND_QR: "reply_and_qr", // 01 — reply buttons + QR
  REPLY_ONLY: "reply_only", // 02 — reply buttons, no QR
  NONE: "none", // 03 — plain invitation
};

// The value a fresh create-event form starts on (also the backend schema
// default). Every event carries an explicit type; helpers below are strict.
export const DEFAULT_INVITATION_TYPE = INVITATION_TYPES.REPLY_AND_QR;

export const invitationAllowsReply = (type) =>
  type === INVITATION_TYPES.REPLY_AND_QR || type === INVITATION_TYPES.REPLY_ONLY;

export const invitationIncludesQr = (type) =>
  type === INVITATION_TYPES.REPLY_AND_QR;

/**
 * Ordered options for the Step-4 selector, matching the client's 4-card image
 * (01 → 04). `reply` / `qr` drive the ✓ / ✗ / QR icons on each card; the
 * i18n label + description keys resolve at render time.
 */
export const INVITATION_TYPE_OPTIONS = [
  {
    id: "01",
    value: INVITATION_TYPES.REPLY_AND_QR,
    reply: true,
    qr: true,
    iconName: "qr-code-outline",
    badgeKey: "invitation_type_badge_qr",
    labelKey: "invitation_type_reply_and_qr_label",
    descKey: "invitation_type_reply_and_qr_desc",
    features: [
      { key: "rsvp", labelKey: "invitation_feat_rsvp", fallback: "أزرار الرد", included: true },
      { key: "qr", labelKey: "invitation_feat_qr", fallback: "رمز دخول QR", included: true },
      { key: "auto_reply", labelKey: "invitation_feat_auto_reply", fallback: "رسائل متابعة", included: true },
    ],
  },
  {
    id: "02",
    value: INVITATION_TYPES.REPLY_ONLY,
    reply: true,
    qr: false,
    iconName: "chatbubbles-outline",
    labelKey: "invitation_type_reply_only_label",
    descKey: "invitation_type_reply_only_desc",
    features: [
      { key: "rsvp", labelKey: "invitation_feat_rsvp", fallback: "أزرار الرد", included: true },
      { key: "auto_reply", labelKey: "invitation_feat_auto_reply", fallback: "رسائل متابعة", included: true },
      { key: "no_qr", labelKey: "invitation_feat_no_qr", fallback: "بدون رمز دخول", included: false },
    ],
  },
  {
    id: "03",
    value: INVITATION_TYPES.NONE,
    reply: false,
    qr: false,
    iconName: "mail-outline",
    labelKey: "invitation_type_none_label",
    descKey: "invitation_type_none_desc",
    features: [
      { key: "direct", labelKey: "invitation_feat_direct", fallback: "إرسال مباشر", included: true },
      { key: "no_buttons", labelKey: "invitation_feat_no_buttons", fallback: "بدون أزرار", included: false },
    ],
  },
];

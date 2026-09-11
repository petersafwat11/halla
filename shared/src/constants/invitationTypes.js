/** Shared mode metadata for web, mobile, and the public landing section. */
export const INVITATION_TYPES = { REPLY_AND_QR: 'reply_and_qr', REPLY_ONLY: 'reply_only', NONE: 'none' };
export const DEFAULT_INVITATION_TYPE = INVITATION_TYPES.REPLY_AND_QR;
export const invitationAllowsReply = type => type === INVITATION_TYPES.REPLY_AND_QR || type === INVITATION_TYPES.REPLY_ONLY;
export const invitationIncludesQr = type => type === INVITATION_TYPES.REPLY_AND_QR;
export const INVITATION_TYPE_OPTIONS = [
  { id: '01', value: 'reply_and_qr', reply: true, qr: true, iconName: 'qr-code-outline', badgeKey: 'invitation_type_badge_qr', labelKey: 'invitation_type_reply_and_qr_label', descKey: 'invitation_type_reply_and_qr_desc' },
  { id: '02', value: 'reply_only', reply: true, qr: false, iconName: 'chatbubbles-outline', labelKey: 'invitation_type_reply_only_label', descKey: 'invitation_type_reply_only_desc' },
  { id: '03', value: 'none', reply: false, qr: false, iconName: 'mail-outline', labelKey: 'invitation_type_none_label', descKey: 'invitation_type_none_desc' },
];

const COPY = {
  ar: {
    reply_and_qr: { title: 'تأكيد الحضور مع رمز دخول', description: 'زرا تأكيد واعتذار. عند التأكيد يصل رمز QR مع ردك وتفاصيل المناسبة.' },
    reply_only: { title: 'تأكيد الحضور برسالة', description: 'زرا تأكيد واعتذار. عند التأكيد يصل نص ردك فقط، دون رمز دخول أو تفاصيل إضافية.' },
    none: { title: 'دعوة فقط', description: 'تصل رسالة الدعوة دون أزرار تأكيد أو اعتذار، ودون رمز دخول أو رد تلقائي.' },
    business: {
      reply_and_qr: { title: 'تأكيد الحضور مع رمز دخول', description: 'يؤكد الضيف أو يعتذر في موقع الدعوة. يظهر ردك ورمز الدخول بعد التأكيد؛ لا يُرسل رد واتساب تلقائي.' },
      reply_only: { title: 'تأكيد الحضور برسالة', description: 'يؤكد الضيف أو يعتذر في موقع الدعوة ويظهر ردك دون رمز دخول؛ لا يُرسل رد واتساب تلقائي.' },
      none: { title: 'دعوة فقط', description: 'رابط لعرض الدعوة وتفاصيل المناسبة دون تأكيد أو اعتذار، ودون رمز دخول أو رد تلقائي.' },
    },
  },
  en: {
    reply_and_qr: { title: 'RSVP with entry pass', description: 'Confirm and decline buttons. Confirmation sends a QR image with your reply and event details.' },
    reply_only: { title: 'RSVP with a message', description: 'Confirm and decline buttons. Confirmation sends only your reply text, without a QR code or added details.' },
    none: { title: 'Invitation only', description: 'An invitation without confirm or decline buttons, an entry pass, or an automatic reply.' },
    business: {
      reply_and_qr: { title: 'RSVP with entry pass', description: 'Guests respond on the invitation website. Your reply and entry pass appear after confirmation; no WhatsApp auto-reply is sent.' },
      reply_only: { title: 'RSVP with a message', description: 'Guests respond on the invitation website and see your reply without an entry pass; no WhatsApp auto-reply is sent.' },
      none: { title: 'Invitation only', description: 'A link to view the invitation and event details, without RSVP, an entry pass, or an automatic reply.' },
    },
  },
};
export function getInvitationTypeCopy(type, lang = 'ar', business = false) {
  const copy = COPY[String(lang).startsWith('en') ? 'en' : 'ar'];
  return (business ? copy.business : copy)[type] || copy.none;
}

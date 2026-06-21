/**
 * Canonical precision template specifications.
 *
 * Content rules:
 * - Date / Time / Venue exist on every card in one RTL visual row:
 *   Date (right), Time (centre), Venue (left), icon above value.
 * - Shared concepts always use the same key from _templateCardVocab.
 * - Bespoke fixed artwork already present in a source image is not overlaid.
 * - Bride and groom overlays are side-by-side whenever both are present.
 */

const { field, styleTail } = require("./_templateCardVocab");

const AMIRI = "var(--font-amiri), 'Amiri', serif";
const CAIRO = "var(--font-cairo), 'Cairo', sans-serif";

const ov = (fieldKey, topPct, leftPct, widthPct, fontSizeVh, fontWeight, opts = {}) => ({
  fieldKey,
  topPct,
  leftPct,
  widthPct,
  fontSizeVh,
  fontWeight,
  lineHeight: opts.lineHeight ?? 1.35,
  maxLines: opts.maxLines ?? 1,
  textAlign: opts.textAlign || "center",
  colorBinding: opts.colorBinding || "primary",
  ...(opts.color ? { color: opts.color } : {}),
  fontFamily: opts.fontFamily || AMIRI,
  zIndex: opts.zIndex ?? 2,
});

const dec = (source, color, topPct, leftPct, widthPct = 4, iconSizeVh = 2.7) => ({
  type: "icon",
  source,
  color,
  topPct,
  leftPct,
  widthPct,
  iconSizeVh,
  zIndex: 1,
});

const META_FIELDS = () => [
  field("eventDate", { required: true }),
  field("eventTime", { required: true }),
  field("venue", { required: true }),
];

function meta(rowTop, color, opts = {}) {
  const valueTop = rowTop + (opts.gap ?? 4.5);
  const custom = opts.custom
    ? { colorBinding: "custom", color }
    : {};
  const fontFamily = opts.fontFamily || CAIRO;
  return {
    overlays: [
      ov("eventDate", valueTop, 72, 23, opts.fontSize ?? 1.8, "500", { ...custom, fontFamily, maxLines: 2, lineHeight: 1.2 }),
      ov("eventTime", valueTop, 50, 18, opts.fontSize ?? 1.8, "500", { ...custom, fontFamily, maxLines: 2, lineHeight: 1.2 }),
      ov("venue", valueTop, 28, 24, opts.fontSize ?? 1.8, "500", { ...custom, fontFamily, maxLines: 2, lineHeight: 1.2 }),
    ],
    decorations: [
      dec("CalendarDays", color, rowTop, 72, 4, opts.iconSize ?? 2.6),
      dec("Clock", color, rowTop, 50, 4, opts.iconSize ?? 2.6),
      dec("MapPin", color, rowTop, 28, 4, opts.iconSize ?? 2.6),
    ],
  };
}

function template({ file, polished, nameEn, nameAr, categories, sortOrder, fields, overlays, decorations, metaRow }) {
  const m = meta(metaRow.top, metaRow.color, metaRow);
  return {
    file,
    polished,
    nameEn,
    nameAr,
    categories,
    sortOrder,
    fields: [...fields, ...META_FIELDS(), ...styleTail()],
    overlays: [...overlays, ...m.overlays],
    decorations: [...(decorations || []), ...m.decorations],
  };
}

const GOLD = { colorBinding: "custom", color: "#e8c04f", fontFamily: AMIRI };
const NAVY_GOLD = { colorBinding: "custom", color: "#ead9ab", fontFamily: AMIRI };

const TEMPLATES = [
  template({
    file: "marriage.jpg", polished: "1.png", nameEn: "Royal Groom", nameAr: "دعوة زفاف ملكية",
    categories: ["wedding"], sortOrder: 10,
    fields: [field("invitationTitle"), field("invitationMessage", { maxLength: 150 }), field("eventNote"), field("mealNote"), field("closingMessage")],
    overlays: [
      ov("invitationTitle", 34, 50, 42, 6.2, "700", { ...GOLD, maxLines: 1 }),
      ov("invitationMessage", 46, 50, 66, 2.2, "400", { colorBinding: "custom", color: "#f3e7df", maxLines: 3, lineHeight: 1.45 }),
      ov("eventNote", 55, 50, 74, 2.5, "600", { ...GOLD }),
      ov("mealNote", 61, 50, 65, 2.0, "400", { colorBinding: "custom", color: "#f3e7df" }),
      ov("closingMessage", 79, 50, 72, 4.2, "700", { ...GOLD, maxLines: 2, lineHeight: 1.15 }),
    ],
    metaRow: { top: 66, color: "#e8c04f", custom: true },
  }),

  template({
    file: "wedding_white_dawah.jpg", polished: "2.png", nameEn: "Pearl Da'wah Wedding", nameAr: "دعوة زفاف لؤلؤية",
    categories: ["wedding"], sortOrder: 20,
    fields: [field("openingVerse"), field("invitationMessage", { maxLength: 150 }), field("hostName"), field("eventNote"), field("groomName", { required: true }), field("closingMessage")],
    overlays: [
      ov("openingVerse", 27, 50, 68, 3.0, "700", { maxLines: 1 }),
      ov("invitationMessage", 38, 50, 76, 2.1, "400", { maxLines: 3, lineHeight: 1.45 }),
      ov("hostName", 49, 50, 66, 2.8, "600"),
      ov("eventNote", 54, 50, 66, 2.0, "400"),
      ov("groomName", 64, 50, 62, 5.6, "700"),
      ov("closingMessage", 72, 50, 62, 2.0, "400"),
    ],
    metaRow: { top: 80, color: "#274866" },
  }),

  template({
    file: "wedding_navy_dawah.jpg", polished: "3.png", nameEn: "Royal Da'wah Wedding", nameAr: "دعوة الفرح الملكي",
    categories: ["wedding"], sortOrder: 21,
    fields: [field("openingVerse"), field("invitationMessage", { maxLength: 150 }), field("hostName"), field("eventNote"), field("groomName", { required: true }), field("closingMessage")],
    overlays: [
      ov("openingVerse", 27, 50, 68, 3.0, "700", { ...NAVY_GOLD }),
      ov("invitationMessage", 38, 50, 76, 2.1, "400", { ...NAVY_GOLD, maxLines: 3, lineHeight: 1.45 }),
      ov("hostName", 49, 50, 66, 2.8, "600", { ...NAVY_GOLD }),
      ov("eventNote", 54, 50, 66, 2.0, "400", { ...NAVY_GOLD }),
      ov("groomName", 64, 50, 62, 5.6, "700", { ...NAVY_GOLD }),
      ov("closingMessage", 72, 50, 62, 2.0, "400", { ...NAVY_GOLD }),
    ],
    metaRow: { top: 80, color: "#ead9ab", custom: true },
  }),

  template({
    file: "wedding_gulf_groom.jpg", polished: "4.png", nameEn: "Gulf Groom", nameAr: "زفاف الخليج",
    categories: ["wedding"], sortOrder: 22,
    fields: [field("invitationTitle"), field("invitationMessage", { maxLength: 120 }), field("eventNote"), field("hostName"), field("closingMessage")],
    overlays: [
      ov("invitationTitle", 38, 50, 46, 5.8, "700", { color: "#c79a2b", colorBinding: "custom" }),
      ov("invitationMessage", 52, 50, 74, 2.2, "400", { fontFamily: CAIRO, maxLines: 2 }),
      ov("eventNote", 69, 50, 70, 2.0, "400", { fontFamily: CAIRO }),
      ov("hostName", 74, 50, 68, 2.2, "700", { colorBinding: "custom", color: "#17120e", fontFamily: CAIRO }),
      ov("closingMessage", 82, 50, 74, 3.4, "700"),
    ],
    metaRow: { top: 59, color: "#9a7627" },
  }),

  template({
    file: "blessed_births.jpg", polished: "5.png", nameEn: "Rose Garden Wedding", nameAr: "زفاف الحديقة الوردية",
    categories: ["wedding"], sortOrder: 23,
    fields: [field("invitationTitle"), field("invitationMessage", { maxLength: 110 }), field("eventNote"), field("groomName", { required: true }), field("closingMessage"), field("attendanceNote")],
    overlays: [
      ov("invitationTitle", 13, 50, 28, 5.0, "700", { colorBinding: "custom", color: "#df8f9c" }),
      ov("invitationMessage", 26, 50, 70, 2.1, "400", { fontFamily: CAIRO, maxLines: 2 }),
      ov("eventNote", 36, 50, 70, 2.1, "400", { fontFamily: CAIRO, maxLines: 2 }),
      ov("groomName", 48, 50, 56, 5.8, "700", { colorBinding: "custom", color: "#df8f9c" }),
      ov("closingMessage", 57, 50, 66, 2.0, "400", { fontFamily: CAIRO }),
      ov("attendanceNote", 87, 50, 55, 2.0, "400", { fontFamily: CAIRO }),
    ],
    metaRow: { top: 65, color: "#df8f9c" },
  }),

  template({
    file: "woman_invitation.jpg", polished: "6.png", nameEn: "Burgundy Bloom Wedding", nameAr: "زفاف الورد الأرجواني",
    categories: ["wedding", "ladies_event"], sortOrder: 24,
    fields: [field("invitationTitle"), field("openingVerse"), field("invitationMessage", { maxLength: 110 }), field("groomName", { required: true }), field("brideName", { required: true }), field("closingMessage")],
    overlays: [
      ov("invitationTitle", 8, 50, 42, 4.0, "700", { colorBinding: "custom", color: "#75805d" }),
      ov("openingVerse", 17, 50, 76, 2.5, "600", { colorBinding: "custom", color: "#8f171d", maxLines: 2 }),
      ov("invitationMessage", 29, 50, 70, 2.1, "400", { colorBinding: "custom", color: "#75805d", maxLines: 3 }),
      ov("groomName", 43, 68, 31, 5.0, "700", { colorBinding: "custom", color: "#8f171d" }),
      ov("brideName", 43, 32, 31, 5.0, "700", { colorBinding: "custom", color: "#8f171d" }),
      ov("closingMessage", 72, 50, 70, 3.0, "700", { colorBinding: "custom", color: "#8f171d" }),
    ],
    metaRow: { top: 54, color: "#75805d" },
  }),

  template({
    file: "marriage2.jpg", polished: "7.png", nameEn: "Floral Arch Wedding", nameAr: "زفاف قوس الزهور",
    categories: ["wedding"], sortOrder: 25,
    fields: [field("invitationTitle"), field("invitationMessage", { maxLength: 100 }), field("eventNote"), field("brideName", { required: true }), field("closingMessage")],
    overlays: [
      ov("invitationTitle", 13, 50, 28, 4.2, "700", { colorBinding: "custom", color: "#d995a0" }),
      ov("invitationMessage", 27, 50, 68, 2.0, "400", { colorBinding: "custom", color: "#718766", fontFamily: CAIRO, maxLines: 2 }),
      ov("eventNote", 35, 50, 64, 2.0, "400", { colorBinding: "custom", color: "#718766", fontFamily: CAIRO }),
      ov("brideName", 44, 50, 56, 5.4, "700", { colorBinding: "custom", color: "#d995a0" }),
      ov("closingMessage", 55, 50, 68, 2.0, "400", { colorBinding: "custom", color: "#718766", fontFamily: CAIRO }),
    ],
    metaRow: { top: 61, color: "#718766" },
  }),

  template({
    file: "engament.jpg", polished: "8.png", nameEn: "Candle Engagement", nameAr: "خطوبة الشموع",
    categories: ["wedding", "engagement"], sortOrder: 30,
    fields: [field("invitationTitle"), field("openingVerse"), field("invitationMessage", { maxLength: 100 }), field("groomName", { required: true }), field("brideName", { required: true }), field("closingMessage"), field("attendanceNote")],
    overlays: [
      ov("invitationTitle", 10, 50, 24, 4.6, "700", { colorBinding: "custom", color: "#d98f9b" }),
      ov("openingVerse", 20, 50, 78, 2.4, "600", { colorBinding: "custom", color: "#7f805e", maxLines: 2 }),
      ov("invitationMessage", 31, 50, 68, 2.1, "400", { fontFamily: CAIRO, maxLines: 2 }),
      ov("groomName", 44, 68, 30, 5.0, "700", { colorBinding: "custom", color: "#d98f9b" }),
      ov("brideName", 44, 32, 30, 5.0, "700", { colorBinding: "custom", color: "#d98f9b" }),
      ov("closingMessage", 55, 50, 68, 2.0, "400", { fontFamily: CAIRO }),
      ov("attendanceNote", 78, 50, 55, 2.0, "400", { fontFamily: CAIRO }),
    ],
    metaRow: { top: 63, color: "#746d5e" },
  }),

  template({
    file: "marriage_contract_arch.jpg", polished: "9.png", nameEn: "Sacred Vows", nameAr: "عقد قران مبارك",
    categories: ["wedding"], sortOrder: 26,
    fields: [field("invitationTitle"), field("invitationMessage", { maxLength: 100 }), field("eventTitle")],
    overlays: [
      ov("invitationTitle", 17, 50, 48, 4.2, "700", { colorBinding: "custom", color: "#5b3826" }),
      ov("invitationMessage", 30, 50, 72, 2.1, "400", { colorBinding: "custom", color: "#5b3826", fontFamily: CAIRO, maxLines: 2 }),
      ov("eventTitle", 48, 50, 62, 7.0, "700", { colorBinding: "custom", color: "#d9a818" }),
    ],
    metaRow: { top: 66, color: "#5b3826" },
  }),

  template({
    file: "general_spring.jpg", polished: "10.png", nameEn: "Eid Al-Adha", nameAr: "عيد الأضحى",
    categories: ["general_event"], sortOrder: 40,
    fields: [field("invitationMessage", { maxLength: 100 }), field("eventNote"), field("eventTitle", { required: true }), field("openingVerse"), field("closingMessage")],
    overlays: [
      ov("invitationMessage", 15, 50, 72, 2.1, "400", { fontFamily: CAIRO, maxLines: 2 }),
      ov("eventNote", 27, 50, 72, 2.1, "400", { fontFamily: CAIRO, maxLines: 2 }),
      ov("eventTitle", 38, 50, 64, 5.8, "700", { colorBinding: "custom", color: "#7e8f72" }),
      ov("openingVerse", 48, 50, 60, 1.9, "400", { fontFamily: CAIRO }),
      ov("closingMessage", 70, 50, 66, 3.6, "700", { colorBinding: "custom", color: "#7e8f72" }),
    ],
    metaRow: { top: 55, color: "#7e8f72" },
  }),

  template({
    file: "general_lantern.jpg", polished: "11.png", nameEn: "Ramadan Iftar", nameAr: "سفرة إفطار رمضان",
    categories: ["general_event"], sortOrder: 41,
    fields: [field("invitationMessage", { maxLength: 100 }), field("eventNote"), field("eventTitle", { required: true }), field("closingMessage")],
    overlays: [
      ov("invitationMessage", 37, 50, 72, 2.1, "400", { fontFamily: CAIRO, maxLines: 2 }),
      ov("eventNote", 46, 50, 72, 2.0, "400", { fontFamily: CAIRO }),
      ov("eventTitle", 55, 50, 68, 5.0, "700", { colorBinding: "custom", color: "#742f25" }),
      ov("closingMessage", 80, 50, 74, 3.0, "600", { colorBinding: "custom", color: "#742f25" }),
    ],
    metaRow: { top: 66, color: "#6e665f" },
  }),

  template({
    file: "birthday.jpg", polished: "12.png", nameEn: "Birthday Party", nameAr: "حفلة عيد ميلاد",
    categories: ["birthday"], sortOrder: 50,
    fields: [field("invitationMessage", { maxLength: 120 }), field("celebrantName", { required: true }), field("eventNote"), field("closingMessage")],
    overlays: [
      ov("invitationMessage", 23, 50, 68, 2.1, "400", { colorBinding: "custom", color: "#c45c68", fontFamily: CAIRO, maxLines: 3 }),
      ov("celebrantName", 39, 50, 66, 5.8, "700", { colorBinding: "custom", color: "#c45c68" }),
      ov("eventNote", 50, 50, 60, 2.0, "400", { colorBinding: "custom", color: "#c45c68", fontFamily: CAIRO }),
      ov("closingMessage", 78, 50, 66, 2.0, "400", { colorBinding: "custom", color: "#c45c68", fontFamily: CAIRO }),
    ],
    metaRow: { top: 60, color: "#c45c68" },
  }),

  template({
    file: "newborn_boy.jpg", polished: "13.png", nameEn: "Newborn Boy", nameAr: "بشارة المولود",
    categories: ["baby_shower"], sortOrder: 60,
    fields: [field("babyInitial"), field("invitationMessage", { maxLength: 100 }), field("eventTitle"), field("babyName", { required: true }), field("eventNote"), field("closingMessage")],
    overlays: [
      ov("babyInitial", 10, 50, 14, 4.0, "500", { colorBinding: "custom", color: "#6f91a4", fontFamily: CAIRO }),
      ov("invitationMessage", 25, 50, 72, 2.0, "500", { colorBinding: "custom", color: "#547487", fontFamily: CAIRO, maxLines: 2 }),
      ov("eventTitle", 33, 50, 32, 3.8, "700", { colorBinding: "custom", color: "#89bdd5", fontFamily: CAIRO }),
      ov("babyName", 43, 50, 60, 6.2, "700", { colorBinding: "custom", color: "#5d8da7" }),
      ov("eventNote", 51, 50, 45, 3.2, "400", { colorBinding: "custom", color: "#8bbbd0", fontFamily: CAIRO }),
      ov("closingMessage", 59, 50, 72, 2.0, "500", { colorBinding: "custom", color: "#547487", fontFamily: CAIRO, maxLines: 2 }),
    ],
    metaRow: { top: 67, color: "#6f91a4" },
  }),

  template({
    file: "newborn_girl.jpg", polished: "14.jpg", nameEn: "Newborn Girl", nameAr: "بشارة الأميرة",
    categories: ["baby_shower"], sortOrder: 61,
    fields: [field("invitationMessage", { maxLength: 120 }), field("babyName", { required: true }), field("babyNameLatin"), field("closingMessage")],
    overlays: [
      ov("invitationMessage", 22, 50, 72, 2.0, "500", { colorBinding: "custom", color: "#9c9a62", fontFamily: CAIRO, maxLines: 3 }),
      ov("babyName", 40, 50, 58, 6.0, "700", { colorBinding: "custom", color: "#ef8eb4" }),
      ov("babyNameLatin", 48, 50, 55, 2.1, "400", { colorBinding: "custom", color: "#ef8eb4", fontFamily: CAIRO }),
      ov("closingMessage", 57, 50, 72, 2.0, "500", { colorBinding: "custom", color: "#9c9a62", fontFamily: CAIRO, maxLines: 2 }),
    ],
    metaRow: { top: 66, color: "#d98ca9" },
  }),

  template({
    file: "marriage_contract_bronze.jpg", polished: "15.png", nameEn: "Graduation Celebration", nameAr: "حفل تخرج",
    categories: ["general_event"], sortOrder: 42,
    fields: [field("invitationMessage", { maxLength: 100 }), field("celebrantName", { required: true }), field("eventNote")],
    overlays: [
      ov("invitationMessage", 22, 50, 66, 2.1, "400", { colorBinding: "custom", color: "#54262b", fontFamily: CAIRO, maxLines: 2 }),
      ov("celebrantName", 38, 50, 60, 6.0, "700", { colorBinding: "custom", color: "#63232c" }),
      ov("eventNote", 48, 50, 62, 2.0, "400", { colorBinding: "custom", color: "#54262b", fontFamily: CAIRO }),
    ],
    metaRow: { top: 56, color: "#7d3e43" },
  }),

  template({
    file: "engagement_pearl.jpg", polished: "16.png", nameEn: "Pearl Promise", nameAr: "خطوبة لؤلؤية",
    categories: ["engagement"], sortOrder: 31,
    fields: [field("groomNameLatin"), field("brideNameLatin"), field("invitationMessage", { maxLength: 100 }), field("groomName", { required: true }), field("brideName", { required: true }), field("openingVerse")],
    overlays: [
      ov("groomNameLatin", 25, 42, 30, 1.8, "400", { colorBinding: "custom", color: "#8a876d", fontFamily: CAIRO }),
      ov("brideNameLatin", 25, 58, 30, 1.8, "400", { colorBinding: "custom", color: "#8a876d", fontFamily: CAIRO }),
      ov("invitationMessage", 34, 50, 72, 2.0, "400", { colorBinding: "custom", color: "#8a876d", fontFamily: CAIRO, maxLines: 2 }),
      ov("groomName", 49, 68, 30, 5.2, "700", { colorBinding: "custom", color: "#8a876d" }),
      ov("brideName", 49, 32, 30, 5.2, "700", { colorBinding: "custom", color: "#8a876d" }),
      ov("openingVerse", 61, 50, 78, 2.2, "600", { colorBinding: "custom", color: "#8a876d", maxLines: 2 }),
    ],
    metaRow: { top: 70, color: "#8a876d" },
  }),
];

// The four source backgrounds without a numbered reference use a sibling's
// established hierarchy. Their positions are deliberately marked by the lack
// of `polished`; proof renders are reviewed independently.
for (const [sourceFile, siblingFile, nameEn, nameAr, categories, sortOrder] of [
  ["wedding_navy_frame.jpg", "wedding_navy_dawah.jpg", "Navy Frame Wedding", "فرح الإطار الكحلي", ["wedding"], 27],
  ["wedding_white_frame.jpg", "wedding_white_dawah.jpg", "White Frame Wedding", "فرح الإطار اللؤلؤي", ["wedding"], 28],
]) {
  const sibling = TEMPLATES.find((item) => item.file === siblingFile);
  TEMPLATES.push({ ...sibling, file: sourceFile, polished: null, nameEn, nameAr, categories, sortOrder });
}

TEMPLATES.push(
  template({
    file: "general_pilgrimage.jpg", polished: null, nameEn: "Sacred Pilgrimage", nameAr: "بشارة الحج",
    categories: ["general_event"], sortOrder: 43,
    fields: [field("invitationTitle"), field("invitationMessage", { maxLength: 110 }), field("eventTitle", { required: true }), field("closingMessage")],
    overlays: [
      ov("invitationTitle", 14, 50, 54, 4.4, "700", { colorBinding: "custom", color: "#124537" }),
      ov("invitationMessage", 26, 50, 72, 2.1, "400", { colorBinding: "custom", color: "#124537", fontFamily: CAIRO, maxLines: 3 }),
      ov("eventTitle", 50, 50, 62, 4.6, "700", { colorBinding: "custom", color: "#f4e8c8" }),
      ov("closingMessage", 61, 50, 70, 2.2, "500", { colorBinding: "custom", color: "#124537", fontFamily: CAIRO }),
    ],
    metaRow: { top: 69, color: "#124537" },
  }),
  template({
    file: "conference.jpg", polished: null, nameEn: "Visionary Conference", nameAr: "مؤتمر القادة",
    categories: ["conference"], sortOrder: 70,
    fields: [field("eventTitle", { required: true }), field("invitationMessage", { maxLength: 120 }), field("hostName")],
    overlays: [
      ov("eventTitle", 22, 28, 48, 4.8, "700", { colorBinding: "custom", color: "#f2deaa", fontFamily: CAIRO, textAlign: "right", maxLines: 2 }),
      ov("invitationMessage", 37, 28, 48, 2.1, "400", { colorBinding: "custom", color: "#f2deaa", fontFamily: CAIRO, textAlign: "right", maxLines: 3 }),
      ov("hostName", 50, 28, 44, 2.5, "600", { colorBinding: "custom", color: "#f2deaa", fontFamily: CAIRO }),
    ],
    metaRow: { top: 66, color: "#f2deaa", custom: true },
  })
);

module.exports = { TEMPLATES, ov, dec, meta };


const { createGoogleAccessToken } = require("./auth/google");
const { requestJson } = require("./lib/http");

async function applyGoogleListings() {
  process.env.GOOGLE_SERVICE_ACCOUNT_PATH =
    process.env.GOOGLE_SERVICE_ACCOUNT_PATH ||
    "C:\\Users\\B\\.halaa-provider-secrets\\google-play-revenuecat-service-account.json";

  const packageName = process.env.GOOGLE_PACKAGE_NAME || "com.halaa.app";
  const token = await createGoogleAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/edits`;

  console.log("1. Creating Google Play edit...");
  const edit = await requestJson(base, { method: "POST", headers, body: {} });
  console.log("Edit created ID:", edit.id);
  const editId = edit.id;

  const arDesc = `هلا — منصتك الشاملة لإدارة المناسبات والدعوات الرقمية

صمّم وأدر مناسباتك بكل سهولة وذكاء:
• تصميم بطاقات دعوة رقمية: اختر من بين قوالب متنوعة وجذابة تناسب جميع مناسباتك (أعراس، حفلات، مناسبات أعمال).
• إرسال الدعوات بسهولة: شارك بطاقات الدعوة مع ضيوفك مباشرة وبشكل سلس.
• إدارة الضيوف وتأكيد الحضور (RSVP): تتبّع تأكيدات الحضور وقوائم المدعوين لحظة بلحظة.
• تسجيل الدخول عبر الباركود (QR Code): مسح سريع وبوابات دخول منظمة لتسجيل حضور الضيوف بدقة.
• سوق مزودي الخدمات: استكشف وتواصل مع أفضل مزودي خدمات الحفلات والمناسبات في المملكة.
• باقات مرنة: باقات مخصصة للأفراد والمؤسسات لتغطية جميع الاحتياجات.`;

  const enDesc = `Halaa — Your all-in-one platform for event management and digital invitations.

Create, manage, and celebrate events effortlessly:
• Digital Invitation Design: Customize beautiful invitation templates tailored for weddings, parties, and business events.
• Seamless Invitation Sharing: Send invitations directly to your guests.
• Guest & RSVP Management: Real-time tracking of guest responses, attendance lists, and companion counts.
• QR Code Check-in: Fast and organized guest entry scanning at your event entrance.
• Vendor Marketplace: Discover and connect with trusted event vendors and service providers across Saudi Arabia.
• Flexible Packages: Tailored plans for personal hosts and businesses.`;

  console.log("2. Updating Arabic listing (ar)...");
  await requestJson(`${base}/${editId}/listings/ar`, {
    method: "PUT",
    headers,
    body: {
      title: "هلا",
      shortDescription: "أنشئ مناسباتك، أرسل دعوات رقمية عبر واتساب، وتتبّع الحضور.",
      fullDescription: arDesc,
    },
  });
  console.log("Arabic listing updated successfully.");

  console.log("3. Updating English listing (en-US)...");
  await requestJson(`${base}/${editId}/listings/en-US`, {
    method: "PUT",
    headers,
    body: {
      title: "Halaa",
      shortDescription: "Create events, send digital WhatsApp invitations, track attendance live.",
      fullDescription: enDesc,
    },
  });
  console.log("English listing updated successfully.");

  console.log("4. Committing Google Play edit...");
  const commit = await requestJson(`${base}/${editId}:commit`, { method: "POST", headers });
  console.log("Google Play listings committed successfully:", commit);
}

applyGoogleListings().catch((err) => {
  console.error("Error applying Google listings:", err);
  process.exit(1);
});

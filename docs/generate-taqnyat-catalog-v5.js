/* eslint-disable no-console */
/**
 * Generate and validate the Halaa TAQNYAT/Meta invitation catalog V5.
 *
 * Run from the repository root:
 *   node docs/generate-taqnyat-catalog-v5.js
 *
 * Outputs:
 *   docs/TAQNYAT_META_INVITATION_TEMPLATE_CATALOG_V5.md
 *   docs/TAQNYAT_META_INVITATION_TEMPLATE_CATALOG_V5.json
 */

const fs = require("fs");
const path = require("path");

const OUTPUT_MD = path.join(__dirname, "TAQNYAT_META_INVITATION_TEMPLATE_CATALOG_V5.md");
const OUTPUT_JSON = path.join(__dirname, "TAQNYAT_META_INVITATION_TEMPLATE_CATALOG_V5.json");
const OUTPUT_OWNER_REVIEW = path.join(
  __dirname,
  "TAQNYAT_INVITATION_TEMPLATES_OWNER_REVIEW_V5.md"
);

const footer = "أُرسلت هذه الدعوة عبر هلا";

const variables = [
  { placeholder: "{{1}}", sourceKey: "guest.name", example: "عبدالله الشهري" },
  { placeholder: "{{2}}", sourceKey: "eventDetails.title", example: "عنوان المناسبة حسب السيناريو" },
  { placeholder: "{{3}}", sourceKey: "eventDetails.dateFormatted", example: "١٥ أغسطس ٢٠٢٦" },
  { placeholder: "{{4}}", sourceKey: "eventDetails.time", example: "20:30" },
  { placeholder: "{{5}}", sourceKey: "eventDetails.location.address", example: "قاعة ليلتي، جدة" },
];

const quickReplies = [
  { type: "QUICK_REPLY", text: "سأحضر", backendStatus: "confirmed" },
  { type: "QUICK_REPLY", text: "سأعتذر", backendStatus: "declined" },
  { type: "QUICK_REPLY", text: "ربما", backendStatus: "maybe" },
];

const modes = [
  {
    key: "reply_and_qr",
    slug: "reply_qr",
    title: "رد مع رمز دخول",
    instruction: [
      "يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.",
    ],
    buttons: quickReplies,
    venueCompatibility: "physical_or_hybrid",
  },
  {
    key: "reply_only",
    slug: "reply_only",
    title: "رد فقط",
    instruction: ["يسعدنا معرفة ردّك عبر أحد الخيارات أدناه."],
    buttons: quickReplies,
    venueCompatibility: "physical_online_or_hybrid",
  },
  {
    key: "qr_only",
    slug: "qr_only",
    title: "رمز دخول فقط",
    instruction: [
      "رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.",
    ],
    buttons: [
      {
        type: "URL",
        text: "عرض رمز الدخول",
        url: "https://halaa.sa/ar/invitation/{{1}}",
        parameterSource: "guest.qrcode",
      },
    ],
    venueCompatibility: "physical_or_hybrid",
  },
  {
    key: "none",
    slug: "none",
    title: "دعوة معلوماتية",
    instruction: [],
    buttons: [],
    venueCompatibility: "physical_online_or_hybrid",
  },
];

const categories = [
  {
    code: "wedding",
    titleEn: "Wedding",
    titleAr: "الزفاف",
    scenarios: [
      {
        slug: "close_circle",
        title: "فرحتنا بين الأحبة",
        voice: "warm",
        voiceAr: "الدافئة",
        scenario: "زفاف عائلي مع الأصدقاء والمقرّبين",
        audience: "الأهل والأصدقاء والمقرّبون",
        sender: "العروسان أو الأسرة",
        genderScope: "محايد للضيف",
        requirements: ["يُستخدم عندما تكون الدعوة صادرة من العروسين أو الأسرة وبنبرة قريبة."],
        sampleTitle: "حفل زفاف أحمد ونورة",
        body: [
          "أهلًا {{1}}، يسعدنا أن تصلك دعوتنا إلى «{{2}}».",
          "نجتمع بمن نحب لنشارك فرحة يوم ننتظره بمحبة.",
          "موعدنا يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.",
        ],
        closing: "نفرح بلقائك ومشاركتنا هذه المناسبة الجميلة 🤍",
      },
      {
        slug: "two_families",
        title: "دعوة العائلتين",
        voice: "classic",
        voiceAr: "الكلاسيكية",
        scenario: "حفل رسمي صادر باسم العائلتين",
        audience: "العائلة والضيوف الرسميون",
        sender: "العائلتان",
        genderScope: "محايد للضيف",
        requirements: ["لا يُستخدم إلا عندما تكون الدعوة صادرة فعلًا باسم العائلتين."],
        sampleTitle: "حفل زفاف خالد وسارة",
        body: [
          "السلام عليكم ورحمة الله وبركاته،",
          "يسرّ العائلتين دعوة {{1}} إلى «{{2}}» لمشاركتهما فرحة هذه المناسبة.",
          "تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.",
        ],
        closing: "يسعدنا حضورك، ونرحّب بك بكل سرور.",
      },
      {
        slug: "modern_friends",
        title: "موعد فرحتنا",
        voice: "modern",
        voiceAr: "العصرية",
        scenario: "زفاف عصري للأصدقاء والأقارب",
        audience: "الأصدقاء والأقارب",
        sender: "العروسان",
        genderScope: "محايد للضيف",
        requirements: ["يناسب الحفلات العصرية ذات النبرة الخفيفة."],
        sampleTitle: "ليلة زفاف فيصل ولين",
        body: [
          "يا هلا {{1}}، موعدنا مع الفرح في «{{2}}» ✨",
          "ليلة نحتفل فيها ببداية جميلة مع الأشخاص الأقرب إلى قلوبنا.",
          "نلتقي يوم {{3}}، عند {{4}}، في {{5}}.",
        ],
        closing: "ننتظر هذا اللقاء بكل فرح.",
      },
      {
        slug: "small_gathering",
        title: "لقاء قريب",
        voice: "intimate",
        voiceAr: "الشخصية",
        scenario: "زفاف صغير أو عشاء محدود للمقرّبين",
        audience: "الدائرة القريبة",
        sender: "العروسان",
        genderScope: "محايد للضيف",
        requirements: ["يُستخدم فقط للمناسبات الصغيرة أو محدودة العدد."],
        sampleTitle: "حفل زفاف عمر ومها",
        body: [
          "أهلًا {{1}}، أحببنا أن نشاركك فرحتنا في «{{2}}»، ضمن لقاء صغير يجمع المقرّبين.",
          "اخترنا لهذه اللحظة أجواء هادئة ودافئة مع من لهم مكانة خاصة.",
          "موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "نتطلع إلى لقاء هادئ وجميل بصحبتك.",
      },
      {
        slug: "family_hospitality",
        title: "حضورك محل ترحيب",
        voice: "heritage",
        voiceAr: "الأصيلة",
        scenario: "زفاف عائلي بروح الضيافة السعودية",
        audience: "العائلة والضيوف",
        sender: "الأسرة",
        genderScope: "محايد للضيف",
        requirements: ["يناسب دعوات الأسرة ذات الطابع السعودي والخليجي."],
        sampleTitle: "ليلة زفاف عبدالله والجوهرة",
        body: [
          "حيّاك الله يا {{1}}، ويسرّ العائلة دعوتك إلى «{{2}}».",
          "نستقبلك بكل ترحيب في ليلة تجمع الأهل والأحبة على الفرح.",
          "نلقاك يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "لك منّا خالص الترحيب، ونسعد بلقائك.",
      },
    ],
  },
  {
    code: "engagement",
    titleEn: "Engagement",
    titleAr: "الخطوبة",
    scenarios: [
      {
        slug: "couple_announcement",
        title: "نشارككم فرحتنا",
        voice: "warm",
        voiceAr: "الدافئة",
        scenario: "إعلان الخطوبة من الخطيبين",
        audience: "الأهل والأصدقاء",
        sender: "الخطيبان",
        genderScope: "محايد للضيف",
        requirements: ["يُستخدم عندما تكون الدعوة صادرة من الخطيبين."],
        sampleTitle: "حفل خطوبة خالد وسارة",
        body: [
          "يسعدنا يا {{1}} أن نشاركك خبر خطوبتنا، وأن ندعوك إلى «{{2}}».",
          "نحتفل بخطوة جميلة وبداية نرجو لها الخير والتوفيق.",
          "نلتقي يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "نسعد بحضورك ومشاركتنا هذه البداية 🤍",
      },
      {
        slug: "formal_families",
        title: "إعلان العائلتين",
        voice: "classic",
        voiceAr: "الكلاسيكية",
        scenario: "خطوبة رسمية باسم العائلتين",
        audience: "العائلتان والضيوف",
        sender: "العائلتان",
        genderScope: "محايد للضيف",
        requirements: ["لا يُستخدم إلا عندما تكون الدعوة صادرة فعلًا باسم العائلتين."],
        sampleTitle: "حفل خطوبة راشد وريم",
        body: [
          "السلام عليكم ورحمة الله وبركاته،",
          "بمناسبة الخطوبة، يسرّ العائلتين دعوة {{1}} إلى «{{2}}».",
          "تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.",
        ],
        closing: "يسعدنا تشريفك ومشاركتنا هذه المناسبة.",
      },
      {
        slug: "casual_celebration",
        title: "صار الخبر رسميًا",
        voice: "modern",
        voiceAr: "العصرية",
        scenario: "احتفال عصري بالخطوبة",
        audience: "الأصدقاء والأقارب",
        sender: "الخطيبان أو الأسرة",
        genderScope: "محايد للضيف",
        requirements: ["يناسب الاحتفال غير الرسمي بعد إعلان الخطوبة."],
        sampleTitle: "ليلة خطوبة نواف ودانة",
        body: [
          "صار الخبر رسميًا يا {{1}}، وحان وقت الاحتفال في «{{2}}» ✨",
          "نشارك هذه الخطوة مع أهلنا وأصدقائنا ومن نحب.",
          "موعدنا يوم {{3}}، عند {{4}}، في {{5}}.",
        ],
        closing: "نفرح بلقائك ومشاركتنا الخبر الجميل.",
      },
      {
        slug: "close_circle",
        title: "الخبر منّا إليك",
        voice: "intimate",
        voiceAr: "الشخصية",
        scenario: "إعلان شخصي للدائرة القريبة",
        audience: "المقرّبون",
        sender: "الخطيبان",
        genderScope: "محايد للضيف",
        requirements: ["يُستخدم للدائرة القريبة عندما يرغب الخطيبان في إعلان شخصي."],
        sampleTitle: "خطوبة سامي ولطيفة",
        body: [
          "أحببنا أن يصلك الخبر منّا يا {{1}}، وأن نشاركك فرحتنا في «{{2}}».",
          "هذه البداية تعني لنا الكثير، ومشاركتها مع المقرّبين تجعلها أجمل.",
          "نلتقي يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "تسعدنا مشاركتك هذه اللحظة القريبة من القلب.",
      },
      {
        slug: "traditional_family",
        title: "فرحة العائلتين",
        voice: "heritage",
        voiceAr: "الأصيلة",
        scenario: "خطوبة عائلية تقليدية",
        audience: "العائلة والأقارب",
        sender: "العائلتان",
        genderScope: "محايد للضيف",
        requirements: ["يناسب اللقاءات العائلية التقليدية وبعد إتمام الخطوبة."],
        sampleTitle: "حفل خطوبة أبناء العائلتين",
        body: [
          "حيّاك الله يا {{1}}، وبفضل الله تمّت الخطوبة، وتدعوك العائلتان إلى «{{2}}».",
          "نلتقي على المحبة والفرح بين الأهل والأقارب.",
          "موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "نسعد بحضورك، ولك منّا كل الترحيب.",
      },
    ],
  },
  {
    code: "birthday",
    titleEn: "Birthday",
    titleAr: "عيد الميلاد",
    scenarios: [
      {
        slug: "child_party",
        title: "يوم مليء بالفرح",
        voice: "warm",
        voiceAr: "الدافئة",
        scenario: "عيد ميلاد طفل للعائلات والأطفال",
        audience: "العائلات والأصدقاء وأولياء الأمور",
        sender: "الأسرة",
        genderScope: "محايد للضيف ولصاحب المناسبة",
        requirements: ["يُعرض بوضوح كدعوة عائلية؛ يحدد المضيف المشمولين بالدعوة خارج نص القالب."],
        sampleTitle: "عيد ميلاد يوسف الخامس",
        body: [
          "أهلًا {{1}}، موعدنا مع يوم مليء بالضحكات واللحظات الجميلة في «{{2}}».",
          "أعددنا احتفالًا لطيفًا يجمع الصغار والعائلة في أجواء مبهجة.",
          "يبدأ الحفل يوم {{3}}، عند {{4}}، في {{5}}.",
        ],
        closing: "ننتظر لقاءك بكل فرح 🎈",
      },
      {
        slug: "adult_birthday",
        title: "عام جديد من العمر",
        voice: "classic",
        voiceAr: "الكلاسيكية",
        scenario: "عيد ميلاد بالغ بطابع هادئ",
        audience: "العائلة والأصدقاء",
        sender: "صاحب المناسبة أو الأسرة",
        genderScope: "محايد للضيف ولصاحب المناسبة",
        requirements: ["يناسب احتفالًا هادئًا لشخص بالغ دون افتراض عمر محدد."],
        sampleTitle: "عيد ميلاد ليان",
        body: [
          "السلام عليكم ورحمة الله وبركاته،",
          "يسرّنا دعوة {{1}} إلى «{{2}}»، احتفاءً بعام جديد من العمر.",
          "تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.",
        ],
        closing: "يسعدنا لقاؤك ومشاركتنا هذه المناسبة.",
      },
      {
        slug: "surprise_party",
        title: "مفاجأة عيد الميلاد",
        voice: "modern",
        voiceAr: "العصرية",
        scenario: "حفلة عيد ميلاد مفاجئة",
        audience: "الأصدقاء والمقرّبون",
        sender: "منظمو المفاجأة",
        genderScope: "محايد للضيف ولصاحب المناسبة",
        requirements: ["لا يُستخدم إلا عندما تكون المناسبة مفاجأة فعلًا ويجب حفظ سريتها."],
        sampleTitle: "مفاجأة عيد ميلاد نورة",
        body: [
          "أهلًا {{1}}، نجهّز مفاجأة جميلة في «{{2}}»، ونرجو أن تبقى التفاصيل بيننا حتى الموعد 🎉",
          "نلتقي قبل البداية بقليل حتى تكتمل ترتيبات المفاجأة كما خططنا لها.",
          "نلتقي يوم {{3}}، عند {{4}}، في {{5}}.",
        ],
        closing: "نراك هناك قبل بدء المفاجأة.",
      },
      {
        slug: "milestone",
        title: "عام له مكانة خاصة",
        voice: "intimate",
        voiceAr: "الشخصية",
        scenario: "عيد ميلاد لمحطة عمرية مميزة",
        audience: "المقرّبون",
        sender: "صاحب المناسبة أو الأسرة",
        genderScope: "محايد للضيف ولصاحب المناسبة",
        requirements: ["يُستخدم لمحطة عمرية يحددها عنوان المناسبة أو صورتها."],
        sampleTitle: "احتفال عامي الأربعين",
        body: [
          "لهذا العام مكانة خاصة، ويسعدنا يا {{1}} أن تشاركنا الاحتفال في «{{2}}».",
          "اخترنا أن تكون هذه المحطة بين الأشخاص الذين كان لهم أثر جميل في الطريق.",
          "موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "نعتز بمشاركتك هذه المحطة.",
      },
      {
        slug: "family_elder",
        title: "احتفال بين الأهل",
        voice: "heritage",
        voiceAr: "الأصيلة",
        scenario: "عيد ميلاد أحد الوالدين أو كبار العائلة",
        audience: "العائلة والمقرّبون",
        sender: "الأسرة",
        genderScope: "محايد للضيف ولصاحب المناسبة",
        requirements: ["يُستخدم عندما يكون صاحب المناسبة من الوالدين أو كبار العائلة."],
        sampleTitle: "احتفال العائلة بعيد ميلاد الوالدة",
        body: [
          "حيّاك الله يا {{1}}، تجتمع العائلة في «{{2}}» احتفاءً بمن له مكانة كبيرة في قلوبنا.",
          "نحتفل بعام جديد ونستعيد أجمل الذكريات بين الأهل والأحبة.",
          "نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "نسعد بلقائك واجتماعنا بين الأهل.",
      },
    ],
  },
  {
    code: "baby_shower",
    titleEn: "Baby celebration",
    titleAr: "استقبال المولود",
    scenarios: [
      {
        slug: "before_birth_neutral",
        title: "في انتظار فرد جديد",
        voice: "warm",
        voiceAr: "الدافئة",
        scenario: "احتفال قبل الولادة",
        audience: "العائلة والأصدقاء",
        sender: "الوالدان أو الأسرة",
        genderScope: "محايد للضيف وللطفل",
        eventStage: "قبل الولادة",
        requirements: ["لا يُستخدم بعد الولادة ولا يفترض جنس الطفل."],
        sampleTitle: "حفل استقبال صغيرنا القادم",
        body: [
          "أهلًا {{1}}، نترقب بفرح قدوم فرد جديد، ويسعدنا أن نشاركك «{{2}}».",
          "نلتقي بمن نحب لنحتفل بهذه المرحلة الجميلة ونشاركهم فرحة الانتظار.",
          "موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "نسعد بحضورك ومشاركتنا هذا الانتظار الجميل 🤍",
      },
      {
        slug: "new_boy",
        title: "فرحتنا بمولودنا",
        voice: "classic",
        voiceAr: "الكلاسيكية",
        scenario: "استقبال مولود ذكر بعد الولادة",
        audience: "العائلة والأصدقاء",
        sender: "الوالدان أو الأسرة",
        genderScope: "محايد للضيف؛ مذكر للطفل",
        eventStage: "بعد الولادة",
        requirements: ["لا يُستخدم قبل الولادة أو لمولودة."],
        sampleTitle: "استقبال مولودنا يوسف",
        body: [
          "السلام عليكم ورحمة الله وبركاته،",
          "حمدًا لله على تمام النعمة، ويسرّنا دعوة {{1}} إلى «{{2}}» احتفاءً بمولودنا.",
          "تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.",
        ],
        closing: "نسعد بحضورك ودعائك له بالصلاح والبركة.",
      },
      {
        slug: "new_girl",
        title: "وصلت صغيرتنا",
        voice: "modern",
        voiceAr: "العصرية",
        scenario: "استقبال مولودة بعد الولادة",
        audience: "العائلة والأصدقاء",
        sender: "الوالدان أو الأسرة",
        genderScope: "محايد للضيف؛ مؤنث للطفل",
        eventStage: "بعد الولادة",
        requirements: ["لا يُستخدم قبل الولادة أو لمولود ذكر."],
        sampleTitle: "استقبال مولودتنا جود",
        body: [
          "وصلت صغيرتنا واكتملت فرحتنا، ويسعدنا يا {{1}} أن نلقاك في «{{2}}» 🤍",
          "نحتفل بقدومها بين العائلة والأصدقاء والدعوات الجميلة.",
          "موعدنا يوم {{3}}، عند {{4}}، في {{5}}.",
        ],
        closing: "نفرح بحضورك ودعواتك لها.",
      },
      {
        slug: "aqiqah_neutral",
        title: "دعوة العقيقة",
        voice: "intimate",
        voiceAr: "الشخصية",
        scenario: "عقيقة بصياغة محايدة لجنس الطفل",
        audience: "العائلة والمقرّبون",
        sender: "الوالدان أو الأسرة",
        genderScope: "محايد للضيف وللطفل",
        eventStage: "بعد الولادة",
        requirements: ["يُستخدم للعقيقة فقط وبعد الولادة."],
        sampleTitle: "عقيقة مولودنا عبدالله",
        body: [
          "يسرّنا يا {{1}} دعوتك إلى «{{2}}»، لنشاركك فرحتنا بالعقيقة في لقاء عائلي دافئ.",
          "نحمد الله على نعمته، ونجتمع بين الأهل والمقرّبين على خير.",
          "موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "يسعدنا حضورك ودعواتك الطيبة.",
      },
      {
        slug: "family_reception_neutral",
        title: "الحمد لله على تمام النعمة",
        voice: "heritage",
        voiceAr: "الأصيلة",
        scenario: "استقبال عائلي محايد بعد الولادة",
        audience: "العائلة والأصدقاء",
        sender: "الوالدان أو الأسرة",
        genderScope: "محايد للضيف وللطفل",
        eventStage: "بعد الولادة",
        requirements: ["يُستخدم بعد الولادة ولا يفترض جنس الطفل."],
        sampleTitle: "لقاء الأحبة احتفاءً بتمام النعمة",
        body: [
          "حيّاك الله يا {{1}}، والحمد لله الذي أتمّ علينا النعمة، ويسرّ العائلة دعوتك إلى «{{2}}».",
          "نلتقي بين الأهل والأحبة شاكرين لله، ومستبشرين بالدعوات الطيبة.",
          "نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "يسعدنا حضورك ودعواتك الطيبة.",
      },
    ],
  },
  {
    code: "ladies_event",
    titleEn: "Ladies' event",
    titleAr: "المناسبة النسائية",
    scenarios: [
      {
        slug: "friends_gathering",
        title: "لقاء يجمعنا بمن نحب",
        voice: "warm",
        voiceAr: "الدافئة",
        scenario: "لقاء نسائي اجتماعي",
        audience: "القريبات والصديقات",
        sender: "المضيفة أو المجموعة المنظمة",
        genderScope: "مؤنث للضيفة",
        requirements: ["يُستخدم للضيفات فقط."],
        sampleTitle: "أمسية الورد",
        body: [
          "أهلًا {{1}}، أعددنا لقاءً هادئًا يجمعنا بمن نحب، ويسعدنا أن تكوني بيننا في «{{2}}».",
          "لقاء خفيف للحديث الجميل وقضاء وقت لطيف مع القريبات والصديقات.",
          "موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "نلقاك بكل ود وسرور ✨",
      },
      {
        slug: "formal_professional",
        title: "دعوة نسائية رسمية",
        voice: "classic",
        voiceAr: "الكلاسيكية",
        scenario: "استقبال رسمي أو لقاء مهني نسائي",
        audience: "الضيفات والمهنيات",
        sender: "الجهة المنظمة",
        genderScope: "مؤنث للضيفة",
        requirements: ["يُستخدم للضيفات فقط وفي لقاء رسمي أو مهني."],
        sampleTitle: "ملتقى سيدات الأعمال",
        body: [
          "السلام عليكم ورحمة الله وبركاته،",
          "يسرّنا دعوة {{1}} إلى «{{2}}»، ونعتز بحضورك بين ضيفاتنا.",
          "يُقام اللقاء يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.",
        ],
        closing: "يسرّنا الترحيب بك، ونقدّر مشاركتك.",
      },
      {
        slug: "casual_friends",
        title: "صحبة جميلة",
        voice: "modern",
        voiceAr: "العصرية",
        scenario: "لقاء خفيف للصديقات",
        audience: "الصديقات",
        sender: "المضيفة أو المجموعة",
        genderScope: "مؤنث للضيفة",
        requirements: ["يُستخدم للصديقات وفي لقاء غير رسمي."],
        sampleTitle: "لقاء الصديقات",
        body: [
          "يا هلا {{1}}، موعدنا مع صحبة جميلة ووقت لطيف في «{{2}}» 💫",
          "نقضي وقتًا خفيفًا بين الحديث والضحك والذكريات الجميلة.",
          "نلتقي يوم {{3}}، عند {{4}}، في {{5}}.",
        ],
        closing: "نفرح بلقائك وقضاء هذا الوقت معك.",
      },
      {
        slug: "bride_night",
        title: "ليلة قريبة من العروس",
        voice: "intimate",
        voiceAr: "الشخصية",
        scenario: "ليلة حناء أو مناسبة خاصة بالعروس",
        audience: "القريبات والصديقات",
        sender: "العروس أو أسرتها",
        genderScope: "مؤنث للضيفة",
        requirements: ["يُستخدم للضيفات فقط ولمناسبة مرتبطة بالعروس."],
        sampleTitle: "ليلة حناء العروس دانة",
        body: [
          "أهلًا {{1}}، نحتفل بالعروس في ليلة خاصة، ويسعدها أن تكوني معها في «{{2}}».",
          "لقاء دافئ يجمع القريبات والصديقات حول العروس في أجواء جميلة.",
          "موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "نسعد بمشاركتك العروس فرحتها في هذه الليلة.",
      },
      {
        slug: "family_heritage",
        title: "أمسية بين الأهل",
        voice: "heritage",
        voiceAr: "الأصيلة",
        scenario: "لقاء نسائي عائلي بطابع خليجي",
        audience: "نساء العائلة والقريبات",
        sender: "المضيفة أو الأسرة",
        genderScope: "مؤنث للضيفة",
        requirements: ["يُستخدم للضيفات فقط وفي لقاء عائلي."],
        sampleTitle: "ليلة تراث وأصالة",
        body: [
          "حيّاكِ الله يا {{1}}، ونرحّب بك في «{{2}}» بين الأهل والقريبات.",
          "أمسية تجمع الود وكرم الضيافة وروح المناسبات التي نحبها.",
          "نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "لك منّا خالص الترحيب، ونسعد بلقائك.",
      },
    ],
  },
  {
    code: "general_event",
    titleEn: "General occasion",
    titleAr: "المناسبة العامة",
    scenarios: [
      {
        slug: "graduation_achievement",
        title: "فرحة الإنجاز",
        voice: "warm",
        voiceAr: "الدافئة",
        scenario: "تخرج أو إنجاز شخصي",
        audience: "العائلة والأصدقاء والزملاء",
        sender: "صاحب الإنجاز أو الأسرة",
        genderScope: "محايد للضيف ولصاحب الإنجاز",
        requirements: ["يُستخدم للتخرج أو لإنجاز شخصي واضح في عنوان المناسبة."],
        sampleTitle: "حفل تخرج سارة",
        body: [
          "وراء كل إنجاز رحلة تستحق الاحتفاء، ويسعدنا يا {{1}} أن نشاركك «{{2}}».",
          "نحتفل بثمرة جهد وبداية مرحلة جديدة مع كل من شاركنا الطريق.",
          "موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "نفرح بلقائك ومشاركتنا لحظة الإنجاز 🎓",
      },
      {
        slug: "new_home",
        title: "دعوة إلى منزلنا الجديد",
        voice: "classic",
        voiceAr: "الكلاسيكية",
        scenario: "احتفال بمنزل جديد",
        audience: "العائلة والأصدقاء والجيران",
        sender: "أصحاب المنزل",
        genderScope: "محايد للضيف",
        requirements: ["لا يُستخدم إلا لزيارة أو احتفال مرتبط بمنزل جديد."],
        sampleTitle: "لقاء الأحبة في منزلنا الجديد",
        body: [
          "السلام عليكم ورحمة الله وبركاته،",
          "بمناسبة انتقالنا إلى منزلنا الجديد، يسرّنا دعوة {{1}} إلى «{{2}}».",
          "نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "يسعدنا أن يبدأ هذا المنزل بلقاء الأحبة.",
      },
      {
        slug: "opening_launch",
        title: "موعد الافتتاح",
        voice: "modern",
        voiceAr: "العصرية",
        scenario: "افتتاح مشروع أو إطلاق جديد",
        audience: "العملاء والشركاء والأصدقاء",
        sender: "صاحب المشروع أو الجهة",
        genderScope: "محايد للضيف",
        requirements: ["يُستخدم لافتتاح أو إطلاق فعلي، لا لمناسبة عامة."],
        sampleTitle: "افتتاح استوديو نور",
        body: [
          "بدأت الفكرة بخطوة، واليوم نحتفل بانطلاقتها. يا هلا {{1}} في «{{2}}» ✨",
          "نشاركك بداية جديدة صنعتها أيام من العمل والطموح.",
          "موعد الافتتاح يوم {{3}}، عند {{4}}، في {{5}}.",
        ],
        closing: "نقدّر مشاركتك هذه البداية منذ لحظاتها الأولى.",
      },
      {
        slug: "recognition_retirement",
        title: "مسيرة تستحق التقدير",
        voice: "intimate",
        voiceAr: "الشخصية",
        scenario: "تكريم أو تقاعد",
        audience: "العائلة والأصدقاء والزملاء",
        sender: "الأسرة أو جهة العمل",
        genderScope: "محايد للضيف وللمكرّم",
        requirements: ["يُستخدم للتكريم أو التقاعد، وليس لوداع عابر."],
        sampleTitle: "حفل تكريم الأستاذ سامي",
        body: [
          "نجتمع تقديرًا لمسيرة تركت أثرًا طيبًا، ويسعدنا يا {{1}} حضور «{{2}}».",
          "نستعيد فيه الذكريات الجميلة ونحتفي بالأثر الذي تركته هذه المسيرة.",
          "موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "نعتز بحضورك في لقاء يليق بهذه المسيرة.",
      },
      {
        slug: "eid_family",
        title: "لمّة العيد",
        voice: "heritage",
        voiceAr: "الأصيلة",
        scenario: "لقاء عائلي أو مجتمعي في العيد",
        audience: "العائلة والأصدقاء وأهل الحي",
        sender: "الأسرة أو الجهة المنظمة",
        genderScope: "محايد للضيف",
        requirements: ["يُستخدم لعيد الفطر أو الأضحى مع تحديد العيد في عنوان المناسبة."],
        sampleTitle: "لقاء عيد الفطر",
        body: [
          "العيد أجمل باللمّة، وحيّاك الله يا {{1}} في «{{2}}».",
          "نلتقي على المحبة وصلة الرحم وفرحة العيد بين الأهل والأحبة.",
          "موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "نلقاك بكل ترحيب، وعساكم من عوّاده.",
      },
    ],
  },
  {
    code: "conference",
    titleEn: "Conference and professional events",
    titleAr: "المؤتمر والفعاليات المهنية",
    scenarios: [
      {
        slug: "attendee",
        title: "دعوة الحضور",
        voice: "warm",
        voiceAr: "الدافئة",
        scenario: "دعوة عامة لحضور مؤتمر أو ملتقى",
        audience: "الحضور العام",
        sender: "الجهة المنظمة",
        genderScope: "محايد للضيف",
        recipientRole: "حاضر",
        requirements: ["يُستخدم للحضور العام وليس للمتحدثين أو الرعاة."],
        sampleTitle: "ملتقى مجتمع المصممين",
        body: [
          "مرحبًا {{1}}، يسرّنا دعوتك لحضور «{{2}}».",
          "يجمع الحدث المهتمين بالمجال في جلسات مفيدة وفرص للتعارف وتبادل الخبرات.",
          "يُقام يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "نتطلع إلى الترحيب بك ولقائك في الحدث.",
      },
      {
        slug: "formal_delegate",
        title: "دعوة الوفود والضيوف",
        voice: "classic",
        voiceAr: "الكلاسيكية",
        scenario: "دعوة رسمية لضيف أو عضو وفد بصفة حاضر",
        audience: "الوفود والضيوف الرسميون",
        sender: "الجهة المنظمة",
        genderScope: "محايد للضيف",
        recipientRole: "حاضر رسمي",
        requirements: ["هذه ليست دعوة متحدث؛ يُستخدم فقط لمن سيحضر بصفته ضيفًا أو عضو وفد."],
        sampleTitle: "ملتقى القيادات 2026",
        body: [
          "السلام عليكم ورحمة الله وبركاته،",
          "يسرّنا دعوة {{1}} لحضور «{{2}}» ضمن ضيوف الحدث.",
          "يُقام البرنامج يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.",
        ],
        closing: "نعتز بحضورك، ويسرّنا الترحيب بك.",
      },
      {
        slug: "executive_vip",
        title: "لقاء القيادات",
        voice: "modern",
        voiceAr: "العصرية",
        scenario: "دعوة تنفيذية أو لكبار الضيوف",
        audience: "القيادات وكبار الضيوف",
        sender: "الجهة المنظمة",
        genderScope: "محايد للضيف",
        recipientRole: "ضيف تنفيذي",
        requirements: ["يُستخدم للمدعوين التنفيذيين وكبار الضيوف فقط."],
        sampleTitle: "مجلس قادة الأعمال",
        body: [
          "مرحبًا {{1}}، ندعوك إلى «{{2}}» لحوار مركّز بين قيادات المجال 💡",
          "نناقش الفرص والتحديات، ونتبادل الرؤى، ونبني علاقات مهنية جديدة.",
          "نلتقي يوم {{3}}، عند {{4}}، في {{5}}.",
        ],
        closing: "نقدّر حضورك وإسهامك في هذا اللقاء.",
      },
      {
        slug: "workshop",
        title: "جلسة عملية",
        voice: "intimate",
        voiceAr: "الشخصية",
        scenario: "ورشة أو جلسة عملية محدودة العدد",
        audience: "المهتمون بالمشاركة العملية",
        sender: "الجهة المنظمة أو الميسّر",
        genderScope: "محايد للضيف",
        recipientRole: "مشارك",
        requirements: ["يُستخدم لورشة أو جلسة تفاعلية، ولا يفترض أن الضيف مسجل مسبقًا."],
        sampleTitle: "ورشة بناء العلامات التجارية",
        body: [
          "يسرّنا يا {{1}} دعوتك إلى «{{2}}»، وهي جلسة عملية ومركّزة بعدد محدود من الحضور.",
          "يتضمن اللقاء تطبيقات عملية ونقاشًا مفتوحًا وتبادلًا للخبرات.",
          "موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "يسعدنا حضورك ومشاركتك في النقاش.",
      },
      {
        slug: "networking",
        title: "ملتقى أهل الخبرة",
        voice: "heritage",
        voiceAr: "الأصيلة",
        scenario: "ملتقى للتعارف وتبادل الخبرات",
        audience: "المهنيون ورواد المجال",
        sender: "الجهة المنظمة",
        genderScope: "محايد للضيف",
        recipientRole: "حاضر للتواصل المهني",
        requirements: ["يُستخدم عندما يكون التواصل المهني هدفًا أساسيًا للحدث."],
        sampleTitle: "منتدى رواد الأعمال",
        body: [
          "حيّاك الله يا {{1}}، ونرحّب بك في «{{2}}» بين أهل الخبرة ورواد المجال.",
          "ملتقى للتعارف وتبادل التجارب وبناء علاقات مهنية ممتدة.",
          "نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.",
        ],
        closing: "لك منّا كل الترحيب، ونسعد بلقائك.",
      },
    ],
  },
];

function renderBody(scenario, mode) {
  return [...scenario.body, "", ...mode.instruction, "", scenario.closing]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildTemplates() {
  const templates = [];
  for (const category of categories) {
    for (const scenario of category.scenarios) {
      for (const mode of modes) {
        templates.push({
          name: `halaa_${category.code}_${scenario.slug}_${mode.slug}_ar_v4`,
          language: "ar",
          requestedMetaCategory: "MARKETING",
          allowCategoryChange: true,
          halaaCategory: category.code,
          halaaType: "invite",
          invitationMode: mode.key,
          voice: scenario.voice,
          scenario: scenario.scenario,
          audience: scenario.audience,
          senderPerspective: scenario.sender,
          genderScope: scenario.genderScope,
          eventStage: scenario.eventStage || null,
          recipientRole: scenario.recipientRole || null,
          requirements: scenario.requirements,
          venueCompatibility: mode.venueCompatibility,
          sampleTitle: scenario.sampleTitle,
          header: { type: "IMAGE", sampleMediaRequired: true },
          body: renderBody(scenario, mode),
          bodyExamples: variables.map((variable) =>
            variable.placeholder === "{{2}}" ? scenario.sampleTitle : variable.example
          ),
          footer,
          buttons: mode.buttons,
          variableMapping: variables.map(({ placeholder, sourceKey }) => ({ placeholder, sourceKey })),
        });
      }
    }
  }
  return templates;
}

function countVisibleSymbols(text) {
  const matches = text.match(/[\p{Extended_Pictographic}]/gu);
  return matches ? matches.length : 0;
}

function validateTemplates(templates) {
  const errors = [];
  const expectedVariables = "1,2,3,4,5";
  const names = new Set();
  const bodies = new Set();
  const editorialSmells = [
    "تتشرّف الجهة المنظمة",
    "هذه الليلة قريبة من قلب العروس",
    "تحمل اسمك",
    "صناعة أثر",
    "صناعة ذكريات",
    "الطرح النظري الطويل",
    "تجمع المعرفة بكرم اللقاء",
    "هي مساحة للحديث",
  ];

  if (templates.length !== 140) errors.push(`Expected 140 templates, found ${templates.length}`);

  for (const template of templates) {
    if (!/^[a-z0-9_]+$/.test(template.name)) errors.push(`${template.name}: invalid name`);
    if (names.has(template.name)) errors.push(`${template.name}: duplicate name`);
    names.add(template.name);

    if (bodies.has(template.body)) errors.push(`${template.name}: duplicate body`);
    bodies.add(template.body);

    if (template.body.length > 1024) errors.push(`${template.name}: body exceeds 1024 characters`);
    if (/^\s*\{\{\d+\}\}/.test(template.body)) errors.push(`${template.name}: body starts with a variable`);
    if (/\{\{\d+\}\}\s*$/.test(template.body)) errors.push(`${template.name}: body ends with a variable`);

    const found = [...template.body.matchAll(/\{\{(\d+)\}\}/g)].map((match) => match[1]);
    if (found.join(",") !== expectedVariables) {
      errors.push(`${template.name}: expected variables 1..5 once and in order, found ${found.join(",")}`);
    }

    if (/^(?:\s*[📅📍]?\s*)?\{\{\d+\}\}(?:\s*[·،:]\s*\{\{\d+\}\})*\s*$/m.test(template.body)) {
      errors.push(`${template.name}: contains a sparse variable-only line`);
    }

    if (/لا يكتمل من دونك|يكفينا أن تكون معنا|وجودك شرط|لن تكتمل فرحتنا/.test(template.body)) {
      errors.push(`${template.name}: contains pressuring language`);
    }

    for (const phrase of editorialSmells) {
      if (template.body.includes(phrase)) {
        errors.push(`${template.name}: contains flagged stiff or vague phrasing: ${phrase}`);
      }
    }

    if (
      template.genderScope.startsWith("محايد") &&
      /أن (?:يكون|تكون) \{\{1\}\}/.test(template.body)
    ) {
      errors.push(`${template.name}: uses a gendered verb directly with a gender-neutral guest name`);
    }

    if (template.voice === "modern" && countVisibleSymbols(template.body) > 3) {
      errors.push(`${template.name}: modern body contains more than three visual symbols`);
    }

    if (template.invitationMode === "reply_and_qr") {
      if (!template.body.includes("عند تأكيد الحضور") || !template.body.includes("رمز الدخول")) {
        errors.push(`${template.name}: reply_and_qr behavior text is incomplete`);
      }
      if (template.buttons.length !== 3) errors.push(`${template.name}: reply_and_qr must have three replies`);
    }

    if (template.invitationMode === "reply_only") {
      if (template.body.includes("رمز الدخول")) errors.push(`${template.name}: reply_only mentions an entry code`);
      if (template.buttons.length !== 3) errors.push(`${template.name}: reply_only must have three replies`);
    }

    if (template.invitationMode === "qr_only") {
      if (!template.body.includes("زر «عرض رمز الدخول»")) errors.push(`${template.name}: qr_only misses exact CTA label`);
      if (template.body.includes("الخيارات أدناه")) errors.push(`${template.name}: qr_only requests an RSVP`);
      if (template.buttons.length !== 1 || template.buttons[0].type !== "URL") {
        errors.push(`${template.name}: qr_only must have one URL button`);
      }
    }

    if (template.invitationMode === "none") {
      if (template.body.includes("رمز الدخول") || template.body.includes("الخيارات أدناه")) {
        errors.push(`${template.name}: none mode contains operational language`);
      }
      if (template.buttons.length !== 0) errors.push(`${template.name}: none mode must have no buttons`);
    }

    for (const button of template.buttons) {
      if (button.text.length > 20) errors.push(`${template.name}: button exceeds 20 characters: ${button.text}`);
    }
  }

  if (names.size !== 140) errors.push(`Expected 140 unique names, found ${names.size}`);
  if (bodies.size !== 140) errors.push(`Expected 140 unique bodies, found ${bodies.size}`);

  return errors;
}

function markdownEscape(value) {
  return String(value || "").replace(/\|/g, "\\|");
}

function renderButtons(template) {
  if (template.buttons.length === 0) return "**Buttons:** none\n";
  if (template.invitationMode === "qr_only") {
    return [
      "**Dynamic URL button**",
      "",
      "```text",
      `Label: ${template.buttons[0].text}`,
      `URL: ${template.buttons[0].url}`,
      `Runtime parameter source: ${template.buttons[0].parameterSource}`,
      "```",
      "",
    ].join("\n");
  }
  return [
    "**Quick replies**",
    "",
    "| Visible label | Current backend status |",
    "|---|---|",
    ...template.buttons.map((button) => `| \`${button.text}\` | \`${button.backendStatus}\` |`),
    "",
  ].join("\n");
}

function renderMarkdown(templates) {
  const out = [];
  out.push("# Halaa WhatsApp Invitation Catalog V5 — Submission-safe Scenario Collection");
  out.push("");
  out.push("**Version:** 5.0");
  out.push("**Status:** validated copy and submission specification; application integration gates remain");
  out.push("**Language:** Arabic (`ar`)");
  out.push("**Coverage:** 7 categories × 5 scenarios × 4 invitation modes = **140 templates**");
  out.push("");
  out.push("> V5 replaces V4 copy and names without modifying V4. It removes variable-first openings, uses the current Halaa runtime source keys and RSVP labels, strengthens the Arabic copy, narrows unsafe scenarios, and makes every assumption an explicit eligibility rule.");
  out.push("");
  out.push("---");
  out.push("");
  out.push("## 1. Non-negotiable release contract");
  out.push("");
  out.push("1. Do not submit a template until its scenario requirements are enforced in the host picker.");
  out.push("2. Do not submit or send to a guest without recorded WhatsApp opt-in and an operational suppression/opt-out path.");
  out.push("3. Request Meta category `MARKETING`, send `allow_category_change: true`, and store Meta's returned category.");
  out.push("4. Every submission uses an `IMAGE` header and therefore requires valid sample media during submission and a public HTTPS image at send time.");
  out.push("5. The footer is neutral: `أُرسلت هذه الدعوة عبر هلا`.");
  out.push("6. V5 Meta names end in `_ar_v4` because approved templates are immutable and the V4 catalog already reserved `_ar_v3` names.");
  out.push("");
  out.push("### 1.1 Current runtime variable contract");
  out.push("");
  out.push("| Placeholder | Current Halaa source | Submission example |");
  out.push("|---|---|---|");
  for (const variable of variables) {
    out.push(`| \`${variable.placeholder}\` | \`${variable.sourceKey}\` | \`${variable.example}\` |`);
  }
  out.push("");
  out.push("`{{1}}` in the dynamic URL button is component-scoped and receives `guest.qrcode`; it is independent of body `{{1}}`.");
  out.push("");
  out.push("### 1.2 RSVP compatibility contract");
  out.push("");
  out.push("V5 intentionally uses the labels currently recognized by Halaa's webhook:");
  out.push("");
  out.push("| Visible label | Current stored status |");
  out.push("|---|---|");
  for (const reply of quickReplies) out.push(`| \`${reply.text}\` | \`${reply.backendStatus}\` |`);
  out.push("");
  out.push("A future backend migration should send stable quick-reply payloads and read payload-first, while retaining these labels as a compatibility fallback.");
  out.push("");
  out.push("### 1.3 Invitation modes");
  out.push("");
  out.push("| Mode | Guest behavior | Buttons | Venue compatibility |");
  out.push("|---|---|---|---|");
  out.push("| `reply_and_qr` | RSVP; confirmed guests receive their entry code afterward | Three quick replies | Physical or hybrid |");
  out.push("| `reply_only` | RSVP without entry-code promise | Three quick replies | Physical, online, or hybrid |");
  out.push("| `qr_only` | Entry code is immediately available from the exact URL button | One URL button | Physical or hybrid |");
  out.push("| `none` | Informational invitation | None | Physical, online, or hybrid |");
  out.push("");
  out.push("---");
  out.push("");
  out.push("## 2. Validation result");
  out.push("");
  out.push("The generator rejects the catalog unless all of the following pass:");
  out.push("");
  out.push("- exactly 140 unique Meta names and 140 unique bodies;");
  out.push("- lowercase alphanumeric/underscore Meta names;");
  out.push("- body variables `{{1}}` through `{{5}}` exactly once and in order;");
  out.push("- no body beginning or ending with a variable;");
  out.push("- no sparse variable-only detail lines;");
  out.push("- body length at or below 1,024 characters;");
  out.push("- button labels at or below 20 characters;");
  out.push("- correct operational language and button type for all four modes;");
  out.push("- no known pressuring phrases;");
  out.push("- no more than three visual symbols in modern bodies.");
  out.push("");
  out.push(`**Generated result:** ${templates.length}/140 templates passed all automated catalog checks.`);
  out.push("");
  out.push("---");
  out.push("");
  out.push("## 3. Scenario index and eligibility");
  out.push("");
  out.push("The host must choose a scenario, not an unexplained provider template. Voice is a tone descriptor; it must never be used as a substitute for scenario eligibility.");
  out.push("");
  out.push("| Category | Host-facing scenario | Voice | Mandatory eligibility |");
  out.push("|---|---|---|---|");
  for (const category of categories) {
    for (const scenario of category.scenarios) {
      out.push(`| ${category.titleAr} \`${category.code}\` | ${scenario.title} | ${scenario.voiceAr} \`${scenario.voice}\` | ${markdownEscape(scenario.requirements.join(" "))} |`);
    }
  }
  out.push("");
  out.push("---");
  out.push("");
  out.push("## 4. Full template catalog");
  out.push("");

  let categoryNumber = 4;
  for (const category of categories) {
    categoryNumber += 1;
    out.push(`## ${categoryNumber}. ${category.titleEn} — ${category.titleAr} \`${category.code}\``);
    out.push("");
    category.scenarios.forEach((scenario, scenarioIndex) => {
      out.push(`### ${categoryNumber}.${scenarioIndex + 1} ${scenario.title} — ${scenario.voiceAr} \`${scenario.voice}\``);
      out.push("");
      out.push(`- **Scenario:** ${scenario.scenario}`);
      out.push(`- **Audience:** ${scenario.audience}`);
      out.push(`- **Sender perspective:** ${scenario.sender}`);
      out.push(`- **Gender scope:** ${scenario.genderScope}`);
      if (scenario.eventStage) out.push(`- **Event stage:** ${scenario.eventStage}`);
      if (scenario.recipientRole) out.push(`- **Recipient role:** ${scenario.recipientRole}`);
      out.push(`- **Mandatory eligibility:** ${scenario.requirements.join(" ")}`);
      out.push(`- **Meta sample title:** \`${scenario.sampleTitle}\``);
      out.push("");

      modes.forEach((mode, modeIndex) => {
        const template = templates.find(
          (candidate) =>
            candidate.halaaCategory === category.code &&
            candidate.scenario === scenario.scenario &&
            candidate.invitationMode === mode.key
        );
        out.push(`#### ${categoryNumber}.${scenarioIndex + 1}.${modeIndex + 1} ${mode.title} — \`${mode.key}\``);
        out.push("");
        out.push(`- **Meta name:** \`${template.name}\``);
        out.push(`- **Requested Meta category:** \`MARKETING\` with \`allow_category_change: true\``);
        out.push(`- **Halaa category:** \`${category.code}\``);
        out.push(`- **Halaa invitation mode:** \`${mode.key}\``);
        out.push(`- **Venue compatibility:** \`${mode.venueCompatibility}\``);
        out.push("");
        out.push("**Body**");
        out.push("");
        out.push("```text");
        out.push(template.body);
        out.push("```");
        out.push("");
        out.push(renderButtons(template).trimEnd());
        out.push("");
        out.push("---");
        out.push("");
      });
    });
  }

  out.push("## 12. Application integration gates before submission");
  out.push("");
  out.push("1. Unify category codes across the Event model, web, mobile, template categories, and this catalog.");
  out.push("2. Add scenario title, voice, audience, sender perspective, gender scope, event stage, recipient role, requirements, and venue compatibility to the TAQNYAT template cache and host API.");
  out.push("3. Display the host-facing scenario title and eligibility note in the picker; never show five anonymous cards with only the same category label.");
  out.push("4. Enforce child gender and birth stage for baby templates and recipient gender for ladies' templates.");
  out.push("5. Enforce the surprise flag for surprise birthdays and the sender identity for family/couple templates.");
  out.push("6. Add guest WhatsApp consent evidence and a per-number suppression/opt-out workflow.");
  out.push("7. Add an image-header/button-capable batch submission path using the generated JSON catalog.");
  out.push("8. Add formatted time and location display fields later; until then V5 deliberately maps to the current runtime keys.");
  out.push("");
  out.push("## 13. Pilot submission sequence");
  out.push("");
  out.push("1. Complete native Saudi-Arabic review of the five wedding originals.");
  out.push("2. Render all 20 wedding templates on narrow-screen WhatsApp previews in light and dark appearance.");
  out.push("3. Run this generator and require zero validation errors.");
  out.push("4. Upload and verify the image-header sample media.");
  out.push("5. Submit the 20 wedding templates only.");
  out.push("6. Test accept, decline, maybe, QR delivery, QR-only URL, no-button mode, SMS fallback, and public image retrieval on real devices.");
  out.push("7. Monitor rejection reasons, delivery, reads, responses, blocks, and quality rating before submitting the next category.");
  out.push("");
  out.push("## 14. Official references");
  out.push("");
  out.push("- [TAQNYAT WhatsApp API documentation](https://dev.taqnyat.sa/en/doc/whatsapp/)");
  out.push("- [TAQNYAT template creation and rejection guidance](https://blog.taqnyat.sa/en/post/whatsApp_business_templates/)");
  out.push("- [TAQNYAT professional marketing/template guidance](https://blog.taqnyat.sa/en/post/marketing_WhatsApp_Business_API/)");
  out.push("");
  out.push("---");
  out.push("");
  out.push("Generated by `docs/generate-taqnyat-catalog-v5.js`. Edit the generator source, not the generated Markdown or JSON files.");
  out.push("");
  return out.join("\n");
}

function renderOwnerReview(templates) {
  const representativeMode = "reply_and_qr";
  const out = [];

  out.push("# مراجعة مالك المشروع — نصوص دعوات هلا V5");
  out.push("");
  out.push("**الغرض من الملف:** مراجعة النصوص الإبداعية قبل اعتمادها وإرسالها إلى تقنيات/ميتا.");
  out.push("**النطاق:** 7 فئات × 5 نصوص لكل فئة = **35 نصًا**.");
  out.push("**نوع الدعوة المعروض:** رد على الدعوة مع إرسال رمز الدخول بعد تأكيد الحضور `reply_and_qr`.");
  out.push("");
  out.push("> لكل نص في الكتالوج الكامل أربعة أنواع تشغيلية. يعرض هذا الملف نوعًا واحدًا فقط لتسهيل مراجعة الأسلوب والمعنى والافتراضات. بعد اعتماد النص الأساسي، تُطبّق النسخ التشغيلية الثلاث الأخرى آليًا.");
  out.push("");
  out.push("---");
  out.push("");

  categories.forEach((category, categoryIndex) => {
    out.push(`## ${categoryIndex + 1}. ${category.titleAr}`);
    out.push("");

    category.scenarios.forEach((scenario, scenarioIndex) => {
      const template = templates.find(
        (candidate) =>
          candidate.halaaCategory === category.code &&
          candidate.scenario === scenario.scenario &&
          candidate.invitationMode === representativeMode
      );

      out.push(`### ${categoryIndex + 1}.${scenarioIndex + 1} ${scenario.title}`);
      out.push("");
      out.push("**النص المقترح**");
      out.push("");
      out.push("```text");
      out.push(template.body);
      out.push("```");
      out.push("");
      out.push("---");
      out.push("");
    });
  });

  return out.join("\n");
}

function main() {
  const templates = buildTemplates();
  const errors = validateTemplates(templates);
  if (errors.length > 0) {
    console.error(`Catalog validation failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  const manifest = {
    catalogVersion: "5.0",
    language: "ar",
    footer,
    variables,
    templateCount: templates.length,
    templates,
  };

  fs.writeFileSync(OUTPUT_MD, `${renderMarkdown(templates)}\n`, "utf8");
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  fs.writeFileSync(OUTPUT_OWNER_REVIEW, `${renderOwnerReview(templates)}\n`, "utf8");
  console.log(`Validated ${templates.length} templates.`);
  console.log(`Wrote ${OUTPUT_MD}`);
  console.log(`Wrote ${OUTPUT_JSON}`);
  console.log(`Wrote ${OUTPUT_OWNER_REVIEW}`);
}

main();

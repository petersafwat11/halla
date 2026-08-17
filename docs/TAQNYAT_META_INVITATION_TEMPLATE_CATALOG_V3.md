# Halaa WhatsApp Invitation Catalog — Human Writing System

**Version:** 3.0  
**Status:** copy-reviewed submission candidate  
**Language:** Arabic (`ar`)  
**Coverage:** 7 categories × 5 voices × 4 invitation modes = **140 templates**

> This version replaces generated-sounding copy with five controlled voices. The functional behavior remains consistent, while greeting, rhythm, detail layout, emoji use, RSVP wording, QR wording, and closing vary intentionally.

---

## 1. The five frozen voices

| Voice | Writing rules |
|---|---|
| **الدافئة — Warm** `warm` | قريبة وطبيعية؛ جمل متوسطة، تفاصيل داخل السرد، وإيموجي واحد كحد أقصى. |
| **الكلاسيكية — Classic** `classic` | رسمية هادئة؛ عربية فصيحة، بلا إيموجي، وتفاصيل موعد كاملة. |
| **العصرية — Modern** `modern` | خفيفة ومباشرة؛ أسطر قصيرة، تفاصيل مرئية، وإيموجي محدود يخدم المناسبة. |
| **الشخصية — Intimate** `intimate` | شخصية ومختصرة؛ تخاطب العلاقة بالضيف وتتجنب العبارات الاحتفالية الكبيرة. |
| **الأصيلة — Heritage** `heritage` | بروح الضيافة السعودية والخليجية؛ ترحيب واضح وصياغة عائلية محترمة. |

### Voice-specific functional language

| Voice | Reply + QR | Reply only | QR only |
|---|---|---|---|
| `warm` | نأمل حضورك. بعد تأكيد الحضور، نرسل لك رمز الدخول الخاص بك. | نأمل حضورك، وننتظر ردّك. | رمز دخولك جاهز عبر زر «عرض رمز الدخول» لاستخدامه عند الوصول. |
| `classic` | نرجو التكرّم بتأكيد الحضور؛ وبعد التأكيد ستصلك بطاقة الدخول الخاصة بك. | نرجو التكرّم بتأكيد الحضور. | بطاقة دخولك متاحة عبر زر «عرض رمز الدخول» لتقديمها عند الوصول. |
| `modern` | ننتظر ردّك، وإذا أكدت حضورك يصلك رمز الدخول مباشرة. | ننتظر ردّك. | رمز الدخول جاهز عبر زر «عرض رمز الدخول». |
| `intimate` | نأمل أن نراك معنا. بعد تأكيد حضورك، نرسل لك رمز الدخول. | نأمل أن نراك معنا، وننتظر ردّك. | ستجد رمز دخولك عبر زر «عرض رمز الدخول» عند وصولك. |
| `heritage` | نرجو تأكيد حضورك؛ وبعده يصلك رمز الدخول المخصّص لك. | نرجو تأكيد حضورك. | رمز دخولك المخصّص لك متاح عبر زر «عرض رمز الدخول». |

These functional sentences are deliberately consistent within one voice. They explain behavior clearly without referring to “options below” or an “attached button.”

---

## 2. Submission contract

| Field | Value |
|---|---|
| Suggested Meta category | `UTILITY`, with `allow_category_change: true` |
| Language | `ar` |
| Header | `IMAGE` |
| Neutral footer | `أُرسلت هذه الدعوة عبر هلا` |
| Halaa type | `invite` |

Meta may reclassify a template. Use the returned classification and do not add promotional slogans to the footer.

### Body variables

| Placeholder | Halaa source | Example |
|---|---|---|
| `{{1}}` | `guest.name` | `عبدالله الشهري` |
| `{{2}}` | `eventDetails.title` | Category-specific title |
| `{{3}}` | `eventDetails.dateFormatted` | `الجمعة 15 أغسطس 2026` |
| `{{4}}` | `eventDetails.time` | `8:30 مساءً` |
| `{{5}}` | `eventDetails.location.address` | `قاعة ليلتي، جدة` |

Event titles are wrapped in Arabic quotation marks wherever practical so host-written titles remain grammatically contained.

### QR-only button

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
```

The URL variable is a separate button parameter. Confirm the production domain before submission.

---

## 3. Creative matrix

| Category | Warm | Classic | Modern | Intimate | Heritage |
|---|---|---|---|---|---|
| الزفاف `wedding` | بين الأقرب إلينا | دعوة العائلتين | موعد فرحتنا | هذه الدعوة لك | حضورك شرف |
| الخطوبة `engagement` | نحتفل بهذه الخطوة | إعلان الخطوبة | صار الخبر رسميًا | أردنا أن تسمع الخبر منا | بفرح وسرور |
| عيد الميلاد `birthday` | احتفال بين الأحبة | أمسية عيد ميلاد | الكيكة جاهزة | احتفال بسيط | لمّة العائلة |
| استقبال المولود `baby_shower` | فرحتنا بقدومه | دعوة العقيقة | الضيف الصغير في الطريق | لقاء صغيرنا | الحمد لله على تمام النعمة |
| المناسبة النسائية `ladies_event` | أمسية بصحبة جميلة | دعوة نسائية رسمية | لقاء الصديقات | ليلة العروس | أمسية من أصالتنا |
| المناسبة العامة `general_event` | لقاء يجمعنا | دعوة رسمية | لحظة تستحق الاحتفال | بداية جديدة | لمّة ومناسبة |
| المؤتمر `conference` | لقاء المجتمع المهني | الدعوة التنفيذية | ملتقى الابتكار | جلسة عملية | ملتقى بضيافة سعودية |

---

## 4. Wedding — الزفاف `wedding`

### 4.1 بين الأقرب إلينا — الدافئة `warm`

**Best for:** حفلات الزفاف العائلية والدعوات الموجّهة للأصدقاء والمقرّبين.

**Meta sample title:** `حفل زفاف أحمد ونورة`

#### 4.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_warm_reply_qr_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

اخترنا أن نشارك فرحتنا مع الأشخاص الأقرب إلينا، وأنت من بينهم. ندعوك إلى «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل حضورك. بعد تأكيد الحضور، نرسل لك رمز الدخول الخاص بك.
نفرح بلقائك في هذا اليوم 🤍
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_warm_reply_only_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

اخترنا أن نشارك فرحتنا مع الأشخاص الأقرب إلينا، وأنت من بينهم. ندعوك إلى «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل حضورك، وننتظر ردّك.
نفرح بلقائك في هذا اليوم 🤍
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_warm_qr_only_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `warm`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

اخترنا أن نشارك فرحتنا مع الأشخاص الأقرب إلينا، وأنت من بينهم. ندعوك إلى «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز دخولك جاهز عبر زر «عرض رمز الدخول» لاستخدامه عند الوصول.
نفرح بلقائك في هذا اليوم 🤍
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 4.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_warm_none_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `warm`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

اخترنا أن نشارك فرحتنا مع الأشخاص الأقرب إلينا، وأنت من بينهم. ندعوك إلى «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

نفرح بلقائك في هذا اليوم 🤍
```

**Buttons:** none

---

### 4.2 دعوة العائلتين — الكلاسيكية `classic`

**Best for:** حفلات القاعات الكبيرة والدعوات الرسمية الصادرة باسم العائلتين.

**Meta sample title:** `حفل زفاف خالد وسارة`

#### 4.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_classic_reply_qr_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا بك {{1}}،

تتشرّف العائلتان بدعوتك لحضور «{{2}}».
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نرجو التكرّم بتأكيد الحضور؛ وبعد التأكيد ستصلك بطاقة الدخول الخاصة بك.
حضورك موضع تقدير العائلتين.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_classic_reply_only_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا بك {{1}}،

تتشرّف العائلتان بدعوتك لحضور «{{2}}».
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نرجو التكرّم بتأكيد الحضور.
حضورك موضع تقدير العائلتين.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_classic_qr_only_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `classic`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا بك {{1}}،

تتشرّف العائلتان بدعوتك لحضور «{{2}}».
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر زر «عرض رمز الدخول» لتقديمها عند الوصول.
حضورك موضع تقدير العائلتين.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 4.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_classic_none_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `classic`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا بك {{1}}،

تتشرّف العائلتان بدعوتك لحضور «{{2}}».
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

حضورك موضع تقدير العائلتين.
```

**Buttons:** none

---

### 4.3 موعد فرحتنا — العصرية `modern`

**Best for:** حفلات الزفاف الحديثة ذات الأسلوب البسيط والخفيف.

**Meta sample title:** `ليلة زفاف فيصل ولين`

#### 4.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_modern_reply_qr_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 🤍

فرحتنا لها موعد، ومكانك معنا في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

ننتظر ردّك، وإذا أكدت حضورك يصلك رمز الدخول مباشرة.
نشوفك في ليلتنا.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_modern_reply_only_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🤍

فرحتنا لها موعد، ومكانك معنا في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

ننتظر ردّك.
نشوفك في ليلتنا.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_modern_qr_only_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `modern`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🤍

فرحتنا لها موعد، ومكانك معنا في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

رمز الدخول جاهز عبر زر «عرض رمز الدخول».
نشوفك في ليلتنا.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 4.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_modern_none_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `modern`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🤍

فرحتنا لها موعد، ومكانك معنا في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

نشوفك في ليلتنا.
```

**Buttons:** none

---

### 4.4 هذه الدعوة لك — الشخصية `intimate`

**Best for:** حفلات الزفاف الصغيرة التي تقتصر على الدائرة المقرّبة.

**Meta sample title:** `حفل زفاف عمر ومها`

#### 4.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_intimate_reply_qr_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
هذه الدعوة لك يا {{1}}، لأننا نريدك معنا في «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

نأمل أن نراك معنا. بعد تأكيد حضورك، نرسل لك رمز الدخول.
مشاركتك هذا اليوم تعني لنا الكثير.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_intimate_reply_only_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
هذه الدعوة لك يا {{1}}، لأننا نريدك معنا في «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

نأمل أن نراك معنا، وننتظر ردّك.
مشاركتك هذا اليوم تعني لنا الكثير.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_intimate_qr_only_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `intimate`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
هذه الدعوة لك يا {{1}}، لأننا نريدك معنا في «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

ستجد رمز دخولك عبر زر «عرض رمز الدخول» عند وصولك.
مشاركتك هذا اليوم تعني لنا الكثير.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 4.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_intimate_none_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `intimate`
- **Halaa invitation mode:** `none`

**Body**

```text
هذه الدعوة لك يا {{1}}، لأننا نريدك معنا في «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

مشاركتك هذا اليوم تعني لنا الكثير.
```

**Buttons:** none

---

### 4.5 حضورك شرف — الأصيلة `heritage`

**Best for:** الزفاف الخليجي والدعوات العائلية ذات الطابع التقليدي.

**Meta sample title:** `ليلة زفاف عبدالله والجوهرة`

#### 4.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_heritage_reply_qr_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاك الله {{1}}،

تتشرّف العائلة بدعوتك إلى «{{2}}»، ومشاركتنا فرحتها.
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو تأكيد حضورك؛ وبعده يصلك رمز الدخول المخصّص لك.
حضورك شرف لنا، ولقاؤك سرور.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_heritage_reply_only_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاك الله {{1}}،

تتشرّف العائلة بدعوتك إلى «{{2}}»، ومشاركتنا فرحتها.
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو تأكيد حضورك.
حضورك شرف لنا، ولقاؤك سرور.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 4.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_heritage_qr_only_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `heritage`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاك الله {{1}}،

تتشرّف العائلة بدعوتك إلى «{{2}}»، ومشاركتنا فرحتها.
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز دخولك المخصّص لك متاح عبر زر «عرض رمز الدخول».
حضورك شرف لنا، ولقاؤك سرور.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 4.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_heritage_none_ar_v2`
- **Halaa category:** `wedding`
- **Voice:** `heritage`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاك الله {{1}}،

تتشرّف العائلة بدعوتك إلى «{{2}}»، ومشاركتنا فرحتها.
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

حضورك شرف لنا، ولقاؤك سرور.
```

**Buttons:** none

---

## 5. Engagement — الخطوبة `engagement`

### 5.1 نحتفل بهذه الخطوة — الدافئة `warm`

**Best for:** الخطوبة العائلية والدعوات الدافئة للأصدقاء.

**Meta sample title:** `حفل خطوبة خالد وسارة`

#### 5.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_warm_reply_qr_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

سعدنا بهذه الخطوة، والأجمل أن نحتفل بها مع أهلنا وأصدقائنا. ندعوك إلى «{{2}}».
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل حضورك. بعد تأكيد الحضور، نرسل لك رمز الدخول الخاص بك.
نتمنى أن تشاركنا هذا اليوم 🤍
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_warm_reply_only_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

سعدنا بهذه الخطوة، والأجمل أن نحتفل بها مع أهلنا وأصدقائنا. ندعوك إلى «{{2}}».
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل حضورك، وننتظر ردّك.
نتمنى أن تشاركنا هذا اليوم 🤍
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_warm_qr_only_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `warm`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

سعدنا بهذه الخطوة، والأجمل أن نحتفل بها مع أهلنا وأصدقائنا. ندعوك إلى «{{2}}».
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز دخولك جاهز عبر زر «عرض رمز الدخول» لاستخدامه عند الوصول.
نتمنى أن تشاركنا هذا اليوم 🤍
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 5.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_warm_none_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `warm`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

سعدنا بهذه الخطوة، والأجمل أن نحتفل بها مع أهلنا وأصدقائنا. ندعوك إلى «{{2}}».
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نتمنى أن تشاركنا هذا اليوم 🤍
```

**Buttons:** none

---

### 5.2 إعلان الخطوبة — الكلاسيكية `classic`

**Best for:** حفلات الخطوبة الرسمية ودعوات العائلتين.

**Meta sample title:** `حفل خطوبة راشد وريم`

#### 5.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_classic_reply_qr_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا بك {{1}}،

بمناسبة الخطوبة، تتشرّف العائلتان بدعوتك إلى «{{2}}».
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نرجو التكرّم بتأكيد الحضور؛ وبعد التأكيد ستصلك بطاقة الدخول الخاصة بك.
نسعد بمشاركتك لنا هذه المناسبة.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_classic_reply_only_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا بك {{1}}،

بمناسبة الخطوبة، تتشرّف العائلتان بدعوتك إلى «{{2}}».
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نرجو التكرّم بتأكيد الحضور.
نسعد بمشاركتك لنا هذه المناسبة.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_classic_qr_only_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `classic`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا بك {{1}}،

بمناسبة الخطوبة، تتشرّف العائلتان بدعوتك إلى «{{2}}».
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر زر «عرض رمز الدخول» لتقديمها عند الوصول.
نسعد بمشاركتك لنا هذه المناسبة.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 5.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_classic_none_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `classic`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا بك {{1}}،

بمناسبة الخطوبة، تتشرّف العائلتان بدعوتك إلى «{{2}}».
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نسعد بمشاركتك لنا هذه المناسبة.
```

**Buttons:** none

---

### 5.3 صار الخبر رسميًا — العصرية `modern`

**Best for:** الاحتفالات العصرية بين الأصدقاء والأقارب.

**Meta sample title:** `ليلة خطوبة نواف ودانة`

#### 5.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_modern_reply_qr_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} ✨

صار الخبر رسميًا، وحان وقت الاحتفال في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

ننتظر ردّك، وإذا أكدت حضورك يصلك رمز الدخول مباشرة.
مكانك معنا في البداية.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_modern_reply_only_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} ✨

صار الخبر رسميًا، وحان وقت الاحتفال في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

ننتظر ردّك.
مكانك معنا في البداية.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_modern_qr_only_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `modern`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} ✨

صار الخبر رسميًا، وحان وقت الاحتفال في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

رمز الدخول جاهز عبر زر «عرض رمز الدخول».
مكانك معنا في البداية.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 5.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_modern_none_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `modern`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} ✨

صار الخبر رسميًا، وحان وقت الاحتفال في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

مكانك معنا في البداية.
```

**Buttons:** none

---

### 5.4 أردنا أن تسمع الخبر منا — الشخصية `intimate`

**Best for:** الخطوبة الصغيرة ومشاركة الخبر مع المقرّبين.

**Meta sample title:** `خطوبة سامي ولطيفة`

#### 5.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_intimate_reply_qr_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أردنا أن نشاركك الخبر بأنفسنا يا {{1}}، وأن ندعوك إلى «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

نأمل أن نراك معنا. بعد تأكيد حضورك، نرسل لك رمز الدخول.
قربك في هذا اليوم مهم لنا.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_intimate_reply_only_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أردنا أن نشاركك الخبر بأنفسنا يا {{1}}، وأن ندعوك إلى «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

نأمل أن نراك معنا، وننتظر ردّك.
قربك في هذا اليوم مهم لنا.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_intimate_qr_only_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `intimate`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أردنا أن نشاركك الخبر بأنفسنا يا {{1}}، وأن ندعوك إلى «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

ستجد رمز دخولك عبر زر «عرض رمز الدخول» عند وصولك.
قربك في هذا اليوم مهم لنا.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 5.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_intimate_none_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `intimate`
- **Halaa invitation mode:** `none`

**Body**

```text
أردنا أن نشاركك الخبر بأنفسنا يا {{1}}، وأن ندعوك إلى «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

قربك في هذا اليوم مهم لنا.
```

**Buttons:** none

---

### 5.5 بفرح وسرور — الأصيلة `heritage`

**Best for:** دعوات الخطوبة الخليجية الصادرة باسم العائلتين.

**Meta sample title:** `حفل خطوبة أبناء العائلتين`

#### 5.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_heritage_reply_qr_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاك الله {{1}}،

بفرح وسرور، تتشرّف العائلتان بدعوتك إلى «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو تأكيد حضورك؛ وبعده يصلك رمز الدخول المخصّص لك.
حضورك يسعد العائلتين.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_heritage_reply_only_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاك الله {{1}}،

بفرح وسرور، تتشرّف العائلتان بدعوتك إلى «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو تأكيد حضورك.
حضورك يسعد العائلتين.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 5.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_heritage_qr_only_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `heritage`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاك الله {{1}}،

بفرح وسرور، تتشرّف العائلتان بدعوتك إلى «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز دخولك المخصّص لك متاح عبر زر «عرض رمز الدخول».
حضورك يسعد العائلتين.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 5.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_heritage_none_ar_v2`
- **Halaa category:** `engagement`
- **Voice:** `heritage`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاك الله {{1}}،

بفرح وسرور، تتشرّف العائلتان بدعوتك إلى «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

حضورك يسعد العائلتين.
```

**Buttons:** none

---

## 6. Birthday — عيد الميلاد `birthday`

### 6.1 احتفال بين الأحبة — الدافئة `warm`

**Best for:** أعياد الميلاد العائلية والاحتفالات مع الأصدقاء المقرّبين.

**Meta sample title:** `عيد ميلاد ليان`

#### 6.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_warm_reply_qr_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

نجتمع في «{{2}}» مع الأشخاص الذين يجعلون أيامنا أجمل.
الحفلة يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل حضورك. بعد تأكيد الحضور، نرسل لك رمز الدخول الخاص بك.
يسعدنا أن تحتفل معنا 🎈
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_warm_reply_only_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

نجتمع في «{{2}}» مع الأشخاص الذين يجعلون أيامنا أجمل.
الحفلة يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل حضورك، وننتظر ردّك.
يسعدنا أن تحتفل معنا 🎈
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_warm_qr_only_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `warm`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

نجتمع في «{{2}}» مع الأشخاص الذين يجعلون أيامنا أجمل.
الحفلة يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز دخولك جاهز عبر زر «عرض رمز الدخول» لاستخدامه عند الوصول.
يسعدنا أن تحتفل معنا 🎈
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 6.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_warm_none_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `warm`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

نجتمع في «{{2}}» مع الأشخاص الذين يجعلون أيامنا أجمل.
الحفلة يوم {{3}}، الساعة {{4}}، في {{5}}.

يسعدنا أن تحتفل معنا 🎈
```

**Buttons:** none

---

### 6.2 أمسية عيد ميلاد — الكلاسيكية `classic`

**Best for:** أعياد ميلاد الكبار والأمسيات الهادئة.

**Meta sample title:** `أمسية عيد ميلاد نورة`

#### 6.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_classic_reply_qr_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا دعوتك إلى «{{2}}» للاحتفال بعام جديد بصحبة العائلة والأصدقاء.
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نرجو التكرّم بتأكيد الحضور؛ وبعد التأكيد ستصلك بطاقة الدخول الخاصة بك.
نتطلع إلى مشاركتك هذه الأمسية.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_classic_reply_only_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا دعوتك إلى «{{2}}» للاحتفال بعام جديد بصحبة العائلة والأصدقاء.
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نرجو التكرّم بتأكيد الحضور.
نتطلع إلى مشاركتك هذه الأمسية.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_classic_qr_only_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `classic`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا دعوتك إلى «{{2}}» للاحتفال بعام جديد بصحبة العائلة والأصدقاء.
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر زر «عرض رمز الدخول» لتقديمها عند الوصول.
نتطلع إلى مشاركتك هذه الأمسية.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 6.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_classic_none_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `classic`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا دعوتك إلى «{{2}}» للاحتفال بعام جديد بصحبة العائلة والأصدقاء.
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نتطلع إلى مشاركتك هذه الأمسية.
```

**Buttons:** none

---

### 6.3 الكيكة جاهزة — العصرية `modern`

**Best for:** حفلات الشباب والأطفال ذات الطابع المرح.

**Meta sample title:** `عيد ميلاد يوسف الخامس`

#### 6.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_modern_reply_qr_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 🥳

الكيكة جاهزة، والحفلة ما تكمل من دونك في «{{2}}».

🎈 {{3}} · {{4}}
📍 {{5}}

ننتظر ردّك، وإذا أكدت حضورك يصلك رمز الدخول مباشرة.
نشوفك هناك! 🎉
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_modern_reply_only_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🥳

الكيكة جاهزة، والحفلة ما تكمل من دونك في «{{2}}».

🎈 {{3}} · {{4}}
📍 {{5}}

ننتظر ردّك.
نشوفك هناك! 🎉
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_modern_qr_only_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `modern`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🥳

الكيكة جاهزة، والحفلة ما تكمل من دونك في «{{2}}».

🎈 {{3}} · {{4}}
📍 {{5}}

رمز الدخول جاهز عبر زر «عرض رمز الدخول».
نشوفك هناك! 🎉
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 6.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_modern_none_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `modern`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🥳

الكيكة جاهزة، والحفلة ما تكمل من دونك في «{{2}}».

🎈 {{3}} · {{4}}
📍 {{5}}

نشوفك هناك! 🎉
```

**Buttons:** none

---

### 6.4 احتفال بسيط — الشخصية `intimate`

**Best for:** أعياد الميلاد المنزلية واللقاءات الصغيرة.

**Meta sample title:** `عيد ميلاد الوالدة`

#### 6.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_intimate_reply_qr_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
هذه الدعوة لك يا {{1}}. اخترنا أن يكون «{{2}}» لقاءً بسيطًا مع المقرّبين.

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

نأمل أن نراك معنا. بعد تأكيد حضورك، نرسل لك رمز الدخول.
يكفينا أن تكون معنا.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_intimate_reply_only_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
هذه الدعوة لك يا {{1}}. اخترنا أن يكون «{{2}}» لقاءً بسيطًا مع المقرّبين.

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

نأمل أن نراك معنا، وننتظر ردّك.
يكفينا أن تكون معنا.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_intimate_qr_only_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `intimate`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
هذه الدعوة لك يا {{1}}. اخترنا أن يكون «{{2}}» لقاءً بسيطًا مع المقرّبين.

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

ستجد رمز دخولك عبر زر «عرض رمز الدخول» عند وصولك.
يكفينا أن تكون معنا.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 6.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_intimate_none_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `intimate`
- **Halaa invitation mode:** `none`

**Body**

```text
هذه الدعوة لك يا {{1}}. اخترنا أن يكون «{{2}}» لقاءً بسيطًا مع المقرّبين.

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

يكفينا أن تكون معنا.
```

**Buttons:** none

---

### 6.5 لمّة العائلة — الأصيلة `heritage`

**Best for:** أعياد الميلاد العائلية الكبيرة ولمّات الأقارب.

**Meta sample title:** `احتفال العائلة بعيد ميلاد الوالد`

#### 6.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_heritage_reply_qr_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاك الله {{1}}،

تجمعنا العائلة للاحتفال في «{{2}}»، ويسرّنا حضورك بين أهلك.
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو تأكيد حضورك؛ وبعده يصلك رمز الدخول المخصّص لك.
مكانك محفوظ، ولقاؤك يسعدنا.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_heritage_reply_only_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاك الله {{1}}،

تجمعنا العائلة للاحتفال في «{{2}}»، ويسرّنا حضورك بين أهلك.
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو تأكيد حضورك.
مكانك محفوظ، ولقاؤك يسعدنا.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 6.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_heritage_qr_only_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `heritage`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاك الله {{1}}،

تجمعنا العائلة للاحتفال في «{{2}}»، ويسرّنا حضورك بين أهلك.
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز دخولك المخصّص لك متاح عبر زر «عرض رمز الدخول».
مكانك محفوظ، ولقاؤك يسعدنا.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 6.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_heritage_none_ar_v2`
- **Halaa category:** `birthday`
- **Voice:** `heritage`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاك الله {{1}}،

تجمعنا العائلة للاحتفال في «{{2}}»، ويسرّنا حضورك بين أهلك.
نلتقي يوم {{3}}، الساعة {{4}}، في {{5}}.

مكانك محفوظ، ولقاؤك يسعدنا.
```

**Buttons:** none

---

## 7. Baby shower — استقبال المولود `baby_shower`

### 7.1 فرحتنا بقدومه — الدافئة `warm`

**Best for:** استقبال المولود بعد الولادة مع الأهل والأصدقاء.

**Meta sample title:** `استقبال مولودنا يوسف`

#### 7.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_warm_reply_qr_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

رزقنا الله صغيرًا ملأ بيتنا فرحًا، ونحب أن تشاركنا «{{2}}».
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل حضورك. بعد تأكيد الحضور، نرسل لك رمز الدخول الخاص بك.
نسعد بلقائك ودعواتك الطيبة 🤍
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_warm_reply_only_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

رزقنا الله صغيرًا ملأ بيتنا فرحًا، ونحب أن تشاركنا «{{2}}».
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل حضورك، وننتظر ردّك.
نسعد بلقائك ودعواتك الطيبة 🤍
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_warm_qr_only_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `warm`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

رزقنا الله صغيرًا ملأ بيتنا فرحًا، ونحب أن تشاركنا «{{2}}».
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز دخولك جاهز عبر زر «عرض رمز الدخول» لاستخدامه عند الوصول.
نسعد بلقائك ودعواتك الطيبة 🤍
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 7.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_warm_none_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `warm`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

رزقنا الله صغيرًا ملأ بيتنا فرحًا، ونحب أن تشاركنا «{{2}}».
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نسعد بلقائك ودعواتك الطيبة 🤍
```

**Buttons:** none

---

### 7.2 دعوة العقيقة — الكلاسيكية `classic`

**Best for:** العقيقة ومناسبات الشكر ذات الطابع الرسمي.

**Meta sample title:** `عقيقة مولودنا عبدالله`

#### 7.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_classic_reply_qr_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا بك {{1}}،

حمدًا لله على تمام النعمة، يسرّنا دعوتك إلى «{{2}}».
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نرجو التكرّم بتأكيد الحضور؛ وبعد التأكيد ستصلك بطاقة الدخول الخاصة بك.
نسعد بحضورك ودعائك للمولود.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_classic_reply_only_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا بك {{1}}،

حمدًا لله على تمام النعمة، يسرّنا دعوتك إلى «{{2}}».
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نرجو التكرّم بتأكيد الحضور.
نسعد بحضورك ودعائك للمولود.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_classic_qr_only_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `classic`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا بك {{1}}،

حمدًا لله على تمام النعمة، يسرّنا دعوتك إلى «{{2}}».
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر زر «عرض رمز الدخول» لتقديمها عند الوصول.
نسعد بحضورك ودعائك للمولود.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 7.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_classic_none_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `classic`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا بك {{1}}،

حمدًا لله على تمام النعمة، يسرّنا دعوتك إلى «{{2}}».
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نسعد بحضورك ودعائك للمولود.
```

**Buttons:** none

---

### 7.3 الضيف الصغير في الطريق — العصرية `modern`

**Best for:** حفلات ما قبل الولادة والـBaby Shower.

**Meta sample title:** `حفل استقبال صغيرنا القادم`

#### 7.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_modern_reply_qr_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 🧸

الضيف الصغير في الطريق، وحان وقت الاحتفال في «{{2}}».

🗓️ {{3}} · {{4}}
📍 {{5}}

ننتظر ردّك، وإذا أكدت حضورك يصلك رمز الدخول مباشرة.
ننتظرك للاحتفال معنا 🤍
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_modern_reply_only_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🧸

الضيف الصغير في الطريق، وحان وقت الاحتفال في «{{2}}».

🗓️ {{3}} · {{4}}
📍 {{5}}

ننتظر ردّك.
ننتظرك للاحتفال معنا 🤍
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_modern_qr_only_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `modern`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🧸

الضيف الصغير في الطريق، وحان وقت الاحتفال في «{{2}}».

🗓️ {{3}} · {{4}}
📍 {{5}}

رمز الدخول جاهز عبر زر «عرض رمز الدخول».
ننتظرك للاحتفال معنا 🤍
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 7.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_modern_none_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `modern`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🧸

الضيف الصغير في الطريق، وحان وقت الاحتفال في «{{2}}».

🗓️ {{3}} · {{4}}
📍 {{5}}

ننتظرك للاحتفال معنا 🤍
```

**Buttons:** none

---

### 7.4 لقاء صغيرنا — الشخصية `intimate`

**Best for:** الزيارات المنزلية والاستقبالات الصغيرة بعد الولادة.

**Meta sample title:** `لقاء الأحبة بمناسبة قدوم صغيرنا`

#### 7.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_intimate_reply_qr_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
هذه الدعوة لك يا {{1}}، لنشاركك فرحة صغيرنا في «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

نأمل أن نراك معنا. بعد تأكيد حضورك، نرسل لك رمز الدخول.
ننتظرك في لقاء عائلي بسيط.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_intimate_reply_only_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
هذه الدعوة لك يا {{1}}، لنشاركك فرحة صغيرنا في «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

نأمل أن نراك معنا، وننتظر ردّك.
ننتظرك في لقاء عائلي بسيط.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_intimate_qr_only_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `intimate`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
هذه الدعوة لك يا {{1}}، لنشاركك فرحة صغيرنا في «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

ستجد رمز دخولك عبر زر «عرض رمز الدخول» عند وصولك.
ننتظرك في لقاء عائلي بسيط.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 7.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_intimate_none_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `intimate`
- **Halaa invitation mode:** `none`

**Body**

```text
هذه الدعوة لك يا {{1}}، لنشاركك فرحة صغيرنا في «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

ننتظرك في لقاء عائلي بسيط.
```

**Buttons:** none

---

### 7.5 الحمد لله على تمام النعمة — الأصيلة `heritage`

**Best for:** استقبال المولود الخليجي بصياغة عائلية تقليدية.

**Meta sample title:** `استقبال مولودتنا جود`

#### 7.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_heritage_reply_qr_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاك الله {{1}}،

الحمد لله على تمام النعمة. تتشرّف العائلة بدعوتك إلى «{{2}}».
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو تأكيد حضورك؛ وبعده يصلك رمز الدخول المخصّص لك.
حضورك ودعاؤك للمولود يسعداننا.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_heritage_reply_only_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاك الله {{1}}،

الحمد لله على تمام النعمة. تتشرّف العائلة بدعوتك إلى «{{2}}».
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو تأكيد حضورك.
حضورك ودعاؤك للمولود يسعداننا.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 7.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_heritage_qr_only_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `heritage`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاك الله {{1}}،

الحمد لله على تمام النعمة. تتشرّف العائلة بدعوتك إلى «{{2}}».
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز دخولك المخصّص لك متاح عبر زر «عرض رمز الدخول».
حضورك ودعاؤك للمولود يسعداننا.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 7.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_heritage_none_ar_v2`
- **Halaa category:** `baby_shower`
- **Voice:** `heritage`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاك الله {{1}}،

الحمد لله على تمام النعمة. تتشرّف العائلة بدعوتك إلى «{{2}}».
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

حضورك ودعاؤك للمولود يسعداننا.
```

**Buttons:** none

---

## 8. Ladies' event — المناسبة النسائية `ladies_event`

### 8.1 أمسية بصحبة جميلة — الدافئة `warm`

**Best for:** التجمعات النسائية العامة والأمسيات الاجتماعية.

**Meta sample title:** `أمسية الورد`

#### 8.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_warm_reply_qr_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

أعددنا أمسية هادئة بصحبة نساء نحبهن، ويسعدنا حضورك في «{{2}}».
الأمسية يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل حضورك. بعد تأكيد الحضور، نرسل لك رمز الدخول الخاص بك.
بانتظارك بكل ود ✨
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_warm_reply_only_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

أعددنا أمسية هادئة بصحبة نساء نحبهن، ويسعدنا حضورك في «{{2}}».
الأمسية يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل حضورك، وننتظر ردّك.
بانتظارك بكل ود ✨
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_warm_qr_only_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `warm`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

أعددنا أمسية هادئة بصحبة نساء نحبهن، ويسعدنا حضورك في «{{2}}».
الأمسية يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز دخولك جاهز عبر زر «عرض رمز الدخول» لاستخدامه عند الوصول.
بانتظارك بكل ود ✨
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 8.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_warm_none_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `warm`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

أعددنا أمسية هادئة بصحبة نساء نحبهن، ويسعدنا حضورك في «{{2}}».
الأمسية يوم {{3}}، الساعة {{4}}، في {{5}}.

بانتظارك بكل ود ✨
```

**Buttons:** none

---

### 8.2 دعوة نسائية رسمية — الكلاسيكية `classic`

**Best for:** حفلات الاستقبال والأمسيات النسائية الرسمية.

**Meta sample title:** `أمسية أناقة وإلهام`

#### 8.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_classic_reply_qr_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا دعوتك إلى «{{2}}»، ونعتز بأن تكوني بين ضيفاتنا.
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نرجو التكرّم بتأكيد الحضور؛ وبعد التأكيد ستصلك بطاقة الدخول الخاصة بك.
نتطلع إلى الترحيب بك.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_classic_reply_only_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا دعوتك إلى «{{2}}»، ونعتز بأن تكوني بين ضيفاتنا.
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نرجو التكرّم بتأكيد الحضور.
نتطلع إلى الترحيب بك.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_classic_qr_only_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `classic`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا دعوتك إلى «{{2}}»، ونعتز بأن تكوني بين ضيفاتنا.
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر زر «عرض رمز الدخول» لتقديمها عند الوصول.
نتطلع إلى الترحيب بك.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 8.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_classic_none_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `classic`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا دعوتك إلى «{{2}}»، ونعتز بأن تكوني بين ضيفاتنا.
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نتطلع إلى الترحيب بك.
```

**Buttons:** none

---

### 8.3 لقاء الصديقات — العصرية `modern`

**Best for:** الجلسات الخفيفة ولقاءات الصديقات.

**Meta sample title:** `لقاء الصديقات`

#### 8.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_modern_reply_qr_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 💫

مساء خفيف، وضحكات كثيرة، ومكانك معنا في «{{2}}».

✨ {{3}} · {{4}}
📍 {{5}}

ننتظر ردّك، وإذا أكدت حضورك يصلك رمز الدخول مباشرة.
لا يكتمل اللقاء من دونك.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_modern_reply_only_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 💫

مساء خفيف، وضحكات كثيرة، ومكانك معنا في «{{2}}».

✨ {{3}} · {{4}}
📍 {{5}}

ننتظر ردّك.
لا يكتمل اللقاء من دونك.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_modern_qr_only_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `modern`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 💫

مساء خفيف، وضحكات كثيرة، ومكانك معنا في «{{2}}».

✨ {{3}} · {{4}}
📍 {{5}}

رمز الدخول جاهز عبر زر «عرض رمز الدخول».
لا يكتمل اللقاء من دونك.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 8.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_modern_none_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `modern`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 💫

مساء خفيف، وضحكات كثيرة، ومكانك معنا في «{{2}}».

✨ {{3}} · {{4}}
📍 {{5}}

لا يكتمل اللقاء من دونك.
```

**Buttons:** none

---

### 8.4 ليلة العروس — الشخصية `intimate`

**Best for:** الحناء ووداع العزوبية والاحتفال المقرّب بالعروس.

**Meta sample title:** `ليلة حناء العروس دانة`

#### 8.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_intimate_reply_qr_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
هذه الدعوة لك يا {{1}}، لأن العروس تريد أقرب الناس إليها في «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

نأمل أن نراك معنا. بعد تأكيد حضورك، نرسل لك رمز الدخول.
مشاركتك ستعني لها الكثير.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_intimate_reply_only_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
هذه الدعوة لك يا {{1}}، لأن العروس تريد أقرب الناس إليها في «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

نأمل أن نراك معنا، وننتظر ردّك.
مشاركتك ستعني لها الكثير.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_intimate_qr_only_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `intimate`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
هذه الدعوة لك يا {{1}}، لأن العروس تريد أقرب الناس إليها في «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

ستجد رمز دخولك عبر زر «عرض رمز الدخول» عند وصولك.
مشاركتك ستعني لها الكثير.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 8.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_intimate_none_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `intimate`
- **Halaa invitation mode:** `none`

**Body**

```text
هذه الدعوة لك يا {{1}}، لأن العروس تريد أقرب الناس إليها في «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

مشاركتك ستعني لها الكثير.
```

**Buttons:** none

---

### 8.5 أمسية من أصالتنا — الأصيلة `heritage`

**Best for:** المناسبات النسائية التراثية والأمسيات الخليجية.

**Meta sample title:** `ليلة تراث وأصالة`

#### 8.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_heritage_reply_qr_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاكِ الله {{1}}،

في أمسية تجمع الود والأصالة، تتشرّف المضيفة بدعوتك إلى «{{2}}».
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو تأكيد حضورك؛ وبعده يصلك رمز الدخول المخصّص لك.
حضورك يزيد الأمسية بهجة.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_heritage_reply_only_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاكِ الله {{1}}،

في أمسية تجمع الود والأصالة، تتشرّف المضيفة بدعوتك إلى «{{2}}».
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو تأكيد حضورك.
حضورك يزيد الأمسية بهجة.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 8.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_heritage_qr_only_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `heritage`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاكِ الله {{1}}،

في أمسية تجمع الود والأصالة، تتشرّف المضيفة بدعوتك إلى «{{2}}».
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز دخولك المخصّص لك متاح عبر زر «عرض رمز الدخول».
حضورك يزيد الأمسية بهجة.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 8.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_heritage_none_ar_v2`
- **Halaa category:** `ladies_event`
- **Voice:** `heritage`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاكِ الله {{1}}،

في أمسية تجمع الود والأصالة، تتشرّف المضيفة بدعوتك إلى «{{2}}».
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

حضورك يزيد الأمسية بهجة.
```

**Buttons:** none

---

## 9. General event — المناسبة العامة `general_event`

### 9.1 لقاء يجمعنا — الدافئة `warm`

**Best for:** المناسبات العامة واللقاءات التي لا تحتاج نبرة متخصصة.

**Meta sample title:** `لقاء الأحبة`

#### 9.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_warm_reply_qr_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا {{1}}،

لدينا مناسبة نحب أن نشاركها مع الأشخاص المهمين لنا. ندعوك إلى «{{2}}».
اللقاء يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل حضورك. بعد تأكيد الحضور، نرسل لك رمز الدخول الخاص بك.
نأمل أن نلتقي بك هناك.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 9.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_warm_reply_only_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

لدينا مناسبة نحب أن نشاركها مع الأشخاص المهمين لنا. ندعوك إلى «{{2}}».
اللقاء يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل حضورك، وننتظر ردّك.
نأمل أن نلتقي بك هناك.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 9.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_warm_qr_only_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `warm`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

لدينا مناسبة نحب أن نشاركها مع الأشخاص المهمين لنا. ندعوك إلى «{{2}}».
اللقاء يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز دخولك جاهز عبر زر «عرض رمز الدخول» لاستخدامه عند الوصول.
نأمل أن نلتقي بك هناك.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 9.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_warm_none_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `warm`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

لدينا مناسبة نحب أن نشاركها مع الأشخاص المهمين لنا. ندعوك إلى «{{2}}».
اللقاء يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل أن نلتقي بك هناك.
```

**Buttons:** none

---

### 9.2 دعوة رسمية — الكلاسيكية `classic`

**Best for:** حفلات الاستقبال والتكريم والافتتاحات الرسمية.

**Meta sample title:** `حفل التكريم السنوي`

#### 9.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_classic_reply_qr_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا دعوتك إلى «{{2}}».
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نرجو التكرّم بتأكيد الحضور؛ وبعد التأكيد ستصلك بطاقة الدخول الخاصة بك.
نتطلع إلى حضورك.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 9.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_classic_reply_only_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا دعوتك إلى «{{2}}».
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نرجو التكرّم بتأكيد الحضور.
نتطلع إلى حضورك.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 9.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_classic_qr_only_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `classic`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا دعوتك إلى «{{2}}».
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر زر «عرض رمز الدخول» لتقديمها عند الوصول.
نتطلع إلى حضورك.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 9.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_classic_none_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `classic`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا دعوتك إلى «{{2}}».
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نتطلع إلى حضورك.
```

**Buttons:** none

---

### 9.3 لحظة تستحق الاحتفال — العصرية `modern`

**Best for:** التخرج والإنجازات والبدايات الجديدة.

**Meta sample title:** `حفل تخرج سارة`

#### 9.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_modern_reply_qr_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 🎓

حققنا خطوة مهمة، ونحب أن نحتفل بها معك في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

ننتظر ردّك، وإذا أكدت حضورك يصلك رمز الدخول مباشرة.
مكانك معنا في هذه اللحظة.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 9.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_modern_reply_only_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🎓

حققنا خطوة مهمة، ونحب أن نحتفل بها معك في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

ننتظر ردّك.
مكانك معنا في هذه اللحظة.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 9.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_modern_qr_only_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `modern`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🎓

حققنا خطوة مهمة، ونحب أن نحتفل بها معك في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

رمز الدخول جاهز عبر زر «عرض رمز الدخول».
مكانك معنا في هذه اللحظة.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 9.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_modern_none_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `modern`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🎓

حققنا خطوة مهمة، ونحب أن نحتفل بها معك في «{{2}}».

📅 {{3}} · {{4}}
📍 {{5}}

مكانك معنا في هذه اللحظة.
```

**Buttons:** none

---

### 9.4 بداية جديدة — الشخصية `intimate`

**Best for:** افتتاح منزل أو انتقال أو تقاعد أو محطة شخصية جديدة.

**Meta sample title:** `حفل افتتاح منزلنا الجديد`

#### 9.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_intimate_reply_qr_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
هذه الدعوة لك يا {{1}}، لتشاركنا بداية جديدة في «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

نأمل أن نراك معنا. بعد تأكيد حضورك، نرسل لك رمز الدخول.
يسعدنا أن تبدأ هذه الذكرى معك.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 9.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_intimate_reply_only_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
هذه الدعوة لك يا {{1}}، لتشاركنا بداية جديدة في «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

نأمل أن نراك معنا، وننتظر ردّك.
يسعدنا أن تبدأ هذه الذكرى معك.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 9.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_intimate_qr_only_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `intimate`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
هذه الدعوة لك يا {{1}}، لتشاركنا بداية جديدة في «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

ستجد رمز دخولك عبر زر «عرض رمز الدخول» عند وصولك.
يسعدنا أن تبدأ هذه الذكرى معك.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 9.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_intimate_none_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `intimate`
- **Halaa invitation mode:** `none`

**Body**

```text
هذه الدعوة لك يا {{1}}، لتشاركنا بداية جديدة في «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

يسعدنا أن تبدأ هذه الذكرى معك.
```

**Buttons:** none

---

### 9.5 لمّة ومناسبة — الأصيلة `heritage`

**Best for:** الأعياد والقرقيعان والإفطار واللقاءات العائلية الموسمية.

**Meta sample title:** `لقاء عيد الفطر`

#### 9.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_heritage_reply_qr_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاك الله {{1}}،

للمناسبة فرحتها، وللّمة أهلها. ندعوك إلى «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو تأكيد حضورك؛ وبعده يصلك رمز الدخول المخصّص لك.
حضورك يتمّم اللمّة ويسعدنا.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 9.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_heritage_reply_only_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاك الله {{1}}،

للمناسبة فرحتها، وللّمة أهلها. ندعوك إلى «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو تأكيد حضورك.
حضورك يتمّم اللمّة ويسعدنا.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 9.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_heritage_qr_only_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `heritage`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاك الله {{1}}،

للمناسبة فرحتها، وللّمة أهلها. ندعوك إلى «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز دخولك المخصّص لك متاح عبر زر «عرض رمز الدخول».
حضورك يتمّم اللمّة ويسعدنا.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 9.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_heritage_none_ar_v2`
- **Halaa category:** `general_event`
- **Voice:** `heritage`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاك الله {{1}}،

للمناسبة فرحتها، وللّمة أهلها. ندعوك إلى «{{2}}».
موعدنا يوم {{3}}، الساعة {{4}}، في {{5}}.

حضورك يتمّم اللمّة ويسعدنا.
```

**Buttons:** none

---

## 10. Conference — المؤتمر `conference`

### 10.1 لقاء المجتمع المهني — الدافئة `warm`

**Best for:** الملتقيات المجتمعية والمهنية ذات الطابع الترحيبي.

**Meta sample title:** `ملتقى مجتمع المصممين`

#### 10.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_warm_reply_qr_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
مرحبًا {{1}}،

يسرّنا حضورك في «{{2}}»، ومشاركة تجربتك مع الحضور.
يُقام اللقاء يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل حضورك. بعد تأكيد الحضور، نرسل لك رمز الدخول الخاص بك.
نأمل أن نلتقي بك ونسمع تجربتك.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 10.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_warm_reply_only_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `warm`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
مرحبًا {{1}}،

يسرّنا حضورك في «{{2}}»، ومشاركة تجربتك مع الحضور.
يُقام اللقاء يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل حضورك، وننتظر ردّك.
نأمل أن نلتقي بك ونسمع تجربتك.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 10.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_warm_qr_only_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `warm`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
مرحبًا {{1}}،

يسرّنا حضورك في «{{2}}»، ومشاركة تجربتك مع الحضور.
يُقام اللقاء يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز دخولك جاهز عبر زر «عرض رمز الدخول» لاستخدامه عند الوصول.
نأمل أن نلتقي بك ونسمع تجربتك.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 10.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_warm_none_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `warm`
- **Halaa invitation mode:** `none`

**Body**

```text
مرحبًا {{1}}،

يسرّنا حضورك في «{{2}}»، ومشاركة تجربتك مع الحضور.
يُقام اللقاء يوم {{3}}، الساعة {{4}}، في {{5}}.

نأمل أن نلتقي بك ونسمع تجربتك.
```

**Buttons:** none

---

### 10.2 الدعوة التنفيذية — الكلاسيكية `classic`

**Best for:** المؤتمرات الرسمية وملتقيات القيادات وصنّاع القرار.

**Meta sample title:** `ملتقى القيادات 2026`

#### 10.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_classic_reply_qr_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا دعوتك إلى «{{2}}»، لمناقشة محاوره وتبادل الخبرات.
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نرجو التكرّم بتأكيد الحضور؛ وبعد التأكيد ستصلك بطاقة الدخول الخاصة بك.
نتطلع إلى حضورك وإسهامك في اللقاء.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 10.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_classic_reply_only_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `classic`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا دعوتك إلى «{{2}}»، لمناقشة محاوره وتبادل الخبرات.
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نرجو التكرّم بتأكيد الحضور.
نتطلع إلى حضورك وإسهامك في اللقاء.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 10.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_classic_qr_only_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `classic`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا دعوتك إلى «{{2}}»، لمناقشة محاوره وتبادل الخبرات.
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر زر «عرض رمز الدخول» لتقديمها عند الوصول.
نتطلع إلى حضورك وإسهامك في اللقاء.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 10.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_classic_none_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `classic`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا بك {{1}}،

يسرّنا دعوتك إلى «{{2}}»، لمناقشة محاوره وتبادل الخبرات.
وذلك يوم {{3}}، في تمام الساعة {{4}}، في {{5}}.

نتطلع إلى حضورك وإسهامك في اللقاء.
```

**Buttons:** none

---

### 10.3 ملتقى الابتكار — العصرية `modern`

**Best for:** ملتقيات التقنية والابتكار وريادة الأعمال.

**Meta sample title:** `ملتقى الابتكار الرقمي`

#### 10.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_modern_reply_qr_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
يا هلا {{1}} 🚀

في «{{2}}» نلتقي لمناقشة أفكار وتجارب جديدة.

📅 {{3}} · {{4}}
📍 {{5}}

ننتظر ردّك، وإذا أكدت حضورك يصلك رمز الدخول مباشرة.
ننتظر الفكرة التي ستضيفها.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 10.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_modern_reply_only_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `modern`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🚀

في «{{2}}» نلتقي لمناقشة أفكار وتجارب جديدة.

📅 {{3}} · {{4}}
📍 {{5}}

ننتظر ردّك.
ننتظر الفكرة التي ستضيفها.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 10.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_modern_qr_only_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `modern`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🚀

في «{{2}}» نلتقي لمناقشة أفكار وتجارب جديدة.

📅 {{3}} · {{4}}
📍 {{5}}

رمز الدخول جاهز عبر زر «عرض رمز الدخول».
ننتظر الفكرة التي ستضيفها.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 10.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_modern_none_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `modern`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🚀

في «{{2}}» نلتقي لمناقشة أفكار وتجارب جديدة.

📅 {{3}} · {{4}}
📍 {{5}}

ننتظر الفكرة التي ستضيفها.
```

**Buttons:** none

---

### 10.4 جلسة عملية — الشخصية `intimate`

**Best for:** ورش العمل والجلسات التدريبية محدودة العدد.

**Meta sample title:** `ورشة بناء العلامات التجارية`

#### 10.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_intimate_reply_qr_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
هذه الدعوة لك يا {{1}}، للمشاركة في جلسة عملية ومركّزة ضمن «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

نأمل أن نراك معنا. بعد تأكيد حضورك، نرسل لك رمز الدخول.
ننتظر أسئلتك وتجربتك في الجلسة.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 10.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_intimate_reply_only_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `intimate`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
هذه الدعوة لك يا {{1}}، للمشاركة في جلسة عملية ومركّزة ضمن «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

نأمل أن نراك معنا، وننتظر ردّك.
ننتظر أسئلتك وتجربتك في الجلسة.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 10.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_intimate_qr_only_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `intimate`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
هذه الدعوة لك يا {{1}}، للمشاركة في جلسة عملية ومركّزة ضمن «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

ستجد رمز دخولك عبر زر «عرض رمز الدخول» عند وصولك.
ننتظر أسئلتك وتجربتك في الجلسة.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 10.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_intimate_none_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `intimate`
- **Halaa invitation mode:** `none`

**Body**

```text
هذه الدعوة لك يا {{1}}، للمشاركة في جلسة عملية ومركّزة ضمن «{{2}}».

نلتقي في {{5}}، يوم {{3}}، الساعة {{4}}.

ننتظر أسئلتك وتجربتك في الجلسة.
```

**Buttons:** none

---

### 10.5 ملتقى بضيافة سعودية — الأصيلة `heritage`

**Best for:** المنتديات والملتقيات المحلية ذات الطابع السعودي المرحّب.

**Meta sample title:** `منتدى رواد الأعمال`

#### 10.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_heritage_reply_qr_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_and_qr`

**Body**

```text
حيّاك الله {{1}}،

نعتز باستضافتك في «{{2}}»، للقاء الخبرات وبناء علاقات مهنية جديدة.
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو تأكيد حضورك؛ وبعده يصلك رمز الدخول المخصّص لك.
نرحّب بك، ونسعد بلقائك.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 10.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_heritage_reply_only_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `heritage`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
حيّاك الله {{1}}،

نعتز باستضافتك في «{{2}}»، للقاء الخبرات وبناء علاقات مهنية جديدة.
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرجو تأكيد حضورك.
نرحّب بك، ونسعد بلقائك.
```

**Quick replies:** `سأحضر` · `سأعتذر` · `ربما`

#### 10.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_heritage_qr_only_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `heritage`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
حيّاك الله {{1}}،

نعتز باستضافتك في «{{2}}»، للقاء الخبرات وبناء علاقات مهنية جديدة.
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

رمز دخولك المخصّص لك متاح عبر زر «عرض رمز الدخول».
نرحّب بك، ونسعد بلقائك.
```

**Dynamic URL button:** `عرض رمز الدخول`

#### 10.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_heritage_none_ar_v2`
- **Halaa category:** `conference`
- **Voice:** `heritage`
- **Halaa invitation mode:** `none`

**Body**

```text
حيّاك الله {{1}}،

نعتز باستضافتك في «{{2}}»، للقاء الخبرات وبناء علاقات مهنية جديدة.
نستقبلك يوم {{3}}، الساعة {{4}}، في {{5}}.

نرحّب بك، ونسعد بلقائك.
```

**Buttons:** none

---

## 11. Event-title test matrix

Before submission, render every direction with its sample title below. The copy must also be tested with one short title and one long title from real host data.

| Category | Titles covered by the five directions |
|---|---|
| الزفاف | `حفل زفاف أحمد ونورة` · `حفل زفاف خالد وسارة` · `ليلة زفاف فيصل ولين` · `حفل زفاف عمر ومها` · `ليلة زفاف عبدالله والجوهرة` |
| الخطوبة | `حفل خطوبة خالد وسارة` · `حفل خطوبة راشد وريم` · `ليلة خطوبة نواف ودانة` · `خطوبة سامي ولطيفة` · `حفل خطوبة أبناء العائلتين` |
| عيد الميلاد | `عيد ميلاد ليان` · `أمسية عيد ميلاد نورة` · `عيد ميلاد يوسف الخامس` · `عيد ميلاد الوالدة` · `احتفال العائلة بعيد ميلاد الوالد` |
| استقبال المولود | `استقبال مولودنا يوسف` · `عقيقة مولودنا عبدالله` · `حفل استقبال صغيرنا القادم` · `لقاء الأحبة بمناسبة قدوم صغيرنا` · `استقبال مولودتنا جود` |
| المناسبة النسائية | `أمسية الورد` · `أمسية أناقة وإلهام` · `لقاء الصديقات` · `ليلة حناء العروس دانة` · `ليلة تراث وأصالة` |
| المناسبة العامة | `لقاء الأحبة` · `حفل التكريم السنوي` · `حفل تخرج سارة` · `حفل افتتاح منزلنا الجديد` · `لقاء عيد الفطر` |
| المؤتمر | `ملتقى مجتمع المصممين` · `ملتقى القيادات 2026` · `ملتقى الابتكار الرقمي` · `ورشة بناء العلامات التجارية` · `منتدى رواد الأعمال` |

Reject or rewrite any template where the host title creates duplicated wording, an incorrect preposition, or an unintended event assumption.

## 12. Submission sequence

1. Submit the 20 wedding templates first.
2. Verify Meta classification, image-header delivery, variables, and all button behaviors.
3. Run real-device previews using one male and one female guest name.
4. Review actual WhatsApp rendering and line wrapping.
5. Apply any approved copy-system corrections to the remaining six categories.
6. Submit the remaining templates category by category, not as one 120-template batch.

## 13. Acceptance checklist

- Five voices are visibly and audibly distinct.
- No body uses `الزر المرفق`, `من الخيارات أدناه`, or promotional AI clichés.
- Modern templates use visual details; classic templates remain emoji-free.
- Every body contains `{{1}}` through `{{5}}` exactly once.
- `reply_and_qr` promises a QR only after confirmation.
- `reply_only` contains no QR promise.
- `qr_only` names the exact button and asks for no RSVP.
- `none` contains neither RSVP language nor QR language.
- The footer is neutral and non-promotional.
- A native Arabic reviewer approves each wedding exemplar before the remaining Meta submissions.

## 14. Official references

- [Taqnyat WhatsApp API documentation](https://dev.taqnyat.sa/en/doc/whatsapp/)
- [Taqnyat template creation and quality guidance](https://blog.taqnyat.sa/en/post/whatsApp_business_templates/)
- [Taqnyat template manager](https://blog.taqnyat.sa/en/post/template_manager/)

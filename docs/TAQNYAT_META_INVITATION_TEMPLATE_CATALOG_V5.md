# Halaa WhatsApp Invitation Catalog V5 — Submission-safe Scenario Collection

**Version:** 5.0
**Status:** validated copy and submission specification; application integration gates remain
**Language:** Arabic (`ar`)
**Coverage:** 7 categories × 5 scenarios × 4 invitation modes = **140 templates**

> V5 replaces V4 copy and names without modifying V4. It removes variable-first openings, uses the current Halaa runtime source keys and RSVP labels, strengthens the Arabic copy, narrows unsafe scenarios, and makes every assumption an explicit eligibility rule.

---

## 1. Non-negotiable release contract

1. Do not submit a template until its scenario requirements are enforced in the host picker.
2. Do not submit or send to a guest without recorded WhatsApp opt-in and an operational suppression/opt-out path.
3. Request Meta category `MARKETING`, send `allow_category_change: true`, and store Meta's returned category.
4. Every submission uses an `IMAGE` header and therefore requires valid sample media during submission and a public HTTPS image at send time.
5. The footer is neutral: `أُرسلت هذه الدعوة عبر هلا`.
6. V5 Meta names end in `_ar_v4` because approved templates are immutable and the V4 catalog already reserved `_ar_v3` names.

### 1.1 Current runtime variable contract

| Placeholder | Current Halaa source | Submission example |
|---|---|---|
| `{{1}}` | `guest.name` | `عبدالله الشهري` |
| `{{2}}` | `eventDetails.title` | `عنوان المناسبة حسب السيناريو` |
| `{{3}}` | `eventDetails.dateFormatted` | `١٥ أغسطس ٢٠٢٦` |
| `{{4}}` | `eventDetails.time` | `20:30` |
| `{{5}}` | `eventDetails.location.address` | `قاعة ليلتي، جدة` |

`{{1}}` in the dynamic URL button is component-scoped and receives `guest.qrcode`; it is independent of body `{{1}}`.

### 1.2 RSVP compatibility contract

V5 intentionally uses the labels currently recognized by Halaa's webhook:

| Visible label | Current stored status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

A future backend migration should send stable quick-reply payloads and read payload-first, while retaining these labels as a compatibility fallback.

### 1.3 Invitation modes

| Mode | Guest behavior | Buttons | Venue compatibility |
|---|---|---|---|
| `reply_and_qr` | RSVP; confirmed guests receive their entry code afterward | Three quick replies | Physical or hybrid |
| `reply_only` | RSVP without entry-code promise | Three quick replies | Physical, online, or hybrid |
| `qr_only` | Entry code is immediately available from the exact URL button | One URL button | Physical or hybrid |
| `none` | Informational invitation | None | Physical, online, or hybrid |

---

## 2. Validation result

The generator rejects the catalog unless all of the following pass:

- exactly 140 unique Meta names and 140 unique bodies;
- lowercase alphanumeric/underscore Meta names;
- body variables `{{1}}` through `{{5}}` exactly once and in order;
- no body beginning or ending with a variable;
- no sparse variable-only detail lines;
- body length at or below 1,024 characters;
- button labels at or below 20 characters;
- correct operational language and button type for all four modes;
- no known pressuring phrases;
- no more than three visual symbols in modern bodies.

**Generated result:** 140/140 templates passed all automated catalog checks.

---

## 3. Scenario index and eligibility

The host must choose a scenario, not an unexplained provider template. Voice is a tone descriptor; it must never be used as a substitute for scenario eligibility.

| Category | Host-facing scenario | Voice | Mandatory eligibility |
|---|---|---|---|
| الزفاف `wedding` | فرحتنا بين الأحبة | الدافئة `warm` | يُستخدم عندما تكون الدعوة صادرة من العروسين أو الأسرة وبنبرة قريبة. |
| الزفاف `wedding` | دعوة العائلتين | الكلاسيكية `classic` | لا يُستخدم إلا عندما تكون الدعوة صادرة فعلًا باسم العائلتين. |
| الزفاف `wedding` | موعد فرحتنا | العصرية `modern` | يناسب الحفلات العصرية ذات النبرة الخفيفة. |
| الزفاف `wedding` | لقاء قريب | الشخصية `intimate` | يُستخدم فقط للمناسبات الصغيرة أو محدودة العدد. |
| الزفاف `wedding` | حضورك محل ترحيب | الأصيلة `heritage` | يناسب دعوات الأسرة ذات الطابع السعودي والخليجي. |
| الخطوبة `engagement` | نشارككم فرحتنا | الدافئة `warm` | يُستخدم عندما تكون الدعوة صادرة من الخطيبين. |
| الخطوبة `engagement` | إعلان العائلتين | الكلاسيكية `classic` | لا يُستخدم إلا عندما تكون الدعوة صادرة فعلًا باسم العائلتين. |
| الخطوبة `engagement` | صار الخبر رسميًا | العصرية `modern` | يناسب الاحتفال غير الرسمي بعد إعلان الخطوبة. |
| الخطوبة `engagement` | الخبر منّا إليك | الشخصية `intimate` | يُستخدم للدائرة القريبة عندما يرغب الخطيبان في إعلان شخصي. |
| الخطوبة `engagement` | فرحة العائلتين | الأصيلة `heritage` | يناسب اللقاءات العائلية التقليدية وبعد إتمام الخطوبة. |
| عيد الميلاد `birthday` | يوم مليء بالفرح | الدافئة `warm` | يُعرض بوضوح كدعوة عائلية؛ يحدد المضيف المشمولين بالدعوة خارج نص القالب. |
| عيد الميلاد `birthday` | عام جديد من العمر | الكلاسيكية `classic` | يناسب احتفالًا هادئًا لشخص بالغ دون افتراض عمر محدد. |
| عيد الميلاد `birthday` | مفاجأة عيد الميلاد | العصرية `modern` | لا يُستخدم إلا عندما تكون المناسبة مفاجأة فعلًا ويجب حفظ سريتها. |
| عيد الميلاد `birthday` | عام له مكانة خاصة | الشخصية `intimate` | يُستخدم لمحطة عمرية يحددها عنوان المناسبة أو صورتها. |
| عيد الميلاد `birthday` | احتفال بين الأهل | الأصيلة `heritage` | يُستخدم عندما يكون صاحب المناسبة من الوالدين أو كبار العائلة. |
| استقبال المولود `baby_shower` | في انتظار فرد جديد | الدافئة `warm` | لا يُستخدم بعد الولادة ولا يفترض جنس الطفل. |
| استقبال المولود `baby_shower` | فرحتنا بمولودنا | الكلاسيكية `classic` | لا يُستخدم قبل الولادة أو لمولودة. |
| استقبال المولود `baby_shower` | وصلت صغيرتنا | العصرية `modern` | لا يُستخدم قبل الولادة أو لمولود ذكر. |
| استقبال المولود `baby_shower` | دعوة العقيقة | الشخصية `intimate` | يُستخدم للعقيقة فقط وبعد الولادة. |
| استقبال المولود `baby_shower` | الحمد لله على تمام النعمة | الأصيلة `heritage` | يُستخدم بعد الولادة ولا يفترض جنس الطفل. |
| المناسبة النسائية `ladies_event` | لقاء يجمعنا بمن نحب | الدافئة `warm` | يُستخدم للضيفات فقط. |
| المناسبة النسائية `ladies_event` | دعوة نسائية رسمية | الكلاسيكية `classic` | يُستخدم للضيفات فقط وفي لقاء رسمي أو مهني. |
| المناسبة النسائية `ladies_event` | صحبة جميلة | العصرية `modern` | يُستخدم للصديقات وفي لقاء غير رسمي. |
| المناسبة النسائية `ladies_event` | ليلة قريبة من العروس | الشخصية `intimate` | يُستخدم للضيفات فقط ولمناسبة مرتبطة بالعروس. |
| المناسبة النسائية `ladies_event` | أمسية بين الأهل | الأصيلة `heritage` | يُستخدم للضيفات فقط وفي لقاء عائلي. |
| المناسبة العامة `general_event` | فرحة الإنجاز | الدافئة `warm` | يُستخدم للتخرج أو لإنجاز شخصي واضح في عنوان المناسبة. |
| المناسبة العامة `general_event` | دعوة إلى منزلنا الجديد | الكلاسيكية `classic` | لا يُستخدم إلا لزيارة أو احتفال مرتبط بمنزل جديد. |
| المناسبة العامة `general_event` | موعد الافتتاح | العصرية `modern` | يُستخدم لافتتاح أو إطلاق فعلي، لا لمناسبة عامة. |
| المناسبة العامة `general_event` | مسيرة تستحق التقدير | الشخصية `intimate` | يُستخدم للتكريم أو التقاعد، وليس لوداع عابر. |
| المناسبة العامة `general_event` | لمّة العيد | الأصيلة `heritage` | يُستخدم لعيد الفطر أو الأضحى مع تحديد العيد في عنوان المناسبة. |
| المؤتمر والفعاليات المهنية `conference` | دعوة الحضور | الدافئة `warm` | يُستخدم للحضور العام وليس للمتحدثين أو الرعاة. |
| المؤتمر والفعاليات المهنية `conference` | دعوة الوفود والضيوف | الكلاسيكية `classic` | هذه ليست دعوة متحدث؛ يُستخدم فقط لمن سيحضر بصفته ضيفًا أو عضو وفد. |
| المؤتمر والفعاليات المهنية `conference` | لقاء القيادات | العصرية `modern` | يُستخدم للمدعوين التنفيذيين وكبار الضيوف فقط. |
| المؤتمر والفعاليات المهنية `conference` | جلسة عملية | الشخصية `intimate` | يُستخدم لورشة أو جلسة تفاعلية، ولا يفترض أن الضيف مسجل مسبقًا. |
| المؤتمر والفعاليات المهنية `conference` | ملتقى أهل الخبرة | الأصيلة `heritage` | يُستخدم عندما يكون التواصل المهني هدفًا أساسيًا للحدث. |

---

## 4. Full template catalog

## 5. Wedding — الزفاف `wedding`

### 5.1 فرحتنا بين الأحبة — الدافئة `warm`

- **Scenario:** زفاف عائلي مع الأصدقاء والمقرّبين
- **Audience:** الأهل والأصدقاء والمقرّبون
- **Sender perspective:** العروسان أو الأسرة
- **Gender scope:** محايد للضيف
- **Mandatory eligibility:** يُستخدم عندما تكون الدعوة صادرة من العروسين أو الأسرة وبنبرة قريبة.
- **Meta sample title:** `حفل زفاف أحمد ونورة`

#### 5.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_close_circle_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
أهلًا {{1}}، يسعدنا أن تصلك دعوتنا إلى «{{2}}».
نجتمع بمن نحب لنشارك فرحة يوم ننتظره بمحبة.
موعدنا يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نفرح بلقائك ومشاركتنا هذه المناسبة الجميلة 🤍
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 5.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_close_circle_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
أهلًا {{1}}، يسعدنا أن تصلك دعوتنا إلى «{{2}}».
نجتمع بمن نحب لنشارك فرحة يوم ننتظره بمحبة.
موعدنا يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نفرح بلقائك ومشاركتنا هذه المناسبة الجميلة 🤍
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 5.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_close_circle_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
أهلًا {{1}}، يسعدنا أن تصلك دعوتنا إلى «{{2}}».
نجتمع بمن نحب لنشارك فرحة يوم ننتظره بمحبة.
موعدنا يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نفرح بلقائك ومشاركتنا هذه المناسبة الجميلة 🤍
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 5.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_close_circle_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
أهلًا {{1}}، يسعدنا أن تصلك دعوتنا إلى «{{2}}».
نجتمع بمن نحب لنشارك فرحة يوم ننتظره بمحبة.
موعدنا يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

نفرح بلقائك ومشاركتنا هذه المناسبة الجميلة 🤍
```

**Buttons:** none

---

### 5.2 دعوة العائلتين — الكلاسيكية `classic`

- **Scenario:** حفل رسمي صادر باسم العائلتين
- **Audience:** العائلة والضيوف الرسميون
- **Sender perspective:** العائلتان
- **Gender scope:** محايد للضيف
- **Mandatory eligibility:** لا يُستخدم إلا عندما تكون الدعوة صادرة فعلًا باسم العائلتين.
- **Meta sample title:** `حفل زفاف خالد وسارة`

#### 5.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_two_families_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
يسرّ العائلتين دعوة {{1}} إلى «{{2}}» لمشاركتهما فرحة هذه المناسبة.
تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

يسعدنا حضورك، ونرحّب بك بكل سرور.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 5.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_two_families_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
يسرّ العائلتين دعوة {{1}} إلى «{{2}}» لمشاركتهما فرحة هذه المناسبة.
تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

يسعدنا حضورك، ونرحّب بك بكل سرور.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 5.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_two_families_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
يسرّ العائلتين دعوة {{1}} إلى «{{2}}» لمشاركتهما فرحة هذه المناسبة.
تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

يسعدنا حضورك، ونرحّب بك بكل سرور.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 5.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_two_families_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
يسرّ العائلتين دعوة {{1}} إلى «{{2}}» لمشاركتهما فرحة هذه المناسبة.
تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا حضورك، ونرحّب بك بكل سرور.
```

**Buttons:** none

---

### 5.3 موعد فرحتنا — العصرية `modern`

- **Scenario:** زفاف عصري للأصدقاء والأقارب
- **Audience:** الأصدقاء والأقارب
- **Sender perspective:** العروسان
- **Gender scope:** محايد للضيف
- **Mandatory eligibility:** يناسب الحفلات العصرية ذات النبرة الخفيفة.
- **Meta sample title:** `ليلة زفاف فيصل ولين`

#### 5.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_modern_friends_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
يا هلا {{1}}، موعدنا مع الفرح في «{{2}}» ✨
ليلة نحتفل فيها ببداية جميلة مع الأشخاص الأقرب إلى قلوبنا.
نلتقي يوم {{3}}، عند {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

ننتظر هذا اللقاء بكل فرح.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 5.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_modern_friends_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
يا هلا {{1}}، موعدنا مع الفرح في «{{2}}» ✨
ليلة نحتفل فيها ببداية جميلة مع الأشخاص الأقرب إلى قلوبنا.
نلتقي يوم {{3}}، عند {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

ننتظر هذا اللقاء بكل فرح.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 5.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_modern_friends_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
يا هلا {{1}}، موعدنا مع الفرح في «{{2}}» ✨
ليلة نحتفل فيها ببداية جميلة مع الأشخاص الأقرب إلى قلوبنا.
نلتقي يوم {{3}}، عند {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

ننتظر هذا اللقاء بكل فرح.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 5.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_modern_friends_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
يا هلا {{1}}، موعدنا مع الفرح في «{{2}}» ✨
ليلة نحتفل فيها ببداية جميلة مع الأشخاص الأقرب إلى قلوبنا.
نلتقي يوم {{3}}، عند {{4}}، في {{5}}.

ننتظر هذا اللقاء بكل فرح.
```

**Buttons:** none

---

### 5.4 لقاء قريب — الشخصية `intimate`

- **Scenario:** زفاف صغير أو عشاء محدود للمقرّبين
- **Audience:** الدائرة القريبة
- **Sender perspective:** العروسان
- **Gender scope:** محايد للضيف
- **Mandatory eligibility:** يُستخدم فقط للمناسبات الصغيرة أو محدودة العدد.
- **Meta sample title:** `حفل زفاف عمر ومها`

#### 5.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_small_gathering_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
أهلًا {{1}}، أحببنا أن نشاركك فرحتنا في «{{2}}»، ضمن لقاء صغير يجمع المقرّبين.
اخترنا لهذه اللحظة أجواء هادئة ودافئة مع من لهم مكانة خاصة.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نتطلع إلى لقاء هادئ وجميل بصحبتك.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 5.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_small_gathering_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
أهلًا {{1}}، أحببنا أن نشاركك فرحتنا في «{{2}}»، ضمن لقاء صغير يجمع المقرّبين.
اخترنا لهذه اللحظة أجواء هادئة ودافئة مع من لهم مكانة خاصة.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نتطلع إلى لقاء هادئ وجميل بصحبتك.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 5.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_small_gathering_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
أهلًا {{1}}، أحببنا أن نشاركك فرحتنا في «{{2}}»، ضمن لقاء صغير يجمع المقرّبين.
اخترنا لهذه اللحظة أجواء هادئة ودافئة مع من لهم مكانة خاصة.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نتطلع إلى لقاء هادئ وجميل بصحبتك.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 5.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_small_gathering_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
أهلًا {{1}}، أحببنا أن نشاركك فرحتنا في «{{2}}»، ضمن لقاء صغير يجمع المقرّبين.
اخترنا لهذه اللحظة أجواء هادئة ودافئة مع من لهم مكانة خاصة.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

نتطلع إلى لقاء هادئ وجميل بصحبتك.
```

**Buttons:** none

---

### 5.5 حضورك محل ترحيب — الأصيلة `heritage`

- **Scenario:** زفاف عائلي بروح الضيافة السعودية
- **Audience:** العائلة والضيوف
- **Sender perspective:** الأسرة
- **Gender scope:** محايد للضيف
- **Mandatory eligibility:** يناسب دعوات الأسرة ذات الطابع السعودي والخليجي.
- **Meta sample title:** `ليلة زفاف عبدالله والجوهرة`

#### 5.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_wedding_family_hospitality_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، ويسرّ العائلة دعوتك إلى «{{2}}».
نستقبلك بكل ترحيب في ليلة تجمع الأهل والأحبة على الفرح.
نلقاك يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

لك منّا خالص الترحيب، ونسعد بلقائك.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 5.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_wedding_family_hospitality_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، ويسرّ العائلة دعوتك إلى «{{2}}».
نستقبلك بكل ترحيب في ليلة تجمع الأهل والأحبة على الفرح.
نلقاك يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

لك منّا خالص الترحيب، ونسعد بلقائك.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 5.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_wedding_family_hospitality_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، ويسرّ العائلة دعوتك إلى «{{2}}».
نستقبلك بكل ترحيب في ليلة تجمع الأهل والأحبة على الفرح.
نلقاك يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

لك منّا خالص الترحيب، ونسعد بلقائك.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 5.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_wedding_family_hospitality_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `wedding`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، ويسرّ العائلة دعوتك إلى «{{2}}».
نستقبلك بكل ترحيب في ليلة تجمع الأهل والأحبة على الفرح.
نلقاك يوم {{3}}، في تمام {{4}}، في {{5}}.

لك منّا خالص الترحيب، ونسعد بلقائك.
```

**Buttons:** none

---

## 6. Engagement — الخطوبة `engagement`

### 6.1 نشارككم فرحتنا — الدافئة `warm`

- **Scenario:** إعلان الخطوبة من الخطيبين
- **Audience:** الأهل والأصدقاء
- **Sender perspective:** الخطيبان
- **Gender scope:** محايد للضيف
- **Mandatory eligibility:** يُستخدم عندما تكون الدعوة صادرة من الخطيبين.
- **Meta sample title:** `حفل خطوبة خالد وسارة`

#### 6.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_couple_announcement_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
يسعدنا يا {{1}} أن نشاركك خبر خطوبتنا، وأن ندعوك إلى «{{2}}».
نحتفل بخطوة جميلة وبداية نرجو لها الخير والتوفيق.
نلتقي يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نسعد بحضورك ومشاركتنا هذه البداية 🤍
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 6.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_couple_announcement_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
يسعدنا يا {{1}} أن نشاركك خبر خطوبتنا، وأن ندعوك إلى «{{2}}».
نحتفل بخطوة جميلة وبداية نرجو لها الخير والتوفيق.
نلتقي يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نسعد بحضورك ومشاركتنا هذه البداية 🤍
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 6.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_couple_announcement_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
يسعدنا يا {{1}} أن نشاركك خبر خطوبتنا، وأن ندعوك إلى «{{2}}».
نحتفل بخطوة جميلة وبداية نرجو لها الخير والتوفيق.
نلتقي يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نسعد بحضورك ومشاركتنا هذه البداية 🤍
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 6.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_couple_announcement_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
يسعدنا يا {{1}} أن نشاركك خبر خطوبتنا، وأن ندعوك إلى «{{2}}».
نحتفل بخطوة جميلة وبداية نرجو لها الخير والتوفيق.
نلتقي يوم {{3}}، في تمام {{4}}، في {{5}}.

نسعد بحضورك ومشاركتنا هذه البداية 🤍
```

**Buttons:** none

---

### 6.2 إعلان العائلتين — الكلاسيكية `classic`

- **Scenario:** خطوبة رسمية باسم العائلتين
- **Audience:** العائلتان والضيوف
- **Sender perspective:** العائلتان
- **Gender scope:** محايد للضيف
- **Mandatory eligibility:** لا يُستخدم إلا عندما تكون الدعوة صادرة فعلًا باسم العائلتين.
- **Meta sample title:** `حفل خطوبة راشد وريم`

#### 6.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_formal_families_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
بمناسبة الخطوبة، يسرّ العائلتين دعوة {{1}} إلى «{{2}}».
تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

يسعدنا تشريفك ومشاركتنا هذه المناسبة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 6.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_formal_families_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
بمناسبة الخطوبة، يسرّ العائلتين دعوة {{1}} إلى «{{2}}».
تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

يسعدنا تشريفك ومشاركتنا هذه المناسبة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 6.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_formal_families_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
بمناسبة الخطوبة، يسرّ العائلتين دعوة {{1}} إلى «{{2}}».
تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

يسعدنا تشريفك ومشاركتنا هذه المناسبة.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 6.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_formal_families_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
بمناسبة الخطوبة، يسرّ العائلتين دعوة {{1}} إلى «{{2}}».
تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا تشريفك ومشاركتنا هذه المناسبة.
```

**Buttons:** none

---

### 6.3 صار الخبر رسميًا — العصرية `modern`

- **Scenario:** احتفال عصري بالخطوبة
- **Audience:** الأصدقاء والأقارب
- **Sender perspective:** الخطيبان أو الأسرة
- **Gender scope:** محايد للضيف
- **Mandatory eligibility:** يناسب الاحتفال غير الرسمي بعد إعلان الخطوبة.
- **Meta sample title:** `ليلة خطوبة نواف ودانة`

#### 6.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_casual_celebration_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
صار الخبر رسميًا يا {{1}}، وحان وقت الاحتفال في «{{2}}» ✨
نشارك هذه الخطوة مع أهلنا وأصدقائنا ومن نحب.
موعدنا يوم {{3}}، عند {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نفرح بلقائك ومشاركتنا الخبر الجميل.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 6.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_casual_celebration_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
صار الخبر رسميًا يا {{1}}، وحان وقت الاحتفال في «{{2}}» ✨
نشارك هذه الخطوة مع أهلنا وأصدقائنا ومن نحب.
موعدنا يوم {{3}}، عند {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نفرح بلقائك ومشاركتنا الخبر الجميل.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 6.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_casual_celebration_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
صار الخبر رسميًا يا {{1}}، وحان وقت الاحتفال في «{{2}}» ✨
نشارك هذه الخطوة مع أهلنا وأصدقائنا ومن نحب.
موعدنا يوم {{3}}، عند {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نفرح بلقائك ومشاركتنا الخبر الجميل.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 6.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_casual_celebration_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
صار الخبر رسميًا يا {{1}}، وحان وقت الاحتفال في «{{2}}» ✨
نشارك هذه الخطوة مع أهلنا وأصدقائنا ومن نحب.
موعدنا يوم {{3}}، عند {{4}}، في {{5}}.

نفرح بلقائك ومشاركتنا الخبر الجميل.
```

**Buttons:** none

---

### 6.4 الخبر منّا إليك — الشخصية `intimate`

- **Scenario:** إعلان شخصي للدائرة القريبة
- **Audience:** المقرّبون
- **Sender perspective:** الخطيبان
- **Gender scope:** محايد للضيف
- **Mandatory eligibility:** يُستخدم للدائرة القريبة عندما يرغب الخطيبان في إعلان شخصي.
- **Meta sample title:** `خطوبة سامي ولطيفة`

#### 6.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_close_circle_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
أحببنا أن يصلك الخبر منّا يا {{1}}، وأن نشاركك فرحتنا في «{{2}}».
هذه البداية تعني لنا الكثير، ومشاركتها مع المقرّبين تجعلها أجمل.
نلتقي يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

تسعدنا مشاركتك هذه اللحظة القريبة من القلب.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 6.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_close_circle_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
أحببنا أن يصلك الخبر منّا يا {{1}}، وأن نشاركك فرحتنا في «{{2}}».
هذه البداية تعني لنا الكثير، ومشاركتها مع المقرّبين تجعلها أجمل.
نلتقي يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

تسعدنا مشاركتك هذه اللحظة القريبة من القلب.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 6.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_close_circle_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
أحببنا أن يصلك الخبر منّا يا {{1}}، وأن نشاركك فرحتنا في «{{2}}».
هذه البداية تعني لنا الكثير، ومشاركتها مع المقرّبين تجعلها أجمل.
نلتقي يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

تسعدنا مشاركتك هذه اللحظة القريبة من القلب.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 6.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_close_circle_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
أحببنا أن يصلك الخبر منّا يا {{1}}، وأن نشاركك فرحتنا في «{{2}}».
هذه البداية تعني لنا الكثير، ومشاركتها مع المقرّبين تجعلها أجمل.
نلتقي يوم {{3}}، في تمام {{4}}، في {{5}}.

تسعدنا مشاركتك هذه اللحظة القريبة من القلب.
```

**Buttons:** none

---

### 6.5 فرحة العائلتين — الأصيلة `heritage`

- **Scenario:** خطوبة عائلية تقليدية
- **Audience:** العائلة والأقارب
- **Sender perspective:** العائلتان
- **Gender scope:** محايد للضيف
- **Mandatory eligibility:** يناسب اللقاءات العائلية التقليدية وبعد إتمام الخطوبة.
- **Meta sample title:** `حفل خطوبة أبناء العائلتين`

#### 6.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_engagement_traditional_family_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، وبفضل الله تمّت الخطوبة، وتدعوك العائلتان إلى «{{2}}».
نلتقي على المحبة والفرح بين الأهل والأقارب.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نسعد بحضورك، ولك منّا كل الترحيب.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 6.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_engagement_traditional_family_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، وبفضل الله تمّت الخطوبة، وتدعوك العائلتان إلى «{{2}}».
نلتقي على المحبة والفرح بين الأهل والأقارب.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نسعد بحضورك، ولك منّا كل الترحيب.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 6.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_engagement_traditional_family_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، وبفضل الله تمّت الخطوبة، وتدعوك العائلتان إلى «{{2}}».
نلتقي على المحبة والفرح بين الأهل والأقارب.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نسعد بحضورك، ولك منّا كل الترحيب.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 6.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_engagement_traditional_family_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `engagement`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، وبفضل الله تمّت الخطوبة، وتدعوك العائلتان إلى «{{2}}».
نلتقي على المحبة والفرح بين الأهل والأقارب.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

نسعد بحضورك، ولك منّا كل الترحيب.
```

**Buttons:** none

---

## 7. Birthday — عيد الميلاد `birthday`

### 7.1 يوم مليء بالفرح — الدافئة `warm`

- **Scenario:** عيد ميلاد طفل للعائلات والأطفال
- **Audience:** العائلات والأصدقاء وأولياء الأمور
- **Sender perspective:** الأسرة
- **Gender scope:** محايد للضيف ولصاحب المناسبة
- **Mandatory eligibility:** يُعرض بوضوح كدعوة عائلية؛ يحدد المضيف المشمولين بالدعوة خارج نص القالب.
- **Meta sample title:** `عيد ميلاد يوسف الخامس`

#### 7.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_child_party_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
أهلًا {{1}}، موعدنا مع يوم مليء بالضحكات واللحظات الجميلة في «{{2}}».
أعددنا احتفالًا لطيفًا يجمع الصغار والعائلة في أجواء مبهجة.
يبدأ الحفل يوم {{3}}، عند {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

ننتظر لقاءك بكل فرح 🎈
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 7.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_child_party_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
أهلًا {{1}}، موعدنا مع يوم مليء بالضحكات واللحظات الجميلة في «{{2}}».
أعددنا احتفالًا لطيفًا يجمع الصغار والعائلة في أجواء مبهجة.
يبدأ الحفل يوم {{3}}، عند {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

ننتظر لقاءك بكل فرح 🎈
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 7.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_child_party_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
أهلًا {{1}}، موعدنا مع يوم مليء بالضحكات واللحظات الجميلة في «{{2}}».
أعددنا احتفالًا لطيفًا يجمع الصغار والعائلة في أجواء مبهجة.
يبدأ الحفل يوم {{3}}، عند {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

ننتظر لقاءك بكل فرح 🎈
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 7.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_child_party_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
أهلًا {{1}}، موعدنا مع يوم مليء بالضحكات واللحظات الجميلة في «{{2}}».
أعددنا احتفالًا لطيفًا يجمع الصغار والعائلة في أجواء مبهجة.
يبدأ الحفل يوم {{3}}، عند {{4}}، في {{5}}.

ننتظر لقاءك بكل فرح 🎈
```

**Buttons:** none

---

### 7.2 عام جديد من العمر — الكلاسيكية `classic`

- **Scenario:** عيد ميلاد بالغ بطابع هادئ
- **Audience:** العائلة والأصدقاء
- **Sender perspective:** صاحب المناسبة أو الأسرة
- **Gender scope:** محايد للضيف ولصاحب المناسبة
- **Mandatory eligibility:** يناسب احتفالًا هادئًا لشخص بالغ دون افتراض عمر محدد.
- **Meta sample title:** `عيد ميلاد ليان`

#### 7.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_adult_birthday_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
يسرّنا دعوة {{1}} إلى «{{2}}»، احتفاءً بعام جديد من العمر.
تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

يسعدنا لقاؤك ومشاركتنا هذه المناسبة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 7.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_adult_birthday_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
يسرّنا دعوة {{1}} إلى «{{2}}»، احتفاءً بعام جديد من العمر.
تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

يسعدنا لقاؤك ومشاركتنا هذه المناسبة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 7.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_adult_birthday_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
يسرّنا دعوة {{1}} إلى «{{2}}»، احتفاءً بعام جديد من العمر.
تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

يسعدنا لقاؤك ومشاركتنا هذه المناسبة.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 7.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_adult_birthday_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
يسرّنا دعوة {{1}} إلى «{{2}}»، احتفاءً بعام جديد من العمر.
تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا لقاؤك ومشاركتنا هذه المناسبة.
```

**Buttons:** none

---

### 7.3 مفاجأة عيد الميلاد — العصرية `modern`

- **Scenario:** حفلة عيد ميلاد مفاجئة
- **Audience:** الأصدقاء والمقرّبون
- **Sender perspective:** منظمو المفاجأة
- **Gender scope:** محايد للضيف ولصاحب المناسبة
- **Mandatory eligibility:** لا يُستخدم إلا عندما تكون المناسبة مفاجأة فعلًا ويجب حفظ سريتها.
- **Meta sample title:** `مفاجأة عيد ميلاد نورة`

#### 7.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_surprise_party_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
أهلًا {{1}}، نجهّز مفاجأة جميلة في «{{2}}»، ونرجو أن تبقى التفاصيل بيننا حتى الموعد 🎉
نلتقي قبل البداية بقليل حتى تكتمل ترتيبات المفاجأة كما خططنا لها.
نلتقي يوم {{3}}، عند {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نراك هناك قبل بدء المفاجأة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 7.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_surprise_party_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
أهلًا {{1}}، نجهّز مفاجأة جميلة في «{{2}}»، ونرجو أن تبقى التفاصيل بيننا حتى الموعد 🎉
نلتقي قبل البداية بقليل حتى تكتمل ترتيبات المفاجأة كما خططنا لها.
نلتقي يوم {{3}}، عند {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نراك هناك قبل بدء المفاجأة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 7.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_surprise_party_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
أهلًا {{1}}، نجهّز مفاجأة جميلة في «{{2}}»، ونرجو أن تبقى التفاصيل بيننا حتى الموعد 🎉
نلتقي قبل البداية بقليل حتى تكتمل ترتيبات المفاجأة كما خططنا لها.
نلتقي يوم {{3}}، عند {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نراك هناك قبل بدء المفاجأة.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 7.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_surprise_party_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
أهلًا {{1}}، نجهّز مفاجأة جميلة في «{{2}}»، ونرجو أن تبقى التفاصيل بيننا حتى الموعد 🎉
نلتقي قبل البداية بقليل حتى تكتمل ترتيبات المفاجأة كما خططنا لها.
نلتقي يوم {{3}}، عند {{4}}، في {{5}}.

نراك هناك قبل بدء المفاجأة.
```

**Buttons:** none

---

### 7.4 عام له مكانة خاصة — الشخصية `intimate`

- **Scenario:** عيد ميلاد لمحطة عمرية مميزة
- **Audience:** المقرّبون
- **Sender perspective:** صاحب المناسبة أو الأسرة
- **Gender scope:** محايد للضيف ولصاحب المناسبة
- **Mandatory eligibility:** يُستخدم لمحطة عمرية يحددها عنوان المناسبة أو صورتها.
- **Meta sample title:** `احتفال عامي الأربعين`

#### 7.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_milestone_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
لهذا العام مكانة خاصة، ويسعدنا يا {{1}} أن تشاركنا الاحتفال في «{{2}}».
اخترنا أن تكون هذه المحطة بين الأشخاص الذين كان لهم أثر جميل في الطريق.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نعتز بمشاركتك هذه المحطة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 7.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_milestone_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
لهذا العام مكانة خاصة، ويسعدنا يا {{1}} أن تشاركنا الاحتفال في «{{2}}».
اخترنا أن تكون هذه المحطة بين الأشخاص الذين كان لهم أثر جميل في الطريق.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نعتز بمشاركتك هذه المحطة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 7.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_milestone_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
لهذا العام مكانة خاصة، ويسعدنا يا {{1}} أن تشاركنا الاحتفال في «{{2}}».
اخترنا أن تكون هذه المحطة بين الأشخاص الذين كان لهم أثر جميل في الطريق.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نعتز بمشاركتك هذه المحطة.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 7.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_milestone_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
لهذا العام مكانة خاصة، ويسعدنا يا {{1}} أن تشاركنا الاحتفال في «{{2}}».
اخترنا أن تكون هذه المحطة بين الأشخاص الذين كان لهم أثر جميل في الطريق.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

نعتز بمشاركتك هذه المحطة.
```

**Buttons:** none

---

### 7.5 احتفال بين الأهل — الأصيلة `heritage`

- **Scenario:** عيد ميلاد أحد الوالدين أو كبار العائلة
- **Audience:** العائلة والمقرّبون
- **Sender perspective:** الأسرة
- **Gender scope:** محايد للضيف ولصاحب المناسبة
- **Mandatory eligibility:** يُستخدم عندما يكون صاحب المناسبة من الوالدين أو كبار العائلة.
- **Meta sample title:** `احتفال العائلة بعيد ميلاد الوالدة`

#### 7.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_birthday_family_elder_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، تجتمع العائلة في «{{2}}» احتفاءً بمن له مكانة كبيرة في قلوبنا.
نحتفل بعام جديد ونستعيد أجمل الذكريات بين الأهل والأحبة.
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نسعد بلقائك واجتماعنا بين الأهل.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 7.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_birthday_family_elder_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، تجتمع العائلة في «{{2}}» احتفاءً بمن له مكانة كبيرة في قلوبنا.
نحتفل بعام جديد ونستعيد أجمل الذكريات بين الأهل والأحبة.
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نسعد بلقائك واجتماعنا بين الأهل.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 7.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_birthday_family_elder_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، تجتمع العائلة في «{{2}}» احتفاءً بمن له مكانة كبيرة في قلوبنا.
نحتفل بعام جديد ونستعيد أجمل الذكريات بين الأهل والأحبة.
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نسعد بلقائك واجتماعنا بين الأهل.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 7.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_birthday_family_elder_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `birthday`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، تجتمع العائلة في «{{2}}» احتفاءً بمن له مكانة كبيرة في قلوبنا.
نحتفل بعام جديد ونستعيد أجمل الذكريات بين الأهل والأحبة.
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

نسعد بلقائك واجتماعنا بين الأهل.
```

**Buttons:** none

---

## 8. Baby celebration — استقبال المولود `baby_shower`

### 8.1 في انتظار فرد جديد — الدافئة `warm`

- **Scenario:** احتفال قبل الولادة
- **Audience:** العائلة والأصدقاء
- **Sender perspective:** الوالدان أو الأسرة
- **Gender scope:** محايد للضيف وللطفل
- **Event stage:** قبل الولادة
- **Mandatory eligibility:** لا يُستخدم بعد الولادة ولا يفترض جنس الطفل.
- **Meta sample title:** `حفل استقبال صغيرنا القادم`

#### 8.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_before_birth_neutral_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
أهلًا {{1}}، نترقب بفرح قدوم فرد جديد، ويسعدنا أن نشاركك «{{2}}».
نلتقي بمن نحب لنحتفل بهذه المرحلة الجميلة ونشاركهم فرحة الانتظار.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نسعد بحضورك ومشاركتنا هذا الانتظار الجميل 🤍
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 8.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_before_birth_neutral_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
أهلًا {{1}}، نترقب بفرح قدوم فرد جديد، ويسعدنا أن نشاركك «{{2}}».
نلتقي بمن نحب لنحتفل بهذه المرحلة الجميلة ونشاركهم فرحة الانتظار.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نسعد بحضورك ومشاركتنا هذا الانتظار الجميل 🤍
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 8.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_before_birth_neutral_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
أهلًا {{1}}، نترقب بفرح قدوم فرد جديد، ويسعدنا أن نشاركك «{{2}}».
نلتقي بمن نحب لنحتفل بهذه المرحلة الجميلة ونشاركهم فرحة الانتظار.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نسعد بحضورك ومشاركتنا هذا الانتظار الجميل 🤍
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 8.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_before_birth_neutral_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
أهلًا {{1}}، نترقب بفرح قدوم فرد جديد، ويسعدنا أن نشاركك «{{2}}».
نلتقي بمن نحب لنحتفل بهذه المرحلة الجميلة ونشاركهم فرحة الانتظار.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

نسعد بحضورك ومشاركتنا هذا الانتظار الجميل 🤍
```

**Buttons:** none

---

### 8.2 فرحتنا بمولودنا — الكلاسيكية `classic`

- **Scenario:** استقبال مولود ذكر بعد الولادة
- **Audience:** العائلة والأصدقاء
- **Sender perspective:** الوالدان أو الأسرة
- **Gender scope:** محايد للضيف؛ مذكر للطفل
- **Event stage:** بعد الولادة
- **Mandatory eligibility:** لا يُستخدم قبل الولادة أو لمولودة.
- **Meta sample title:** `استقبال مولودنا يوسف`

#### 8.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_new_boy_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
حمدًا لله على تمام النعمة، ويسرّنا دعوة {{1}} إلى «{{2}}» احتفاءً بمولودنا.
تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نسعد بحضورك ودعائك له بالصلاح والبركة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 8.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_new_boy_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
حمدًا لله على تمام النعمة، ويسرّنا دعوة {{1}} إلى «{{2}}» احتفاءً بمولودنا.
تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نسعد بحضورك ودعائك له بالصلاح والبركة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 8.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_new_boy_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
حمدًا لله على تمام النعمة، ويسرّنا دعوة {{1}} إلى «{{2}}» احتفاءً بمولودنا.
تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نسعد بحضورك ودعائك له بالصلاح والبركة.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 8.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_new_boy_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
حمدًا لله على تمام النعمة، ويسرّنا دعوة {{1}} إلى «{{2}}» احتفاءً بمولودنا.
تُقام المناسبة يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

نسعد بحضورك ودعائك له بالصلاح والبركة.
```

**Buttons:** none

---

### 8.3 وصلت صغيرتنا — العصرية `modern`

- **Scenario:** استقبال مولودة بعد الولادة
- **Audience:** العائلة والأصدقاء
- **Sender perspective:** الوالدان أو الأسرة
- **Gender scope:** محايد للضيف؛ مؤنث للطفل
- **Event stage:** بعد الولادة
- **Mandatory eligibility:** لا يُستخدم قبل الولادة أو لمولود ذكر.
- **Meta sample title:** `استقبال مولودتنا جود`

#### 8.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_new_girl_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
وصلت صغيرتنا واكتملت فرحتنا، ويسعدنا يا {{1}} أن نلقاك في «{{2}}» 🤍
نحتفل بقدومها بين العائلة والأصدقاء والدعوات الجميلة.
موعدنا يوم {{3}}، عند {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نفرح بحضورك ودعواتك لها.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 8.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_new_girl_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
وصلت صغيرتنا واكتملت فرحتنا، ويسعدنا يا {{1}} أن نلقاك في «{{2}}» 🤍
نحتفل بقدومها بين العائلة والأصدقاء والدعوات الجميلة.
موعدنا يوم {{3}}، عند {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نفرح بحضورك ودعواتك لها.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 8.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_new_girl_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
وصلت صغيرتنا واكتملت فرحتنا، ويسعدنا يا {{1}} أن نلقاك في «{{2}}» 🤍
نحتفل بقدومها بين العائلة والأصدقاء والدعوات الجميلة.
موعدنا يوم {{3}}، عند {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نفرح بحضورك ودعواتك لها.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 8.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_new_girl_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
وصلت صغيرتنا واكتملت فرحتنا، ويسعدنا يا {{1}} أن نلقاك في «{{2}}» 🤍
نحتفل بقدومها بين العائلة والأصدقاء والدعوات الجميلة.
موعدنا يوم {{3}}، عند {{4}}، في {{5}}.

نفرح بحضورك ودعواتك لها.
```

**Buttons:** none

---

### 8.4 دعوة العقيقة — الشخصية `intimate`

- **Scenario:** عقيقة بصياغة محايدة لجنس الطفل
- **Audience:** العائلة والمقرّبون
- **Sender perspective:** الوالدان أو الأسرة
- **Gender scope:** محايد للضيف وللطفل
- **Event stage:** بعد الولادة
- **Mandatory eligibility:** يُستخدم للعقيقة فقط وبعد الولادة.
- **Meta sample title:** `عقيقة مولودنا عبدالله`

#### 8.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_aqiqah_neutral_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
يسرّنا يا {{1}} دعوتك إلى «{{2}}»، لنشاركك فرحتنا بالعقيقة في لقاء عائلي دافئ.
نحمد الله على نعمته، ونجتمع بين الأهل والمقرّبين على خير.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

يسعدنا حضورك ودعواتك الطيبة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 8.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_aqiqah_neutral_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
يسرّنا يا {{1}} دعوتك إلى «{{2}}»، لنشاركك فرحتنا بالعقيقة في لقاء عائلي دافئ.
نحمد الله على نعمته، ونجتمع بين الأهل والمقرّبين على خير.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

يسعدنا حضورك ودعواتك الطيبة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 8.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_aqiqah_neutral_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
يسرّنا يا {{1}} دعوتك إلى «{{2}}»، لنشاركك فرحتنا بالعقيقة في لقاء عائلي دافئ.
نحمد الله على نعمته، ونجتمع بين الأهل والمقرّبين على خير.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

يسعدنا حضورك ودعواتك الطيبة.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 8.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_aqiqah_neutral_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
يسرّنا يا {{1}} دعوتك إلى «{{2}}»، لنشاركك فرحتنا بالعقيقة في لقاء عائلي دافئ.
نحمد الله على نعمته، ونجتمع بين الأهل والمقرّبين على خير.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا حضورك ودعواتك الطيبة.
```

**Buttons:** none

---

### 8.5 الحمد لله على تمام النعمة — الأصيلة `heritage`

- **Scenario:** استقبال عائلي محايد بعد الولادة
- **Audience:** العائلة والأصدقاء
- **Sender perspective:** الوالدان أو الأسرة
- **Gender scope:** محايد للضيف وللطفل
- **Event stage:** بعد الولادة
- **Mandatory eligibility:** يُستخدم بعد الولادة ولا يفترض جنس الطفل.
- **Meta sample title:** `لقاء الأحبة احتفاءً بتمام النعمة`

#### 8.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_baby_shower_family_reception_neutral_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، والحمد لله الذي أتمّ علينا النعمة، ويسرّ العائلة دعوتك إلى «{{2}}».
نلتقي بين الأهل والأحبة شاكرين لله، ومستبشرين بالدعوات الطيبة.
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

يسعدنا حضورك ودعواتك الطيبة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 8.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_baby_shower_family_reception_neutral_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، والحمد لله الذي أتمّ علينا النعمة، ويسرّ العائلة دعوتك إلى «{{2}}».
نلتقي بين الأهل والأحبة شاكرين لله، ومستبشرين بالدعوات الطيبة.
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

يسعدنا حضورك ودعواتك الطيبة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 8.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_baby_shower_family_reception_neutral_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، والحمد لله الذي أتمّ علينا النعمة، ويسرّ العائلة دعوتك إلى «{{2}}».
نلتقي بين الأهل والأحبة شاكرين لله، ومستبشرين بالدعوات الطيبة.
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

يسعدنا حضورك ودعواتك الطيبة.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 8.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_baby_shower_family_reception_neutral_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `baby_shower`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، والحمد لله الذي أتمّ علينا النعمة، ويسرّ العائلة دعوتك إلى «{{2}}».
نلتقي بين الأهل والأحبة شاكرين لله، ومستبشرين بالدعوات الطيبة.
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا حضورك ودعواتك الطيبة.
```

**Buttons:** none

---

## 9. Ladies' event — المناسبة النسائية `ladies_event`

### 9.1 لقاء يجمعنا بمن نحب — الدافئة `warm`

- **Scenario:** لقاء نسائي اجتماعي
- **Audience:** القريبات والصديقات
- **Sender perspective:** المضيفة أو المجموعة المنظمة
- **Gender scope:** مؤنث للضيفة
- **Mandatory eligibility:** يُستخدم للضيفات فقط.
- **Meta sample title:** `أمسية الورد`

#### 9.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_friends_gathering_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
أهلًا {{1}}، أعددنا لقاءً هادئًا يجمعنا بمن نحب، ويسعدنا أن تكوني بيننا في «{{2}}».
لقاء خفيف للحديث الجميل وقضاء وقت لطيف مع القريبات والصديقات.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نلقاك بكل ود وسرور ✨
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 9.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_friends_gathering_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
أهلًا {{1}}، أعددنا لقاءً هادئًا يجمعنا بمن نحب، ويسعدنا أن تكوني بيننا في «{{2}}».
لقاء خفيف للحديث الجميل وقضاء وقت لطيف مع القريبات والصديقات.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نلقاك بكل ود وسرور ✨
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 9.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_friends_gathering_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
أهلًا {{1}}، أعددنا لقاءً هادئًا يجمعنا بمن نحب، ويسعدنا أن تكوني بيننا في «{{2}}».
لقاء خفيف للحديث الجميل وقضاء وقت لطيف مع القريبات والصديقات.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نلقاك بكل ود وسرور ✨
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 9.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_friends_gathering_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
أهلًا {{1}}، أعددنا لقاءً هادئًا يجمعنا بمن نحب، ويسعدنا أن تكوني بيننا في «{{2}}».
لقاء خفيف للحديث الجميل وقضاء وقت لطيف مع القريبات والصديقات.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

نلقاك بكل ود وسرور ✨
```

**Buttons:** none

---

### 9.2 دعوة نسائية رسمية — الكلاسيكية `classic`

- **Scenario:** استقبال رسمي أو لقاء مهني نسائي
- **Audience:** الضيفات والمهنيات
- **Sender perspective:** الجهة المنظمة
- **Gender scope:** مؤنث للضيفة
- **Mandatory eligibility:** يُستخدم للضيفات فقط وفي لقاء رسمي أو مهني.
- **Meta sample title:** `ملتقى سيدات الأعمال`

#### 9.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_formal_professional_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
يسرّنا دعوة {{1}} إلى «{{2}}»، ونعتز بحضورك بين ضيفاتنا.
يُقام اللقاء يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

يسرّنا الترحيب بك، ونقدّر مشاركتك.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 9.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_formal_professional_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
يسرّنا دعوة {{1}} إلى «{{2}}»، ونعتز بحضورك بين ضيفاتنا.
يُقام اللقاء يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

يسرّنا الترحيب بك، ونقدّر مشاركتك.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 9.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_formal_professional_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
يسرّنا دعوة {{1}} إلى «{{2}}»، ونعتز بحضورك بين ضيفاتنا.
يُقام اللقاء يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

يسرّنا الترحيب بك، ونقدّر مشاركتك.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 9.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_formal_professional_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
يسرّنا دعوة {{1}} إلى «{{2}}»، ونعتز بحضورك بين ضيفاتنا.
يُقام اللقاء يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسرّنا الترحيب بك، ونقدّر مشاركتك.
```

**Buttons:** none

---

### 9.3 صحبة جميلة — العصرية `modern`

- **Scenario:** لقاء خفيف للصديقات
- **Audience:** الصديقات
- **Sender perspective:** المضيفة أو المجموعة
- **Gender scope:** مؤنث للضيفة
- **Mandatory eligibility:** يُستخدم للصديقات وفي لقاء غير رسمي.
- **Meta sample title:** `لقاء الصديقات`

#### 9.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_casual_friends_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
يا هلا {{1}}، موعدنا مع صحبة جميلة ووقت لطيف في «{{2}}» 💫
نقضي وقتًا خفيفًا بين الحديث والضحك والذكريات الجميلة.
نلتقي يوم {{3}}، عند {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نفرح بلقائك وقضاء هذا الوقت معك.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 9.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_casual_friends_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
يا هلا {{1}}، موعدنا مع صحبة جميلة ووقت لطيف في «{{2}}» 💫
نقضي وقتًا خفيفًا بين الحديث والضحك والذكريات الجميلة.
نلتقي يوم {{3}}، عند {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نفرح بلقائك وقضاء هذا الوقت معك.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 9.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_casual_friends_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
يا هلا {{1}}، موعدنا مع صحبة جميلة ووقت لطيف في «{{2}}» 💫
نقضي وقتًا خفيفًا بين الحديث والضحك والذكريات الجميلة.
نلتقي يوم {{3}}، عند {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نفرح بلقائك وقضاء هذا الوقت معك.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 9.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_casual_friends_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
يا هلا {{1}}، موعدنا مع صحبة جميلة ووقت لطيف في «{{2}}» 💫
نقضي وقتًا خفيفًا بين الحديث والضحك والذكريات الجميلة.
نلتقي يوم {{3}}، عند {{4}}، في {{5}}.

نفرح بلقائك وقضاء هذا الوقت معك.
```

**Buttons:** none

---

### 9.4 ليلة قريبة من العروس — الشخصية `intimate`

- **Scenario:** ليلة حناء أو مناسبة خاصة بالعروس
- **Audience:** القريبات والصديقات
- **Sender perspective:** العروس أو أسرتها
- **Gender scope:** مؤنث للضيفة
- **Mandatory eligibility:** يُستخدم للضيفات فقط ولمناسبة مرتبطة بالعروس.
- **Meta sample title:** `ليلة حناء العروس دانة`

#### 9.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_bride_night_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
أهلًا {{1}}، نحتفل بالعروس في ليلة خاصة، ويسعدها أن تكوني معها في «{{2}}».
لقاء دافئ يجمع القريبات والصديقات حول العروس في أجواء جميلة.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نسعد بمشاركتك العروس فرحتها في هذه الليلة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 9.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_bride_night_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
أهلًا {{1}}، نحتفل بالعروس في ليلة خاصة، ويسعدها أن تكوني معها في «{{2}}».
لقاء دافئ يجمع القريبات والصديقات حول العروس في أجواء جميلة.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نسعد بمشاركتك العروس فرحتها في هذه الليلة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 9.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_bride_night_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
أهلًا {{1}}، نحتفل بالعروس في ليلة خاصة، ويسعدها أن تكوني معها في «{{2}}».
لقاء دافئ يجمع القريبات والصديقات حول العروس في أجواء جميلة.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نسعد بمشاركتك العروس فرحتها في هذه الليلة.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 9.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_bride_night_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
أهلًا {{1}}، نحتفل بالعروس في ليلة خاصة، ويسعدها أن تكوني معها في «{{2}}».
لقاء دافئ يجمع القريبات والصديقات حول العروس في أجواء جميلة.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

نسعد بمشاركتك العروس فرحتها في هذه الليلة.
```

**Buttons:** none

---

### 9.5 أمسية بين الأهل — الأصيلة `heritage`

- **Scenario:** لقاء نسائي عائلي بطابع خليجي
- **Audience:** نساء العائلة والقريبات
- **Sender perspective:** المضيفة أو الأسرة
- **Gender scope:** مؤنث للضيفة
- **Mandatory eligibility:** يُستخدم للضيفات فقط وفي لقاء عائلي.
- **Meta sample title:** `ليلة تراث وأصالة`

#### 9.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_ladies_event_family_heritage_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
حيّاكِ الله يا {{1}}، ونرحّب بك في «{{2}}» بين الأهل والقريبات.
أمسية تجمع الود وكرم الضيافة وروح المناسبات التي نحبها.
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

لك منّا خالص الترحيب، ونسعد بلقائك.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 9.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_ladies_event_family_heritage_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
حيّاكِ الله يا {{1}}، ونرحّب بك في «{{2}}» بين الأهل والقريبات.
أمسية تجمع الود وكرم الضيافة وروح المناسبات التي نحبها.
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

لك منّا خالص الترحيب، ونسعد بلقائك.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 9.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_ladies_event_family_heritage_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
حيّاكِ الله يا {{1}}، ونرحّب بك في «{{2}}» بين الأهل والقريبات.
أمسية تجمع الود وكرم الضيافة وروح المناسبات التي نحبها.
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

لك منّا خالص الترحيب، ونسعد بلقائك.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 9.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_ladies_event_family_heritage_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `ladies_event`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
حيّاكِ الله يا {{1}}، ونرحّب بك في «{{2}}» بين الأهل والقريبات.
أمسية تجمع الود وكرم الضيافة وروح المناسبات التي نحبها.
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

لك منّا خالص الترحيب، ونسعد بلقائك.
```

**Buttons:** none

---

## 10. General occasion — المناسبة العامة `general_event`

### 10.1 فرحة الإنجاز — الدافئة `warm`

- **Scenario:** تخرج أو إنجاز شخصي
- **Audience:** العائلة والأصدقاء والزملاء
- **Sender perspective:** صاحب الإنجاز أو الأسرة
- **Gender scope:** محايد للضيف ولصاحب الإنجاز
- **Mandatory eligibility:** يُستخدم للتخرج أو لإنجاز شخصي واضح في عنوان المناسبة.
- **Meta sample title:** `حفل تخرج سارة`

#### 10.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_graduation_achievement_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
وراء كل إنجاز رحلة تستحق الاحتفاء، ويسعدنا يا {{1}} أن نشاركك «{{2}}».
نحتفل بثمرة جهد وبداية مرحلة جديدة مع كل من شاركنا الطريق.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نفرح بلقائك ومشاركتنا لحظة الإنجاز 🎓
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 10.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_graduation_achievement_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
وراء كل إنجاز رحلة تستحق الاحتفاء، ويسعدنا يا {{1}} أن نشاركك «{{2}}».
نحتفل بثمرة جهد وبداية مرحلة جديدة مع كل من شاركنا الطريق.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نفرح بلقائك ومشاركتنا لحظة الإنجاز 🎓
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 10.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_graduation_achievement_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
وراء كل إنجاز رحلة تستحق الاحتفاء، ويسعدنا يا {{1}} أن نشاركك «{{2}}».
نحتفل بثمرة جهد وبداية مرحلة جديدة مع كل من شاركنا الطريق.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نفرح بلقائك ومشاركتنا لحظة الإنجاز 🎓
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 10.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_graduation_achievement_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
وراء كل إنجاز رحلة تستحق الاحتفاء، ويسعدنا يا {{1}} أن نشاركك «{{2}}».
نحتفل بثمرة جهد وبداية مرحلة جديدة مع كل من شاركنا الطريق.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

نفرح بلقائك ومشاركتنا لحظة الإنجاز 🎓
```

**Buttons:** none

---

### 10.2 دعوة إلى منزلنا الجديد — الكلاسيكية `classic`

- **Scenario:** احتفال بمنزل جديد
- **Audience:** العائلة والأصدقاء والجيران
- **Sender perspective:** أصحاب المنزل
- **Gender scope:** محايد للضيف
- **Mandatory eligibility:** لا يُستخدم إلا لزيارة أو احتفال مرتبط بمنزل جديد.
- **Meta sample title:** `لقاء الأحبة في منزلنا الجديد`

#### 10.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_new_home_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
بمناسبة انتقالنا إلى منزلنا الجديد، يسرّنا دعوة {{1}} إلى «{{2}}».
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

يسعدنا أن يبدأ هذا المنزل بلقاء الأحبة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 10.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_new_home_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
بمناسبة انتقالنا إلى منزلنا الجديد، يسرّنا دعوة {{1}} إلى «{{2}}».
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

يسعدنا أن يبدأ هذا المنزل بلقاء الأحبة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 10.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_new_home_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
بمناسبة انتقالنا إلى منزلنا الجديد، يسرّنا دعوة {{1}} إلى «{{2}}».
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

يسعدنا أن يبدأ هذا المنزل بلقاء الأحبة.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 10.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_new_home_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
بمناسبة انتقالنا إلى منزلنا الجديد، يسرّنا دعوة {{1}} إلى «{{2}}».
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا أن يبدأ هذا المنزل بلقاء الأحبة.
```

**Buttons:** none

---

### 10.3 موعد الافتتاح — العصرية `modern`

- **Scenario:** افتتاح مشروع أو إطلاق جديد
- **Audience:** العملاء والشركاء والأصدقاء
- **Sender perspective:** صاحب المشروع أو الجهة
- **Gender scope:** محايد للضيف
- **Mandatory eligibility:** يُستخدم لافتتاح أو إطلاق فعلي، لا لمناسبة عامة.
- **Meta sample title:** `افتتاح استوديو نور`

#### 10.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_opening_launch_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
بدأت الفكرة بخطوة، واليوم نحتفل بانطلاقتها. يا هلا {{1}} في «{{2}}» ✨
نشاركك بداية جديدة صنعتها أيام من العمل والطموح.
موعد الافتتاح يوم {{3}}، عند {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نقدّر مشاركتك هذه البداية منذ لحظاتها الأولى.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 10.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_opening_launch_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
بدأت الفكرة بخطوة، واليوم نحتفل بانطلاقتها. يا هلا {{1}} في «{{2}}» ✨
نشاركك بداية جديدة صنعتها أيام من العمل والطموح.
موعد الافتتاح يوم {{3}}، عند {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نقدّر مشاركتك هذه البداية منذ لحظاتها الأولى.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 10.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_opening_launch_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
بدأت الفكرة بخطوة، واليوم نحتفل بانطلاقتها. يا هلا {{1}} في «{{2}}» ✨
نشاركك بداية جديدة صنعتها أيام من العمل والطموح.
موعد الافتتاح يوم {{3}}، عند {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نقدّر مشاركتك هذه البداية منذ لحظاتها الأولى.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 10.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_opening_launch_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
بدأت الفكرة بخطوة، واليوم نحتفل بانطلاقتها. يا هلا {{1}} في «{{2}}» ✨
نشاركك بداية جديدة صنعتها أيام من العمل والطموح.
موعد الافتتاح يوم {{3}}، عند {{4}}، في {{5}}.

نقدّر مشاركتك هذه البداية منذ لحظاتها الأولى.
```

**Buttons:** none

---

### 10.4 مسيرة تستحق التقدير — الشخصية `intimate`

- **Scenario:** تكريم أو تقاعد
- **Audience:** العائلة والأصدقاء والزملاء
- **Sender perspective:** الأسرة أو جهة العمل
- **Gender scope:** محايد للضيف وللمكرّم
- **Mandatory eligibility:** يُستخدم للتكريم أو التقاعد، وليس لوداع عابر.
- **Meta sample title:** `حفل تكريم الأستاذ سامي`

#### 10.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_recognition_retirement_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
نجتمع تقديرًا لمسيرة تركت أثرًا طيبًا، ويسعدنا يا {{1}} حضور «{{2}}».
نستعيد فيه الذكريات الجميلة ونحتفي بالأثر الذي تركته هذه المسيرة.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نعتز بحضورك في لقاء يليق بهذه المسيرة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 10.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_recognition_retirement_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
نجتمع تقديرًا لمسيرة تركت أثرًا طيبًا، ويسعدنا يا {{1}} حضور «{{2}}».
نستعيد فيه الذكريات الجميلة ونحتفي بالأثر الذي تركته هذه المسيرة.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نعتز بحضورك في لقاء يليق بهذه المسيرة.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 10.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_recognition_retirement_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
نجتمع تقديرًا لمسيرة تركت أثرًا طيبًا، ويسعدنا يا {{1}} حضور «{{2}}».
نستعيد فيه الذكريات الجميلة ونحتفي بالأثر الذي تركته هذه المسيرة.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نعتز بحضورك في لقاء يليق بهذه المسيرة.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 10.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_recognition_retirement_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
نجتمع تقديرًا لمسيرة تركت أثرًا طيبًا، ويسعدنا يا {{1}} حضور «{{2}}».
نستعيد فيه الذكريات الجميلة ونحتفي بالأثر الذي تركته هذه المسيرة.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

نعتز بحضورك في لقاء يليق بهذه المسيرة.
```

**Buttons:** none

---

### 10.5 لمّة العيد — الأصيلة `heritage`

- **Scenario:** لقاء عائلي أو مجتمعي في العيد
- **Audience:** العائلة والأصدقاء وأهل الحي
- **Sender perspective:** الأسرة أو الجهة المنظمة
- **Gender scope:** محايد للضيف
- **Mandatory eligibility:** يُستخدم لعيد الفطر أو الأضحى مع تحديد العيد في عنوان المناسبة.
- **Meta sample title:** `لقاء عيد الفطر`

#### 10.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_general_event_eid_family_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
العيد أجمل باللمّة، وحيّاك الله يا {{1}} في «{{2}}».
نلتقي على المحبة وصلة الرحم وفرحة العيد بين الأهل والأحبة.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نلقاك بكل ترحيب، وعساكم من عوّاده.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 10.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_general_event_eid_family_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
العيد أجمل باللمّة، وحيّاك الله يا {{1}} في «{{2}}».
نلتقي على المحبة وصلة الرحم وفرحة العيد بين الأهل والأحبة.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نلقاك بكل ترحيب، وعساكم من عوّاده.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 10.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_general_event_eid_family_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
العيد أجمل باللمّة، وحيّاك الله يا {{1}} في «{{2}}».
نلتقي على المحبة وصلة الرحم وفرحة العيد بين الأهل والأحبة.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نلقاك بكل ترحيب، وعساكم من عوّاده.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 10.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_general_event_eid_family_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `general_event`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
العيد أجمل باللمّة، وحيّاك الله يا {{1}} في «{{2}}».
نلتقي على المحبة وصلة الرحم وفرحة العيد بين الأهل والأحبة.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

نلقاك بكل ترحيب، وعساكم من عوّاده.
```

**Buttons:** none

---

## 11. Conference and professional events — المؤتمر والفعاليات المهنية `conference`

### 11.1 دعوة الحضور — الدافئة `warm`

- **Scenario:** دعوة عامة لحضور مؤتمر أو ملتقى
- **Audience:** الحضور العام
- **Sender perspective:** الجهة المنظمة
- **Gender scope:** محايد للضيف
- **Recipient role:** حاضر
- **Mandatory eligibility:** يُستخدم للحضور العام وليس للمتحدثين أو الرعاة.
- **Meta sample title:** `ملتقى مجتمع المصممين`

#### 11.1.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_attendee_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
مرحبًا {{1}}، يسرّنا دعوتك لحضور «{{2}}».
يجمع الحدث المهتمين بالمجال في جلسات مفيدة وفرص للتعارف وتبادل الخبرات.
يُقام يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نتطلع إلى الترحيب بك ولقائك في الحدث.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 11.1.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_attendee_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
مرحبًا {{1}}، يسرّنا دعوتك لحضور «{{2}}».
يجمع الحدث المهتمين بالمجال في جلسات مفيدة وفرص للتعارف وتبادل الخبرات.
يُقام يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نتطلع إلى الترحيب بك ولقائك في الحدث.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 11.1.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_attendee_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
مرحبًا {{1}}، يسرّنا دعوتك لحضور «{{2}}».
يجمع الحدث المهتمين بالمجال في جلسات مفيدة وفرص للتعارف وتبادل الخبرات.
يُقام يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نتطلع إلى الترحيب بك ولقائك في الحدث.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 11.1.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_attendee_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
مرحبًا {{1}}، يسرّنا دعوتك لحضور «{{2}}».
يجمع الحدث المهتمين بالمجال في جلسات مفيدة وفرص للتعارف وتبادل الخبرات.
يُقام يوم {{3}}، في تمام {{4}}، في {{5}}.

نتطلع إلى الترحيب بك ولقائك في الحدث.
```

**Buttons:** none

---

### 11.2 دعوة الوفود والضيوف — الكلاسيكية `classic`

- **Scenario:** دعوة رسمية لضيف أو عضو وفد بصفة حاضر
- **Audience:** الوفود والضيوف الرسميون
- **Sender perspective:** الجهة المنظمة
- **Gender scope:** محايد للضيف
- **Recipient role:** حاضر رسمي
- **Mandatory eligibility:** هذه ليست دعوة متحدث؛ يُستخدم فقط لمن سيحضر بصفته ضيفًا أو عضو وفد.
- **Meta sample title:** `ملتقى القيادات 2026`

#### 11.2.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_formal_delegate_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
يسرّنا دعوة {{1}} لحضور «{{2}}» ضمن ضيوف الحدث.
يُقام البرنامج يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نعتز بحضورك، ويسرّنا الترحيب بك.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 11.2.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_formal_delegate_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
يسرّنا دعوة {{1}} لحضور «{{2}}» ضمن ضيوف الحدث.
يُقام البرنامج يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نعتز بحضورك، ويسرّنا الترحيب بك.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 11.2.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_formal_delegate_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
يسرّنا دعوة {{1}} لحضور «{{2}}» ضمن ضيوف الحدث.
يُقام البرنامج يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نعتز بحضورك، ويسرّنا الترحيب بك.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 11.2.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_formal_delegate_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
السلام عليكم ورحمة الله وبركاته،
يسرّنا دعوة {{1}} لحضور «{{2}}» ضمن ضيوف الحدث.
يُقام البرنامج يوم {{3}}، في تمام {{4}}، وذلك في {{5}}.

نعتز بحضورك، ويسرّنا الترحيب بك.
```

**Buttons:** none

---

### 11.3 لقاء القيادات — العصرية `modern`

- **Scenario:** دعوة تنفيذية أو لكبار الضيوف
- **Audience:** القيادات وكبار الضيوف
- **Sender perspective:** الجهة المنظمة
- **Gender scope:** محايد للضيف
- **Recipient role:** ضيف تنفيذي
- **Mandatory eligibility:** يُستخدم للمدعوين التنفيذيين وكبار الضيوف فقط.
- **Meta sample title:** `مجلس قادة الأعمال`

#### 11.3.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_executive_vip_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
مرحبًا {{1}}، ندعوك إلى «{{2}}» لحوار مركّز بين قيادات المجال 💡
نناقش الفرص والتحديات، ونتبادل الرؤى، ونبني علاقات مهنية جديدة.
نلتقي يوم {{3}}، عند {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

نقدّر حضورك وإسهامك في هذا اللقاء.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 11.3.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_executive_vip_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
مرحبًا {{1}}، ندعوك إلى «{{2}}» لحوار مركّز بين قيادات المجال 💡
نناقش الفرص والتحديات، ونتبادل الرؤى، ونبني علاقات مهنية جديدة.
نلتقي يوم {{3}}، عند {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

نقدّر حضورك وإسهامك في هذا اللقاء.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 11.3.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_executive_vip_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
مرحبًا {{1}}، ندعوك إلى «{{2}}» لحوار مركّز بين قيادات المجال 💡
نناقش الفرص والتحديات، ونتبادل الرؤى، ونبني علاقات مهنية جديدة.
نلتقي يوم {{3}}، عند {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

نقدّر حضورك وإسهامك في هذا اللقاء.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 11.3.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_executive_vip_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
مرحبًا {{1}}، ندعوك إلى «{{2}}» لحوار مركّز بين قيادات المجال 💡
نناقش الفرص والتحديات، ونتبادل الرؤى، ونبني علاقات مهنية جديدة.
نلتقي يوم {{3}}، عند {{4}}، في {{5}}.

نقدّر حضورك وإسهامك في هذا اللقاء.
```

**Buttons:** none

---

### 11.4 جلسة عملية — الشخصية `intimate`

- **Scenario:** ورشة أو جلسة عملية محدودة العدد
- **Audience:** المهتمون بالمشاركة العملية
- **Sender perspective:** الجهة المنظمة أو الميسّر
- **Gender scope:** محايد للضيف
- **Recipient role:** مشارك
- **Mandatory eligibility:** يُستخدم لورشة أو جلسة تفاعلية، ولا يفترض أن الضيف مسجل مسبقًا.
- **Meta sample title:** `ورشة بناء العلامات التجارية`

#### 11.4.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_workshop_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
يسرّنا يا {{1}} دعوتك إلى «{{2}}»، وهي جلسة عملية ومركّزة بعدد محدود من الحضور.
يتضمن اللقاء تطبيقات عملية ونقاشًا مفتوحًا وتبادلًا للخبرات.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

يسعدنا حضورك ومشاركتك في النقاش.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 11.4.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_workshop_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
يسرّنا يا {{1}} دعوتك إلى «{{2}}»، وهي جلسة عملية ومركّزة بعدد محدود من الحضور.
يتضمن اللقاء تطبيقات عملية ونقاشًا مفتوحًا وتبادلًا للخبرات.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

يسعدنا حضورك ومشاركتك في النقاش.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 11.4.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_workshop_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
يسرّنا يا {{1}} دعوتك إلى «{{2}}»، وهي جلسة عملية ومركّزة بعدد محدود من الحضور.
يتضمن اللقاء تطبيقات عملية ونقاشًا مفتوحًا وتبادلًا للخبرات.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

يسعدنا حضورك ومشاركتك في النقاش.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 11.4.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_workshop_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
يسرّنا يا {{1}} دعوتك إلى «{{2}}»، وهي جلسة عملية ومركّزة بعدد محدود من الحضور.
يتضمن اللقاء تطبيقات عملية ونقاشًا مفتوحًا وتبادلًا للخبرات.
موعدنا يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا حضورك ومشاركتك في النقاش.
```

**Buttons:** none

---

### 11.5 ملتقى أهل الخبرة — الأصيلة `heritage`

- **Scenario:** ملتقى للتعارف وتبادل الخبرات
- **Audience:** المهنيون ورواد المجال
- **Sender perspective:** الجهة المنظمة
- **Gender scope:** محايد للضيف
- **Recipient role:** حاضر للتواصل المهني
- **Mandatory eligibility:** يُستخدم عندما يكون التواصل المهني هدفًا أساسيًا للحدث.
- **Meta sample title:** `منتدى رواد الأعمال`

#### 11.5.1 رد مع رمز دخول — `reply_and_qr`

- **Meta name:** `halaa_conference_networking_reply_qr_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_and_qr`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، ونرحّب بك في «{{2}}» بين أهل الخبرة ورواد المجال.
ملتقى للتعارف وتبادل التجارب وبناء علاقات مهنية ممتدة.
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه. وعند تأكيد الحضور، نرسل إليك رمز الدخول الخاص بك.

لك منّا كل الترحيب، ونسعد بلقائك.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 11.5.2 رد فقط — `reply_only`

- **Meta name:** `halaa_conference_networking_reply_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `reply_only`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، ونرحّب بك في «{{2}}» بين أهل الخبرة ورواد المجال.
ملتقى للتعارف وتبادل التجارب وبناء علاقات مهنية ممتدة.
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

يسعدنا معرفة ردّك عبر أحد الخيارات أدناه.

لك منّا كل الترحيب، ونسعد بلقائك.
```

**Quick replies**

| Visible label | Current backend status |
|---|---|
| `سأحضر` | `confirmed` |
| `سأعتذر` | `declined` |
| `ربما` | `maybe` |

---

#### 11.5.3 رمز دخول فقط — `qr_only`

- **Meta name:** `halaa_conference_networking_qr_only_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `qr_only`
- **Venue compatibility:** `physical_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، ونرحّب بك في «{{2}}» بين أهل الخبرة ورواد المجال.
ملتقى للتعارف وتبادل التجارب وبناء علاقات مهنية ممتدة.
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

رمز الدخول متاح عبر زر «عرض رمز الدخول». يرجى الاحتفاظ به واتباع تعليمات الدخول عند موعد المناسبة.

لك منّا كل الترحيب، ونسعد بلقائك.
```

**Dynamic URL button**

```text
Label: عرض رمز الدخول
URL: https://halaa.sa/ar/invitation/{{1}}
Runtime parameter source: guest.qrcode
```

---

#### 11.5.4 دعوة معلوماتية — `none`

- **Meta name:** `halaa_conference_networking_none_ar_v4`
- **Requested Meta category:** `MARKETING` with `allow_category_change: true`
- **Halaa category:** `conference`
- **Halaa invitation mode:** `none`
- **Venue compatibility:** `physical_online_or_hybrid`

**Body**

```text
حيّاك الله يا {{1}}، ونرحّب بك في «{{2}}» بين أهل الخبرة ورواد المجال.
ملتقى للتعارف وتبادل التجارب وبناء علاقات مهنية ممتدة.
نستقبلك يوم {{3}}، في تمام {{4}}، في {{5}}.

لك منّا كل الترحيب، ونسعد بلقائك.
```

**Buttons:** none

---

## 12. Application integration gates before submission

1. Unify category codes across the Event model, web, mobile, template categories, and this catalog.
2. Add scenario title, voice, audience, sender perspective, gender scope, event stage, recipient role, requirements, and venue compatibility to the TAQNYAT template cache and host API.
3. Display the host-facing scenario title and eligibility note in the picker; never show five anonymous cards with only the same category label.
4. Enforce child gender and birth stage for baby templates and recipient gender for ladies' templates.
5. Enforce the surprise flag for surprise birthdays and the sender identity for family/couple templates.
6. Add guest WhatsApp consent evidence and a per-number suppression/opt-out workflow.
7. Add an image-header/button-capable batch submission path using the generated JSON catalog.
8. Add formatted time and location display fields later; until then V5 deliberately maps to the current runtime keys.

## 13. Pilot submission sequence

1. Complete native Saudi-Arabic review of the five wedding originals.
2. Render all 20 wedding templates on narrow-screen WhatsApp previews in light and dark appearance.
3. Run this generator and require zero validation errors.
4. Upload and verify the image-header sample media.
5. Submit the 20 wedding templates only.
6. Test accept, decline, maybe, QR delivery, QR-only URL, no-button mode, SMS fallback, and public image retrieval on real devices.
7. Monitor rejection reasons, delivery, reads, responses, blocks, and quality rating before submitting the next category.

## 14. Official references

- [TAQNYAT WhatsApp API documentation](https://dev.taqnyat.sa/en/doc/whatsapp/)
- [TAQNYAT template creation and rejection guidance](https://blog.taqnyat.sa/en/post/whatsApp_business_templates/)
- [TAQNYAT professional marketing/template guidance](https://blog.taqnyat.sa/en/post/marketing_WhatsApp_Business_API/)

---

Generated by `docs/generate-taqnyat-catalog-v5.js`. Edit the generator source, not the generated Markdown or JSON files.


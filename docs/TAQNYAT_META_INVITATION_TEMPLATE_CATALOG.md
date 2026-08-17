# Halaa WhatsApp Invitation Template Catalog

> **Starter catalog superseded:** the production expansion is now maintained in
> [`TAQNYAT_META_INVITATION_TEMPLATE_CATALOG_140.md`](./TAQNYAT_META_INVITATION_TEMPLATE_CATALOG_140.md),
> with five creative directions and twenty templates per event category.

**Purpose:** production-ready Arabic invitation templates for submission to Meta through Taqnyat and assignment in the Halaa admin dashboard.

**Version:** 1.0  
**Language:** Arabic (`ar`)  
**Application template type:** `invite`  
**Coverage:** 7 event categories × 4 invitation modes = 28 templates

---

## 1. Submission rules

Use these values for every template unless a template section says otherwise:

| Field | Value |
|---|---|
| Meta category | `UTILITY` |
| Allow category change | `true` |
| Language | `ar` |
| Header | `IMAGE` |
| Footer | `هلا — دعوات تليق بمناسبتك` |
| Halaa type after sync | `invite` |

Meta may reclassify an invitation as `MARKETING`. Keep `allow_category_change: true` and accept Meta's classification rather than repeatedly resubmitting identical copy.

The image header is intentional: Halaa already sends the event's generated invitation artwork as the template header. The sample submitted for review must be a neutral, high-quality invitation card with no personal information.

### Required body variables

All 28 templates use the same five body variables, in the same order. This makes dashboard assignment predictable and matches the current backend resolver.

| Placeholder | Halaa source key | Example submitted to Meta |
|---|---|---|
| `{{1}}` | `guest.name` | `عبدالله الشهري` |
| `{{2}}` | `eventDetails.title` | Category-specific event title |
| `{{3}}` | `eventDetails.dateFormatted` | `الجمعة 15 أغسطس 2026` |
| `{{4}}` | `eventDetails.time` | `8:30 مساءً` |
| `{{5}}` | `eventDetails.location.address` | `قاعة ليلتي، جدة` |

Do not change the placeholder order. In the Halaa dashboard, assign the five mappings exactly as listed above.

### Invitation-mode controls

| Halaa mode | Required Meta controls | What happens in Halaa |
|---|---|---|
| `reply_and_qr` | Three quick replies: `سأحضر`, `سأعتذر`, `ربما` | A guest who chooses `سأحضر` receives their QR entry pass afterward. |
| `reply_only` | Three quick replies: `سأحضر`, `سأعتذر`, `ربما` | The response is recorded; no QR is issued. |
| `qr_only` | One dynamic URL button: `عرض رمز الدخول` | Opens the guest's invitation page and entry QR directly. |
| `none` | No buttons | Informational invitation only; no RSVP and no QR. |

For every `qr_only` template, register this exact dynamic URL:

```text
https://halaa.sa/ar/invitation/{{1}}
```

The `{{1}}` in the URL button is a **button parameter**, separate from the five body placeholders. Halaa supplies the guest's unique invitation code at send time. Confirm the final production domain before submission; an approved template's URL domain cannot be casually changed later.

---

## 2. Wedding — `wedding`

### 2.1 Reply and QR

- **Meta name:** `halaa_wedding_reply_qr_ar_v1`
- **Halaa invitation mode:** `reply_and_qr`
- **Sample event title:** `حفل زفاف أحمد ونورة`

**Body**

```text
أهلًا {{1}}،

نود أن تكون معنا في ليلةٍ تعني لنا الكثير. يسعدنا دعوتك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه الفرحة؟ عند تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
بانتظارك، فبك تكتمل فرحتنا 🤍
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

### 2.2 Reply only

- **Meta name:** `halaa_wedding_reply_only_ar_v1`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

نود أن تكون معنا في ليلةٍ تعني لنا الكثير. يسعدنا دعوتك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه الفرحة؟
بانتظارك، فبك تكتمل فرحتنا 🤍
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

### 2.3 QR only

- **Meta name:** `halaa_wedding_qr_only_ar_v1`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

نود أن تكون معنا في ليلةٍ تعني لنا الكثير. يسعدنا دعوتك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

أعددنا لك رمز دخولك الخاص، وستجده في الزر المرفق لاستخدامه عند الوصول.
بانتظارك، فبك تكتمل فرحتنا 🤍
```

**Dynamic URL button:** `عرض رمز الدخول`

### 2.4 Information only

- **Meta name:** `halaa_wedding_none_ar_v1`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

نود أن تكون معنا في ليلةٍ تعني لنا الكثير. يسعدنا دعوتك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بانتظارك، فبك تكتمل فرحتنا 🤍
```

**Buttons:** none

---

## 3. Engagement — `engagement`

### 3.1 Reply and QR

- **Meta name:** `halaa_engagement_reply_qr_ar_v1`
- **Halaa invitation mode:** `reply_and_qr`
- **Sample event title:** `حفل خطوبة خالد وسارة`

**Body**

```text
أهلًا {{1}}،

نشاركك اليوم فرحةً قريبة من القلب، ويسعدنا أن تكون معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكون معنا؟ عند تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
وجودك سيجعل هذه المناسبة أجمل 🤍
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

### 3.2 Reply only

- **Meta name:** `halaa_engagement_reply_only_ar_v1`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

نشاركك اليوم فرحةً قريبة من القلب، ويسعدنا أن تكون معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكون معنا؟
وجودك سيجعل هذه المناسبة أجمل 🤍
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

### 3.3 QR only

- **Meta name:** `halaa_engagement_qr_only_ar_v1`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

نشاركك اليوم فرحةً قريبة من القلب، ويسعدنا أن تكون معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

أعددنا لك رمز دخولك الخاص، وستجده في الزر المرفق لاستخدامه عند الوصول.
وجودك سيجعل هذه المناسبة أجمل 🤍
```

**Dynamic URL button:** `عرض رمز الدخول`

### 3.4 Information only

- **Meta name:** `halaa_engagement_none_ar_v1`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

نشاركك اليوم فرحةً قريبة من القلب، ويسعدنا أن تكون معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

وجودك سيجعل هذه المناسبة أجمل 🤍
```

**Buttons:** none

---

## 4. Birthday — `birthday`

### 4.1 Reply and QR

- **Meta name:** `halaa_birthday_reply_qr_ar_v1`
- **Halaa invitation mode:** `reply_and_qr`
- **Sample event title:** `عيد ميلاد ليان`

**Body**

```text
يا هلا {{1}} 🎈

سنحتفل معًا في {{2}}، وما تحلى الحفلة إلا بوجود من نحب.
ننتظرك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستحتفل معنا؟ عند تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
وجودك أجمل هدية 🎈
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

### 4.2 Reply only

- **Meta name:** `halaa_birthday_reply_only_ar_v1`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} 🎈

سنحتفل معًا في {{2}}، وما تحلى الحفلة إلا بوجود من نحب.
ننتظرك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستحتفل معنا؟
وجودك أجمل هدية 🎈
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

### 4.3 QR only

- **Meta name:** `halaa_birthday_qr_only_ar_v1`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} 🎈

سنحتفل معًا في {{2}}، وما تحلى الحفلة إلا بوجود من نحب.
ننتظرك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك موجود في الزر المرفق، وسيكون كل ما تحتاجه عند الوصول.
وجودك أجمل هدية 🎈
```

**Dynamic URL button:** `عرض رمز الدخول`

### 4.4 Information only

- **Meta name:** `halaa_birthday_none_ar_v1`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} 🎈

سنحتفل معًا في {{2}}، وما تحلى الحفلة إلا بوجود من نحب.
ننتظرك يوم {{3}}، عند الساعة {{4}}، في {{5}}.

وجودك أجمل هدية 🎈
```

**Buttons:** none

---

## 5. Baby shower — `baby_shower`

### 5.1 Reply and QR

- **Meta name:** `halaa_baby_shower_reply_qr_ar_v1`
- **Halaa invitation mode:** `reply_and_qr`
- **Sample event title:** `استقبال مولودنا يوسف`

**Body**

```text
أهلًا {{1}}،

كبرت فرحتنا بقدوم صغيرنا، والأجمل أن نشاركها معك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه الفرحة؟ عند تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
ننتظرك بمحبة، فوجودك يعني لنا الكثير 🤍
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

### 5.2 Reply only

- **Meta name:** `halaa_baby_shower_reply_only_ar_v1`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

كبرت فرحتنا بقدوم صغيرنا، والأجمل أن نشاركها معك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستشاركنا هذه الفرحة؟
ننتظرك بمحبة، فوجودك يعني لنا الكثير 🤍
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

### 5.3 QR only

- **Meta name:** `halaa_baby_shower_qr_only_ar_v1`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

كبرت فرحتنا بقدوم صغيرنا، والأجمل أن نشاركها معك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

أعددنا لك رمز دخولك الخاص، وستجده في الزر المرفق لاستخدامه عند الوصول.
ننتظرك بمحبة، فوجودك يعني لنا الكثير 🤍
```

**Dynamic URL button:** `عرض رمز الدخول`

### 5.4 Information only

- **Meta name:** `halaa_baby_shower_none_ar_v1`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

كبرت فرحتنا بقدوم صغيرنا، والأجمل أن نشاركها معك في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

ننتظرك بمحبة، فوجودك يعني لنا الكثير 🤍
```

**Buttons:** none

---

## 6. Ladies' event — `ladies_event`

### 6.1 Reply and QR

- **Meta name:** `halaa_ladies_event_reply_qr_ar_v1`
- **Halaa invitation mode:** `reply_and_qr`
- **Sample event title:** `أمسية الورد`

**Body**

```text
يا هلا {{1}} ✨

أعددنا أمسية جميلة نود أن نقضيها بصحبة من نحب، ويسعدنا أن تكوني معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكونين معنا؟ عند تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
وجودك سيضيف للأمسية فرحة خاصة ✨
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

### 6.2 Reply only

- **Meta name:** `halaa_ladies_event_reply_only_ar_v1`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
يا هلا {{1}} ✨

أعددنا أمسية جميلة نود أن نقضيها بصحبة من نحب، ويسعدنا أن تكوني معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكونين معنا؟
وجودك سيضيف للأمسية فرحة خاصة ✨
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

### 6.3 QR only

- **Meta name:** `halaa_ladies_event_qr_only_ar_v1`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
يا هلا {{1}} ✨

أعددنا أمسية جميلة نود أن نقضيها بصحبة من نحب، ويسعدنا أن تكوني معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

رمز دخولك موجود في الزر المرفق، وستحتاجين إليه عند الوصول.
وجودك سيضيف للأمسية فرحة خاصة ✨
```

**Dynamic URL button:** `عرض رمز الدخول`

### 6.4 Information only

- **Meta name:** `halaa_ladies_event_none_ar_v1`
- **Halaa invitation mode:** `none`

**Body**

```text
يا هلا {{1}} ✨

أعددنا أمسية جميلة نود أن نقضيها بصحبة من نحب، ويسعدنا أن تكوني معنا في {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

وجودك سيضيف للأمسية فرحة خاصة ✨
```

**Buttons:** none

---

## 7. General event — `general_event`

### 7.1 Reply and QR

- **Meta name:** `halaa_general_event_reply_qr_ar_v1`
- **Halaa invitation mode:** `reply_and_qr`
- **Sample event title:** `لقاء العائلة السنوي`

**Body**

```text
أهلًا {{1}}،

لدينا لقاء يسعدنا أن تكون جزءًا منه، ويسرّنا دعوتك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكون معنا؟ عند تأكيد حضورك، سيصلك رمز الدخول الخاص بك.
بانتظارك، فوجودك يجعل اللقاء أجمل.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

### 7.2 Reply only

- **Meta name:** `halaa_general_event_reply_only_ar_v1`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
أهلًا {{1}}،

لدينا لقاء يسعدنا أن تكون جزءًا منه، ويسرّنا دعوتك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستكون معنا؟
بانتظارك، فوجودك يجعل اللقاء أجمل.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

### 7.3 QR only

- **Meta name:** `halaa_general_event_qr_only_ar_v1`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
أهلًا {{1}}،

لدينا لقاء يسعدنا أن تكون جزءًا منه، ويسرّنا دعوتك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

أعددنا لك رمز دخولك الخاص، وستجده في الزر المرفق لاستخدامه عند الوصول.
بانتظارك، فوجودك يجعل اللقاء أجمل.
```

**Dynamic URL button:** `عرض رمز الدخول`

### 7.4 Information only

- **Meta name:** `halaa_general_event_none_ar_v1`
- **Halaa invitation mode:** `none`

**Body**

```text
أهلًا {{1}}،

لدينا لقاء يسعدنا أن تكون جزءًا منه، ويسرّنا دعوتك إلى {{2}}.
نلتقي يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بانتظارك، فوجودك يجعل اللقاء أجمل.
```

**Buttons:** none

---

## 8. Conference — `conference`

### 8.1 Reply and QR

- **Meta name:** `halaa_conference_reply_qr_ar_v1`
- **Halaa invitation mode:** `reply_and_qr`
- **Sample event title:** `ملتقى الابتكار الرقمي`

**Body**

```text
مرحباً {{1}}،

يسرّنا دعوتك إلى {{2}}؛ لقاء يجمع الخبرات والأفكار ويصنع مساحة لحوار مثمر.
يُقام يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستنضم إلينا؟ عند تأكيد حضورك، ستصلك بطاقة الدخول الخاصة بك.
نتطلع إلى حضورك ومشاركتك.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

### 8.2 Reply only

- **Meta name:** `halaa_conference_reply_only_ar_v1`
- **Halaa invitation mode:** `reply_only`

**Body**

```text
مرحباً {{1}}،

يسرّنا دعوتك إلى {{2}}؛ لقاء يجمع الخبرات والأفكار ويصنع مساحة لحوار مثمر.
يُقام يوم {{3}}، عند الساعة {{4}}، في {{5}}.

هل ستنضم إلينا؟
نتطلع إلى حضورك ومشاركتك.
```

**Quick replies, in this order:** `سأحضر` · `سأعتذر` · `ربما`

### 8.3 QR only

- **Meta name:** `halaa_conference_qr_only_ar_v1`
- **Halaa invitation mode:** `qr_only`

**Body**

```text
مرحباً {{1}}،

يسرّنا دعوتك إلى {{2}}؛ لقاء يجمع الخبرات والأفكار ويصنع مساحة لحوار مثمر.
يُقام يوم {{3}}، عند الساعة {{4}}، في {{5}}.

بطاقة دخولك متاحة عبر الزر المرفق لتسجيل أسرع عند الوصول.
نتطلع إلى حضورك ومشاركتك.
```

**Dynamic URL button:** `عرض رمز الدخول`

### 8.4 Information only

- **Meta name:** `halaa_conference_none_ar_v1`
- **Halaa invitation mode:** `none`

**Body**

```text
مرحباً {{1}}،

يسرّنا دعوتك إلى {{2}}؛ لقاء يجمع الخبرات والأفكار ويصنع مساحة لحوار مثمر.
يُقام يوم {{3}}، عند الساعة {{4}}، في {{5}}.

حضورك يثري اللقاء، ونتطلع إلى مشاركتك.
```

**Buttons:** none

---

## 9. Taqnyat payload patterns

Use the exact copy from the relevant section and one of these component patterns.

### 9.1 Three-reply templates (`reply_and_qr`, `reply_only`)

```json
{
  "name": "REPLACE_WITH_META_NAME",
  "category": "UTILITY",
  "language": "ar",
  "allow_category_change": true,
  "components": [
    {
      "type": "HEADER",
      "format": "IMAGE",
      "example": {
        "header_handle": ["REPLACE_WITH_PUBLIC_SAMPLE_IMAGE_URL"]
      }
    },
    {
      "type": "BODY",
      "text": "REPLACE_WITH_BODY_COPY",
      "example": {
        "body_text": [[
          "عبدالله الشهري",
          "REPLACE_WITH_CATEGORY_SAMPLE_TITLE",
          "الجمعة 15 أغسطس 2026",
          "8:30 مساءً",
          "قاعة ليلتي، جدة"
        ]]
      }
    },
    {
      "type": "FOOTER",
      "text": "هلا — دعوات تليق بمناسبتك"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        { "type": "QUICK_REPLY", "text": "سأحضر" },
        { "type": "QUICK_REPLY", "text": "سأعتذر" },
        { "type": "QUICK_REPLY", "text": "ربما" }
      ]
    }
  ]
}
```

### 9.2 QR-only templates (`qr_only`)

```json
{
  "name": "REPLACE_WITH_META_NAME",
  "category": "UTILITY",
  "language": "ar",
  "allow_category_change": true,
  "components": [
    {
      "type": "HEADER",
      "format": "IMAGE",
      "example": {
        "header_handle": ["REPLACE_WITH_PUBLIC_SAMPLE_IMAGE_URL"]
      }
    },
    {
      "type": "BODY",
      "text": "REPLACE_WITH_BODY_COPY",
      "example": {
        "body_text": [[
          "عبدالله الشهري",
          "REPLACE_WITH_CATEGORY_SAMPLE_TITLE",
          "الجمعة 15 أغسطس 2026",
          "8:30 مساءً",
          "قاعة ليلتي، جدة"
        ]]
      }
    },
    {
      "type": "FOOTER",
      "text": "هلا — دعوات تليق بمناسبتك"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "عرض رمز الدخول",
          "url": "https://halaa.sa/ar/invitation/{{1}}",
          "example": ["sample-invitation-code"]
        }
      ]
    }
  ]
}
```

### 9.3 Information-only templates (`none`)

```json
{
  "name": "REPLACE_WITH_META_NAME",
  "category": "UTILITY",
  "language": "ar",
  "allow_category_change": true,
  "components": [
    {
      "type": "HEADER",
      "format": "IMAGE",
      "example": {
        "header_handle": ["REPLACE_WITH_PUBLIC_SAMPLE_IMAGE_URL"]
      }
    },
    {
      "type": "BODY",
      "text": "REPLACE_WITH_BODY_COPY",
      "example": {
        "body_text": [[
          "عبدالله الشهري",
          "REPLACE_WITH_CATEGORY_SAMPLE_TITLE",
          "الجمعة 15 أغسطس 2026",
          "8:30 مساءً",
          "قاعة ليلتي، جدة"
        ]]
      }
    },
    {
      "type": "FOOTER",
      "text": "هلا — دعوات تليق بمناسبتك"
    }
  ]
}
```

---

## 10. After Meta approval

For each approved template:

1. Sync templates from Taqnyat in the Halaa admin dashboard.
2. Open the template assignment screen.
3. Assign the category shown in its section.
4. Set `type` to `invite`.
5. Set the exact `invitationMode` shown in its section.
6. Map `{{1}}` through `{{5}}` using the common variable table in section 1.
7. Confirm the synced button capability:
   - three exact quick replies for `reply_and_qr` and `reply_only`;
   - one dynamic URL for `qr_only`;
   - zero buttons for `none`.
8. Keep the template active only after its image header, body preview, variables, and buttons all match.
9. Send one test invitation for every mode before exposing the template to hosts.

### Test acceptance checklist

- The guest's real name, event title, date, time, and address replace the correct placeholders.
- The generated invitation image loads in WhatsApp.
- Arabic punctuation and line breaks render correctly.
- RSVP button labels are exactly `سأحضر`, `سأعتذر`, and `ربما`.
- `سأحضر` records confirmation; in `reply_and_qr`, it also triggers QR delivery.
- `سأعتذر` records a decline.
- `ربما` records a tentative response.
- The QR-only URL opens the correct guest invitation and never another guest's pass.
- Information-only templates display no buttons.
- SMS fallback remains understandable if WhatsApp delivery is unavailable.

---

## 11. Compliance and approval notes

- Send invitations only to recipients for whom the host has a lawful basis and valid WhatsApp opt-in where required.
- Do not add promotional offers, discounts, unrelated marketing, or misleading urgency to these invitation templates.
- Do not place sensitive guest information in the body, sample values, image, template name, or footer.
- Do not use shortened links for the QR button.
- Do not alter an approved template in place. Submit a new versioned name such as `_v2` when copy or controls must change.
- Keep message frequency reasonable and honour opt-out requests.
- Meta approval and final category classification remain Meta's decision; this catalog is designed to reduce avoidable rejection and to match Halaa's current sending contract.

## 12. Official references

- [Taqnyat WhatsApp API documentation](https://dev.taqnyat.sa/en/doc/whatsapp/)
- [Taqnyat template message elements and limits](https://blog.taqnyat.sa/en/post/template-message-elements-and-size/)
- [Taqnyat template manager](https://blog.taqnyat.sa/en/post/template_manager/)

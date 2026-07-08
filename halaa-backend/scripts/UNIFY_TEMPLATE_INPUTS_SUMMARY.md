# Template inputs unification — summary

Script: `labbe-backend-/scripts/unifyTemplateInputs.js`

Before running it, here's the summary of the inputs and what the script will change. Review and flag any choice that doesn't match the intent.

## Current inputs per category (20 templates) and the inconsistencies

### Wedding (9 templates)
| Template | Current keys |
|---|---|
| Royal Wedding | **groomFamilyName, brideFamilyName**, eventDate, eventTime, venue, invitationMessage |
| Garden Wedding | brideName, groomName, **weddingDate, weddingTime**, venue, address, rsvpDate, hashtag, **guestMessage** |
| Royal Navy Wedding | invitationHeader, **groomFamilyName**, groomName, eventDate, eventTime, venue, invitationMessage |
| Pearl Frame Wedding | invitationHeader, **groomFamilyName**, groomName, eventDate, eventTime, venue, invitationMessage |
| Royal Da'wah Wedding | **groomFamilyName**, groomName, eventDate, eventTime, venue, invitationMessage |
| Pearl Da'wah Wedding | **groomFamilyName**, groomName, eventDate, eventTime, venue, invitationMessage |
| Gulf Groom | **groomFamilyName**, groomName, eventDate, eventTime, venue, invitationMessage |
| Sacred Vows | openingVerse, groomName, brideName, brideFatherName, eventDate, eventTime, venue |
| Bronze Bloom Vows | openingVerse, groomName, brideName, brideFatherName, eventDate, eventTime, venue |

**Inconsistencies:** family-name vs personal-name keys, `weddingDate/Time` vs `eventDate/Time`, `guestMessage` vs `invitationMessage`, orphan form-only fields (`address`, `rsvpDate`, `hashtag` in Garden Wedding have no overlay since the polish pass).

### Engagement (2)
| Template | Current keys |
|---|---|
| Pure Promise | **hisName, herName, engagementDate, engagementTime**, venue, invitationMessage |
| Pearl Promise | brideName, **brideFamilyName**, hostessName, **engagementDate, engagementTime**, venue, invitationMessage |

### Birthday (1)
| Template | Current keys |
|---|---|
| Sweet Celebration | celebrantName, age, **partyDate, partyTime**, venue, theme *(orphan)*, **guestMessage** |

### Baby Shower (3)
| Template | Current keys |
|---|---|
| Blessed Newborn | babyName, parents, birthDate, eventDate, eventTime, venue, weight, **guestMessage** |
| Little Prince | announcement, babyName, parents, birthDate, weight, **guestMessage** |
| Little Princess | announcement, babyName, parents, birthDate, weight, **guestMessage** |

### Ladies' Event (1)
| Template | Current keys |
|---|---|
| Ladies' Gathering | hostessName, eventTitle, eventDate, eventTime, venue, address *(orphan)*, dressCode *(orphan)*, **guestMessage** |

### General Event (3)
| Template | Current keys |
|---|---|
| Spring Meadow | eventTitle, hostName, eventDate, eventTime, venue, **guestMessage** |
| Lantern Night | eventTitle, hostName, eventDate, eventTime, venue, **guestMessage** |
| Sacred Pilgrimage | announcement, pilgrimName, eventDate, eventTime |

### Conference (1)
| Template | Current keys |
|---|---|
| Visionary Conference | **conferenceTitle**, organizerName, keynoteSpeaker, eventDate, eventTime, venue, registrationUrl, **guestMessage** |

## What the script will rename / drop / unify

**Cross-template renames (everywhere they occur):**
- `weddingDate`, `partyDate`, `engagementDate` → `eventDate`
- `weddingTime`, `partyTime`, `engagementTime` → `eventTime`
- `guestMessage` → `invitationMessage`
- `conferenceTitle` → `eventTitle`
- `hisName` → `groomName`, `herName` → `brideName`
- `groomFamilyName` → `groomName`, `brideFamilyName` → `brideName`

**Drops (orphan/redundant fields):**
- Garden Wedding: `address`, `rsvpDate`, `hashtag`
- Sweet Celebration: `theme`
- Ladies' Gathering: `address`, `dressCode`
- Pearl Promise: `brideFamilyName`
- Royal Navy / Pearl Frame / Royal Da'wah / Pearl Da'wah / Gulf Groom: the secondary optional `groomName` (so the centerpiece-renamed `groomFamilyName → groomName` doesn't collide)

**Locked shared limits (anywhere the key appears):**
- `invitationMessage`: textarea, `rows: 3`, `maxLength: 240`
- `venue`: `maxLength: 80`
- `weight`: `min: 0.5, max: 10, step: 0.01`
- `age`: `min: 1, max: 120`

**Per-category default `invitationMessage`** (one shared line per category, host can edit):
- wedding → "يتشرف بدعوتكم لحضور حفل زفافه"
- engagement → "يتشرفان بدعوتكم لحضور حفل خطوبتهما"
- birthday → "يسعدنا حضوركم لمشاركتنا الفرحة"
- baby_shower → "أهلاً وسهلاً بضيف الحياة الجديد"
- ladies_event → "يسرّني أن تكنّ بصحبتي"
- general_event → "يسعدنا حضوركم في هذه المناسبة"
- conference → "نتشرف بدعوتكم لحضور المؤتمر"

**Untouched (genuinely template-unique):** `openingVerse`, `brideFatherName` (marriage-contract templates), `pilgrimName`, `announcement`, `invitationHeader`, `organizerName`, `keynoteSpeaker`, `registrationUrl`, `hostessName`, `hostName`, `dressCode` (kept where it has an overlay).

## ⚠ One judgment call to confirm

For the five groom-side wedding cards (Royal Navy, Pearl Frame, Royal Da'wah, Pearl Da'wah, Gulf Groom), the script renames `groomFamilyName → groomName`. This means the BIG centerpiece text on those cards now reads as a personal name rather than a family name. If family names should be preserved on those specific cards, the script needs adjusting.

## How to run

```
node scripts/unifyTemplateInputs.js --dry-run --verbose   # inspect
node scripts/unifyTemplateInputs.js                       # apply
```

The script is idempotent (re-running is a no-op once unified) and uses `service.updateTemplate` with `expectedVersion`, so optimistic-locking still protects against concurrent admin edits. Run dry-run first against the live DB — the note that "maybe some stuff changed" means a real check is worth doing before writing.

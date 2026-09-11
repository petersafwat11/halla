# Web/mobile post-event parity — 2026-09-11

Scope: the user's pasted post-event issue list and related media/preview behavior. Additional non-post-event mobile issues will be tracked when the user supplies the next list; this is not a claim that all lifecycle QA is closed.

| Issue | Web finding / resolution | Verification |
| --- | --- | --- |
| Selected template colors | Existing brown/cream selection matches Halaa; access preview uses the same palette | CSS inspected, actual page viewed |
| All access links failed | Shared backend language fix applies to both clients; no additional provider change required | Previous backend regression; current event shows 4 WhatsApp sends |
| Missing view / send actions | PublishedView now exposes View shared page, Send access links, Edit published content, Unpublish | Actual event, English at 390px |
| Duplicate page implementation | Route rendered an old copy, bypassing HostPostEventContent fixes. Replaced it with canonical component export; admin already re-exports host route | Regression test verifies all exports match |
| Full template with real variables | Both template picker and access dialog receive backend-rendered previews | Actual dialog contains first guest, event name, full body and public example link |
| Repeated sends | Explicit resend confirmation when prior send succeeded; no automatic resend on view/edit | Dialog Send disabled before confirmation; no messages sent during verification |
| Failed-send feedback | All-failed no longer reports success; partial sends report warning; publish failure-to-notify remains explicit | Code review; failed count excluded from Notified statistic |
| Uploaded images and video | Editor, published/guest gallery and comment images use shared URL resolution, preserving signed URLs | Regression for relative/absolute refs; actual event photo rendered |
| Published editing | Can update caption/media/template without first unpublishing or revoking access | Opened editor then returned to post; no data changed |
| Arabic content | Captions/host names use content-aware direction; new actions translated AR/EN | English small-screen and Arabic desktop inspected |

Checks: 3 web parity regression tests pass; JSX-aware ESLint has no errors (one existing Next image-optimization advisory). Browser uses local web port 3001 and API port 8000. No deployment, no outbound WhatsApp sends, no guest likes/comments created. Published/host preview does not validate a guest token or record a guest visit.

# WhatsApp invitation modes

Hala supports exactly three invitation journeys.

| Mode | Initial WhatsApp controls | Confirmation behavior |
| --- | --- | --- |
| `reply_and_qr` | Two quick replies: `سأحضر`, `سأعتذر` | Records confirmation and sends a follow-up message with the guest QR image. |
| `reply_only` | Two quick replies: `سأحضر`, `سأعتذر` | Records confirmation and sends a text follow-up without a QR. |
| `none` | No buttons | Sends an informational invitation only. Its body does not ask the guest to choose a response. |

The Step 3 invitation design is supplied as the IMAGE header for every invitation template. The body uses the seven-variable mapping documented in the owner manifest. QR delivery is a session follow-up after confirmation; it is never a URL button on the initial template.

Provider templates with a third reply or a direct QR URL are legacy and unsupported. They are permanently excluded from the Hala catalog even if the provider retains their historical definitions.

Event categories come from `shared/src/constants/eventCategories.cjs` in backend, web, and mobile. Ladies' events and baby showers have distinct categories. The owner catalog's `general_event` copy is the intentional fallback for `other`, `graduation`, and `meeting`; specialized ladies-event and baby-shower templates are never used as general fallbacks.

During the current rollout, `WHATSAPP_WEBHOOK_ALLOW_UNSIGNED` defaults to `true`, so Taqnyat callbacks are accepted without `WHATSAPP_APP_SECRET`. This is temporary and intentionally trades webhook authentication for compatibility. Set the flag to `false` after the Meta App Secret is configured to restore HMAC verification.

# WhatsApp invitation-template contract

Every event category needs four separately approved Meta/Taqnyat invitation
templates. In the Halaa admin dashboard, set template purpose to `invite`,
select the event category, then assign exactly one `invitationMode`.

| invitationMode | Approved-template controls | Runtime behavior |
| --- | --- | --- |
| `reply_and_qr` | Exactly 3 quick replies: `سأحضر`, `سأعتذر`, `ربما` | The webhook records the reply. Accept sends the guest's QR entry pass. |
| `reply_only` | Exactly 3 quick replies: `سأحضر`, `سأعتذر`, `ربما` | The webhook records the reply. No QR is issued. |
| `qr_only` | Exactly 1 dynamic URL button and no quick replies | The initial message opens the guest portal, which displays the QR immediately. |
| `none` | No buttons | Informational message only; replies are rejected and no QR is issued. |

For `qr_only`, configure the Meta URL button with its variable at the end. The
preferred production form is:

```text
https://halaa.com.sa/ar/invitation/{{1}}
```

The backend supplies the guest's unique invitation code as `{{1}}`. It also
supplies a signed, 15-minute preview code for test messages, so the test CTA
opens a working preview without exposing a real guest pass.

After the owner creates or updates templates in Meta/Taqnyat:

1. Open Admin Dashboard → WhatsApp Templates.
2. Run **Sync from Taqnyat** so Halaa caches the real button definitions.
3. Open **Assign** for each template.
4. Set its category, purpose `invite`, and invitation mode.
5. Map body variables and activate it.

The dashboard disables modes that do not match the synced controls, and the
backend repeats the same validation when an event is created, updated, tested,
sent, or resent. Existing three-button invite templates are treated as
`reply_and_qr`; the next sync persists that legacy backfill.

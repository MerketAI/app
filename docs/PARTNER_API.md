# Partner (B2B) API

Jasper is sold to **platforms**, not to end consumers. A partner platform holds one
set of application credentials and calls the API on behalf of each of its own
subscribers.

| Value | What it is | Where it comes from |
|---|---|---|
| `APP_KEY` | Public identifier for the partner platform. Says *which platform is allowed to use the API*. | Issued by Jasper. Stored in clear. |
| `APP_SECRET` | Proves the caller really is that platform. | System-generated, shown **once**, stored as a SHA-256 hash. |
| `APP_UID` | The partner's **own** subscriber id. Says *which of the platform's users this call is for*. | Chosen by the partner. Any opaque string, e.g. `UYYHD77887778888` or `23455`. |

Example:

```
APP_KEY     U877666FX667777Z566-dhdhhdhhdhdhd
APP_SECRET  7373@jcchchh!djdjdjjdj7877dhdhdhdh
APP_UID     UYYHD77887778888
```

## Authenticating

Send credentials as headers. There is no OAuth dance and no per-user login —
the partner is trusted, and `APP_UID` selects the subscriber.

```bash
curl https://api.example.com/api/v1/content \
  -H "X-App-Key: U877666FX667777Z566-dhdhhdhhdhdhd" \
  -H "X-App-Secret: 7373@jcchchh!djdjdjjdj7877dhdhdhdh" \
  -H "X-App-Uid: UYYHD77887778888"
```

| Header | Required | Purpose |
|---|---|---|
| `X-App-Key` | always | Identifies the platform. |
| `X-App-Secret` | always | Authenticates the platform. |
| `X-App-Uid` | on subscriber-scoped routes | Selects the subscriber. |
| `X-App-User-Name` | optional | Display name used if this `APP_UID` is provisioned on this call. |
| `X-App-User-Email` | optional | Attached only if not already used by another account. |

Every subscriber-scoped route resolves `APP_UID` to an internal user before the
controller runs, so a partner only ever sees that subscriber's data. Cross-tenant
reads return `403`, and listings are naturally scoped.

### Two auth styles, one API

The same routes also accept `Authorization: Bearer <jwt>` from the first-party
dashboard. Requests carrying `X-App-Key` take the partner path; everything else
falls through to JWT. Partner traffic is recorded in `partner_api_logs`; dashboard
traffic is not.

## Subscriber provisioning

With `autoProvision` on (the default), an unrecognised `APP_UID` creates the
internal user, profile and subscription on first use, inside one transaction.
The subscriber starts with the app's `defaultTier` and `defaultCredits`.

To set a name, email or metadata up front, register explicitly:

```bash
curl -X POST https://api.example.com/api/v1/partner/subscribers \
  -H "X-App-Key: $APP_KEY" -H "X-App-Secret: $APP_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"appUid":"UYYHD77887778888","name":"Priya Retail","email":"priya@example.com"}'
```

Turn `autoProvision` off to require this step; unknown UIDs then return `404`.

## Partner-facing endpoints

Authenticated with `APP_KEY` + `APP_SECRET` only — no `APP_UID`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/partner/me` | Your application, limits and scopes. |
| `GET` | `/api/v1/partner/usage` | Request volume and success rate (`?days=7`). |
| `POST` | `/api/v1/partner/subscribers` | Register a subscriber. |
| `GET` | `/api/v1/partner/subscribers` | List your subscribers. |
| `GET` | `/api/v1/partner/subscribers/:appUid` | One subscriber, with credits. |
| `PATCH` | `/api/v1/partner/subscribers/:appUid/status` | Suspend / reactivate. |

## Admin endpoints (ADMIN role, JWT)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/admin/partner-apps` | Onboard a platform; returns the secret once. |
| `GET` | `/api/v1/admin/partner-apps` | List applications. |
| `PATCH` | `/api/v1/admin/partner-apps/:id` | Update scopes, limits, status. |
| `POST` | `/api/v1/admin/partner-apps/:id/rotate-secret` | Issue a new secret; old one dies immediately. |
| `POST` | `/api/v1/admin/partner-apps/:id/revoke` | Revoke permanently. |
| `GET` | `/api/v1/admin/partner-apps/:id/subscribers` | That app's subscribers. |
| `GET` | `/api/v1/admin/partner-apps/:id/usage` | That app's usage. |

### Creating the first application

The admin API needs an ADMIN token, which is a chicken-and-egg problem for the
first partner. Bootstrap out of band:

```bash
npm run partner:create -- --name "Acme Marketing Suite" --credits 500
```

## Controls

- **Scopes** — `["*"]` by default. Restrict with e.g. `["content:write","publish:write"]`;
  routes declaring `@RequireScopes(...)` then enforce them.
- **Rate limit** — per application, `rateLimitPerMin` (default 120), returns `429`.
- **IP allowlist** — empty means any; otherwise non-listed source IPs get `403`.
- **`maxSubscribers`** — caps provisioning.
- **Status** — `ACTIVE` / `SUSPENDED` / `REVOKED`.

## Error semantics

| Status | Meaning |
|---|---|
| `401` | Missing/invalid credentials, or missing `X-App-Uid` on a subscriber route. |
| `403` | App revoked or suspended, IP not allowed, scope missing, subscriber suspended, or cross-tenant access. |
| `404` | Unknown `APP_UID` when auto-provisioning is disabled. |
| `409` | `APP_UID` already registered. |
| `429` | Rate limit exceeded. |

Unknown `APP_KEY` and wrong `APP_SECRET` return an identical `401` message, so
the API cannot be used to enumerate valid keys.

## Security notes

- Secrets are stored as SHA-256 hashes and compared in constant time. A single
  hash pass is appropriate here because these are high-entropy machine
  credentials, not user-chosen passwords.
- The secret is returned only at creation and rotation. `appSecretPreview` shows
  the last 4 characters.
- Rotation takes effect immediately, so schedule it with the partner.
- Send these credentials only server-to-server. They are not safe in a browser
  or mobile client — anyone holding them can act for **every** subscriber.

## Connecting a subscriber's accounts

`GET /api/v1/platforms/oauth/meta` and `GET /api/v1/platforms/oauth/google-drive` return `{ url }` for the subscriber to open. Pass `?returnUrl=` to bring them back to your app with `?success=meta` or `?error=meta` appended; its origin must be listed in `OAUTH_RETURN_ORIGINS`, otherwise they land on the Jasper dashboard. The OAuth `state` is signed and expires after 15 minutes.

Google Drive uses the `drive.file` scope, so only files the subscriber picks are reachable: `GET /api/v1/platforms/:id/drive-token` returns a token for Google's Picker, and `POST /api/v1/platforms/:id/drive-import` with `{ fileId }` copies the file to public storage and returns its URL.

## Designed posts and flyers

`/api/v1/post-designs` builds a post or flyer from a versioned template. An
"Art Director" model chooses a layout and writes the copy; it never produces
markup, and it is structurally incapable of supplying a contact detail.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/post-designs/templates` | The catalogue, with every slot and whether a model may write it. |
| `POST` | `/api/v1/post-designs/plan` | A plan for a brief, without rendering it. 3 credits. |
| `POST` | `/api/v1/post-designs/render` | The full pipeline, returning a stored image. 5 credits, plus 3 if we planned it. |

### What the model may and may not write

Every slot declares a `source`. Only `campaign` slots are authored by the
model. Anything sourced from `profile` — practitioner name, qualifications,
registration number, specialty, practice name, phone, email, website, address,
booking URL — is **discarded from the model's output without being read** and
injected afterwards from the verified profile. The model may decide *whether* a
verified field appears, via `visibleSlots`; it may not decide what it says.

This is not a prompt instruction, it is a filter. A generated phone number that
merely looks plausible gets dialled by patients.

The `corrections[]` in every response lists what was stripped and why, so a
model repeatedly reaching for a protected field is visible to you rather than
silent.

### Supplying what we do not store

Jasper holds the practice name, phone, website and address. It does not hold
the practitioner's name, qualifications, registration number or specialty, so
send them in `profile` when your layout shows them. They are trusted because
*you* supplied them, not because a model produced them.

```http
POST /api/v1/post-designs/render
X-App-Key: ...
X-App-Secret: ...
X-App-Uid: 23455

{
  "campaignType": "awareness",
  "occasion": "World Oral Health Day",
  "language": "en",
  "profile": {
    "doctorName": "Dr. Kavita Rao",
    "qualifications": "BDS, MDS (Prosthodontics)"
  },
  "brandColor": "#0d9488"
}
```

Three layouts ship today: an A4 practice profile, a photo-led social post, and
an event notice for camps, awareness days and offers. `GET /templates` is the
authority; it also reports `requiresPhoto` per layout.

Add `photoUrl` for photo-led layouts. Without one they are not offered to the
director at all — they declare the photograph required, so proposing one would
guarantee a failed render. The URL must be a public host; it is copied into our
own storage and cropped to the slot before use.

### Reading the response

- `url` — the stored image. Pass it as `mediaUrls` when creating content.
- `snapshotId` / an immutable snapshot recorded against the design — the exact
  template version, profile version, resolved copy and asset ids. A design is
  reproducible only because this is kept; templates get edited and profiles get
  corrected.
- `fit` — per zone, whether the content fitted and at what scale. A zone at
  `scale: 0` fitted only because it ran out of room to shrink, which is worth
  looking at before publishing.
- `factIssues` — warnings such as copy longer than the slot declares.
- `renderer` — `placeholder` means no browser was available on the server and
  nothing publishable was produced. You are not charged for those.

### Iterating

Call `/plan`, show it to your user, then send the approved plan back as
`direction` on `/render`. You are not charged for the model a second time.

## Marketing assistant

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/agent/chat` | `{ message, conversationId?, mediaUrls? }`. Returns `{ conversationId, reply, drafts }`. One credit per message. |
| `GET` | `/api/v1/agent/conversations` | The subscriber's recent chats. |
| `GET` | `/api/v1/agent/conversations/:id` | One chat, as plain text turns. |

The assistant reads the subscriber's business profile (`PUT /api/v1/business/profile`), searches the web for local trends, and saves posts as drafts. **It cannot publish.** Publishing is a separate, deliberate call: `POST /api/v1/publishing/:contentId/publish` with `{ connectionId }`, or `POST /api/v1/content/:id/schedule`.

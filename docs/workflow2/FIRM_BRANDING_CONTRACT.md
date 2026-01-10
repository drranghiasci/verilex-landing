# Firm Branding Contract (Workflow 2)

Purpose
Define the safe, minimal contract for storing and exposing firm branding so myclient can edit later without changing intake behavior.

Schema (JSON shape)
```
{
  "logo_url": "https://example.com/logo.svg",
  "accent_color": "#RRGGBB"
}
```

Validation rules
- accent_color must match `^#[0-9A-Fa-f]{6}$` when present.
- logo_url is optional; HTTPS is strongly recommended.
- Only known keys are used. Unknown keys may be ignored by consumers.

Storage
- Table: `public.firms`
- Column: `branding` (jsonb, NOT NULL, default `{}`)

Public surface exposure
- Intake can only receive `logo_url` and `accent_color` from the `POST /api/intake/resolve-firm` endpoint.
- No other firm metadata should be exposed to intake.

Notes for myclient (future UI)
- Validate `accent_color` client-side before save.
- Treat `logo_url` as optional; show fallback when missing.
- Persist branding by updating `public.firms.branding`.

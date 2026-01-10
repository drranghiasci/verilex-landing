# Workflow 2 Error Policy

Purpose: keep intake errors client-safe while preserving traceability for support.

## Rules

- API responses never include stack traces or raw database errors.
- Do not return firm_id or intake_id in error payloads.
- Every error response includes a request ID for support reference.
- Server logs include request ID, HTTP status, and a short error message only.
- Client UI shows a safe, user-friendly error message.
- If a request ID is present, show it as a reference ID in the UI.

## Safe Client Messaging

- Prefer generic phrasing: “Unable to save intake. Please try again.”
- Avoid internal identifiers, raw SQL, or exception text.
- Allow users to retry the action without losing data.

## Scope

Applies to all `/api/intake/*` endpoints and intake UI error banners.

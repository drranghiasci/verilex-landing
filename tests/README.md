# Tests

## Intake smoke test (Playwright)

Purpose
- Covers the intake critical path: start, resume, fill required fields, submit, and confirm locked state.

Prerequisites
- Intake app running locally or in a test environment.
- A test firm exists with a stable slug and any optional branding.
- Supabase environment variables available to the intake app (service role key, URL, etc.).
- Playwright browsers installed.

Environment variables
- `INTAKE_BASE_URL` (default: `http://localhost:3000`)
- `TEST_FIRM_SLUG` (required; example: `dominic-sons-legal`)
- `INTAKE_WEB_SERVER_COMMAND` (optional; defaults to `npm run dev:intake`)
- `PORT` (optional; if set, must match `INTAKE_BASE_URL` port)

Install Playwright
```
npm install
npx playwright install
```

Run the intake smoke test
```
INTAKE_BASE_URL=http://localhost:3000 \
TEST_FIRM_SLUG=dominic-sons-legal \
npm run test:intake
```

Notes
- Playwright will start the intake dev server automatically (and reuse it if already running).
- If another app is already using port 3000, set `PORT` + `INTAKE_BASE_URL` to the same open port.
- The web server readiness check hits `/api/intake/counties` so the root `/` can be a 404 without failing.
- The smoke test will fail early if `TEST_FIRM_SLUG` does not exist in your database.

Notes
- The test reads the intake resume token from localStorage and then verifies the resume path.
- Document uploads are intentionally skipped in this smoke test.

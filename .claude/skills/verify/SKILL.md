---
name: verify
description: How to launch and drive this app to verify changes end-to-end.
---

# Verifying changes in progress_tracker

## Launch

- Backend: `bin/dev` from repo root → Rails on http://localhost:3001 (needs local Postgres; `bin/rails db:migrate` first if schema changed). Health check: `curl localhost:3001/up`.
- Frontend: `cd frontend && npm run dev` → Next.js on http://localhost:3000.
- Both are fast to boot (~5–15s). Run them in background and poll the two URLs.

## Drive

- Use Chrome DevTools MCP against http://localhost:3000.
- **Guest mode** needs no login: all data lives in localStorage key `progress_tracker_guest_store_v1` — inspect/assert state with `evaluate_script` reading that key. Restore it afterwards if the browser profile is shared.
- **Signed-in mode**: register via /login?mode=signup (any email + 6-char password) or reuse `pomo-test@example.com` / `password123` (dev DB). Assert server state with `bin/rails runner '...'` one-liners.
- The app uses `window.confirm` for destructive/skip actions — expect dialogs; use `handle_dialog`.
- Pomodoro timer state persists in localStorage keys `progress_tracker_pomodoro_timer_v1` and `progress_tracker_pomodoro_settings_v1` (device-scoped, shared across accounts).

## Gotchas

- `npm run build` and `npm run lint` are broken pre-existing — use `npx tsc --noEmit` in frontend/ instead.
- Progress-page day circles aren't labeled in the a11y tree; click them via `evaluate_script` (row → `td[dayNumber]` → first div).

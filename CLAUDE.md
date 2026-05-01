# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a **Rails API + Next.js** application for personal habit and goal tracking.

- **Backend:** Ruby on Rails 8.0.2 (API mode) on port 3001, PostgreSQL database
- **Frontend:** Next.js 16 (App Router) with TypeScript + Tailwind CSS on port 3000
- **Auth:** Devise with cookie-based sessions; guest users can track locally via `localStorage`
- **Deployment:** Kamal (Docker-based)

In development, the frontend calls the Rails backend directly (`localhost:3001`). In production, Next.js proxies requests through its `/api/proxy` route.

## Development Commands

### Backend (Rails)
```bash
bin/setup              # First-time setup: bundle, db:prepare, clear logs
bin/dev                # Start Rails dev server on port 3001
bin/rails db:prepare   # Create and migrate the database
bin/rails test         # Run the test suite
bin/rails test test/models/goal_test.rb  # Run a single test file
bin/rubocop            # Lint Ruby code
bin/brakeman           # Security scan
```

### Frontend (Next.js)
```bash
cd frontend
npm run dev            # Dev server on port 3000 (Turbopack)
npm run build          # Production build
npm run lint           # ESLint
```

### Docker
```bash
docker-compose up      # Starts Rails + PostgreSQL (useful if not running Postgres locally)
```

## Key Data Model

| Model | Notes |
|---|---|
| `User` | Devise-managed; has many goals and journal entries |
| `Goal` | Belongs to user; has a `position` column for drag-and-drop ordering |
| `DailyProgress` | Joins goal + date; integer `status` — `0` (empty), `1` (half), `2` (filled) |
| `JournalEntry` | Belongs to user; keyed on `entry_date` (one per day) |

## Routing

Rails routes are all namespaced under `/api`. The frontend's `next.config.ts` rewrites `/api/*` to the Rails backend in production.

Key route groups:
- `devise/sessions` and `devise/registrations` → auth endpoints
- `api/progress` → monthly progress view
- `api/goals` → CRUD + reorder
- `api/journal_entries` → CRUD

## Frontend Structure

- `src/app/` — Next.js App Router pages (`progress/[year]/[month]`, `goals/`, `journal-entries/`)
- `src/contexts/AuthContext.tsx` — wraps the app; provides `currentUser` and auth actions
- `src/lib/guestStorage.ts` — localStorage adapter used when no user is signed in
- `src/components/` — shared UI components

## Testing

- Rails tests live in `test/` using Rails' default Minitest setup.
- Run `bin/rails db:test:prepare` if the test DB is out of sync.
- No frontend test suite is configured yet.

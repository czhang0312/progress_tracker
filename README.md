# Progress Tracker

A personal habit and goal tracking app. Track daily progress on goals, write journal entries, and visualize consistency over time.

Inspired by: https://www.youtube.com/watch?v=qaozjfqXbfI&t=289s

## Stack

- **Backend:** Ruby on Rails 8 (API mode), PostgreSQL — runs on port 3001
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS — runs on port 3000
- **Auth:** Devise with cookie-based sessions; guest users can explore without an account

## Features

- Monthly progress grid — mark goals as empty, half, or filled for each day
- Drag-and-drop goal reordering
- Daily journal entries
- Guest mode — use the app locally without signing in (data stored in `localStorage`)
- Password reset via email

## Getting Started

### Prerequisites

- Ruby (see `.ruby-version`)
- Node.js 18+
- PostgreSQL

### Backend

```bash
bin/setup          # Install gems, create and migrate the database
bin/dev            # Start Rails on port 3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # Start Next.js on port 3000
```

### Docker (PostgreSQL only)

If you don't have Postgres running locally:

```bash
docker-compose up
```

Then run `bin/dev` for Rails and `npm run dev` for the frontend separately.

## Running Tests

```bash
bin/rails test                              # Full test suite
bin/rails test test/models/goal_test.rb    # Single file
bin/rails db:test:prepare                  # Resync test DB if out of date
```

## Linting & Security

```bash
bin/rubocop     # Ruby linter
bin/brakeman    # Security scan
cd frontend && npm run lint
```

## Deployment

Deployed via [Kamal](https://kamal-deploy.org/) (Docker-based). See `config/deploy.yml` for configuration.

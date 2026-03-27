# Guest Mode Phase 1 Implementation Spec

Date: 2026-03-26
Status: Draft for implementation
Owner: Product + Engineering

## 1) Goal

Allow users to use the app immediately without login, while keeping persistence and account data access behind authentication.

Phase 1 objective:
- Unauthenticated users can access dashboard, goals, and journal UI in guest mode.
- Guest interactions are allowed in the UI, but are not persisted to server-side user data.
- Authenticated users keep existing behavior with persisted data.

## 2) Scope

In scope (Phase 1):
- Default app entry goes to dashboard regardless of auth state.
- Guest read access to app pages and read endpoints.
- Guest write attempts to Rails resources return 401 with a consistent JSON error contract.
- Frontend supports a third auth state: authenticated, guest, unknown/loading.
- Visible guest banner and sign-in call-to-action.

Out of scope (Phase 1):
- Migrating guest-created local data into a new account.
- Backend persistence for guest users.
- Multi-device guest sync.

## 3) Current Baseline (as of 2026-03-26)

Backend:
- Global auth required through before_action :authenticate_user! in ApplicationController.
- Root route sends unauthenticated users to Devise login.
- Goal, progress, and journal controllers scope via current_user associations.
- API auth current_user endpoint returns 401 when not signed in.

Frontend:
- AuthContext treats unauthenticated as null user and redirects to /login.
- Root page redirects authenticated to /progress/:year/:month, otherwise /login.
- Progress and goals pages guard on user and redirect to /login when user is null.

## 4) Target Product Behavior

### 4.1 Entry and Navigation
- Visiting / in Next app routes to current month dashboard for both guest and authenticated users.
- Guest users can navigate to:
  - /progress/:year/:month
  - /goals
  - /journal-entries

### 4.2 Guest UX
- Header shows Guest mode label.
- Clear message: data is temporary and not saved to account.
- Save-related actions show sign-in intent when blocked by server response.

### 4.3 Persistence Rules
- Authenticated users: existing CRUD behavior unchanged.
- Guests:
  - GET requests for progress/goals/journal return non-sensitive safe payloads.
  - POST/PATCH/PUT/DELETE on account resources return 401 with auth-required error body.

## 5) API Contract Changes

## 5.1 Auth Endpoint
Endpoint: GET /api/auth/current_user

Authenticated response (unchanged shape + optional flag):
- 200
- { success: true, user: { id: number, email: string, is_guest: false } }

Guest response (new):
- 200
- { success: true, user: { id: null, email: "guest", is_guest: true } }

Notes:
- This endpoint becomes the source of truth for frontend auth mode.
- Avoid returning 401 here in guest mode-enabled environment.

## 5.2 Write Guard Contract
For all guest write attempts on goals/progress/journal endpoints:
- Status: 401
- JSON:
  - { success: false, code: "AUTH_REQUIRED", message: "Sign in to save your data." }

For HTML requests:
- Redirect to login or render an auth-required page with clear message.
- JSON contract is the canonical behavior for Next frontend calls.

## 5.3 Guest Read Contract
For guest GET access:
- Return 200 with safe payload.
- Phase 1 recommendation: return empty arrays/objects from backend where no user data exists.
- Frontend can optionally merge local demo/ephemeral data on top.

## 6) Backend Implementation Plan

### 6.1 ApplicationController Rules
File: app/controllers/application_controller.rb

Changes:
- Replace unconditional before_action :authenticate_user! with action-aware auth strategy.
- Allow unauthenticated access for read-only actions used by guest mode.
- Introduce helper for mode checks:
  - authenticated_request?
  - guest_request?
  - require_auth_for_write!

Acceptance rule:
- Guest can reach index/show pages for progress/goals/journal.
- Guest cannot execute mutating actions.

### 6.2 Auth Controller
File: app/controllers/api/auth_controller.rb

Changes:
- current_user_info returns guest user payload when session is absent.
- Add is_guest boolean in user payload consistently for login/register/current_user.

Acceptance rule:
- Frontend sees deterministic user object in both guest and authenticated cases.

### 6.3 Goals Controller
File: app/controllers/goals_controller.rb

Changes:
- index/show allowed for guest mode.
- create/update/destroy/move_up/move_down/reorder guarded with require_auth_for_write!.
- Replace direct current_user assumptions in index with a safe query path:
  - authenticated: current_user.goals.order(:position)
  - guest: []

Acceptance rule:
- GET /goals.json works as guest.
- Any mutating endpoint returns AUTH_REQUIRED contract as guest.

### 6.4 Journal Entries Controller
File: app/controllers/journal_entries_controller.rb

Changes:
- index/show allowed for guest mode.
- new/edit/create/update/destroy guarded for authenticated users only.
- index query path:
  - authenticated: current_user.journal_entries.order(:date)
  - guest: []

Acceptance rule:
- GET /journal_entries.json works as guest.
- POST/PATCH/DELETE return AUTH_REQUIRED as guest.

### 6.5 Progress Controller
File: app/controllers/progress_controller.rb

Changes:
- index/show allowed for guest mode.
- update guarded with require_auth_for_write!.
- show query path:
  - authenticated: existing current_user data logic.
  - guest: empty goals, empty daily_progresses, empty journal_entries, valid date metadata.

Acceptance rule:
- GET /progress/:year/:month.json returns 200 in guest mode.
- PATCH /progress/... returns AUTH_REQUIRED in guest mode.

### 6.6 Routes
File: config/routes.rb

Changes:
- Keep Devise routes for auth flow.
- Replace unauthenticated root redirect-to-login behavior with dashboard-first entry behavior.
- Ensure root always lands on progress index (or Next frontend route strategy, depending on deployment path).

Acceptance rule:
- First app load does not force login.

## 7) Frontend Implementation Plan

### 7.1 Auth State Model
File: frontend/src/contexts/AuthContext.tsx

Changes:
- Extend User type:
  - id: number | null
  - email: string
  - is_guest: boolean
- checkAuth behavior:
  - If API returns success true with user.is_guest true: set guest user state.
  - No automatic redirect to login on guest state.

Acceptance rule:
- App has stable states: loading, guest, authenticated.

### 7.2 Home Routing
File: frontend/src/app/page.tsx

Changes:
- Keep redirect to current month dashboard for both guest and authenticated users.
- Remove forced redirect to /login when user is guest.

Acceptance rule:
- Unauthenticated first-time visitor lands on /progress/:year/:month.

### 7.3 Progress Page
File: frontend/src/app/progress/[year]/[month]/page.tsx

Changes:
- Remove login redirect when user is guest.
- Display guest indicator and sign-in CTA.
- On PATCH auth-required response, show modal/toast: Sign in to save your progress.

Acceptance rule:
- Guest can view month and click around without app-breaking errors.

### 7.4 Goals Page
File: frontend/src/app/goals/page.tsx

Changes:
- Remove login redirect for guest.
- Keep list rendering for empty backend data.
- On create/delete/reorder responses with AUTH_REQUIRED, show sign-in prompt.

Acceptance rule:
- Guest can view page; write actions produce clear auth prompt.

### 7.5 Journal Entries Page
File: frontend/src/app/journal-entries/page.tsx

Changes:
- Keep list rendering for guest empty data.
- On delete/create/edit submit auth-required response, show sign-in prompt.

Acceptance rule:
- Guest can browse list UI; writes are blocked with clear guidance.

### 7.6 Shared UX Element
Recommended new component:
- frontend/src/components/GuestBanner.tsx

Behavior:
- Visible when user.is_guest is true.
- Message: You are in Guest mode. Sign in to save and sync your data.
- Includes actions: Sign in, Create account.

## 8) Frontend State Transitions

State machine (Phase 1):
- Initial -> LoadingAuth
- LoadingAuth -> Authenticated when current_user returns is_guest false
- LoadingAuth -> Guest when current_user returns is_guest true
- Guest -> Authenticated after successful login/register
- Authenticated -> Guest after logout

Write-attempt transition:
- Guest + write attempt -> receive AUTH_REQUIRED -> show prompt -> optional route to /login

## 9) Error Handling Rules

Backend:
- Use one standardized auth-required payload for guest write blocks.

Frontend:
- Detect response status 401 and/or code AUTH_REQUIRED.
- Do not treat as generic fatal error page.
- Show contextual prompt and keep current page state intact.

## 10) Testing Plan

## 10.1 Backend request specs
- GET /api/auth/current_user returns guest payload when no session.
- Guest GET /goals.json returns 200 and [] payload.
- Guest GET /journal_entries.json returns 200 and [] payload.
- Guest GET /progress/:year/:month.json returns 200 with valid metadata and empty collections.
- Guest POST/PATCH/DELETE on goals/journal/progress update returns 401 AUTH_REQUIRED.
- Authenticated CRUD flow remains unchanged.

## 10.2 Frontend behavior checks
- Visiting / while logged out routes to progress month page, not login.
- Guest banner appears on progress/goals/journal pages.
- Guest write action shows sign-in prompt and no crash.
- After login from guest mode, user sees persisted account data.

## 11) Acceptance Criteria

Phase 1 is complete when all are true:
1. Logged-out user can open app and browse dashboard/goals/journal without redirect to login.
2. Logged-out user cannot persist any data to backend resources.
3. Mutating guest requests always return consistent AUTH_REQUIRED contract.
4. Frontend surfaces clear sign-in prompt on blocked save attempts.
5. Existing authenticated behavior remains functionally unchanged.
6. No user data leakage between accounts or to guests.

## 12) Rollout Plan

Step 1:
- Implement backend guest-safe read and write guards.
- Validate contracts via request specs.

Step 2:
- Update frontend auth model and root routing.
- Add guest banner and write-block UX.

Step 3:
- Manual regression pass:
  - authenticated CRUD
  - guest browse
  - guest blocked writes

Step 4:
- Deploy behind optional feature flag (recommended): GUEST_MODE_ENABLED.

## 13) Phase 2 (later)

Optional enhancements after Phase 1 stabilizes:
- Local guest draft storage (sessionStorage/localStorage).
- One-time import of guest drafts on signup.
- Conversion analytics: guest sessions, write-block prompts, auth conversion rate.

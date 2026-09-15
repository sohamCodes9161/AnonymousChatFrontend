# Frontend — Infrastructure + Auth

Foundation layer: theme system (light/dark/system, no flash-of-wrong-theme),
API client with silent-refresh handling, socket client, and a working
Auth flow (register/login/logout) as the first vertical slice — same
pattern as the backend's infra-then-Auth-module approach.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Requires the backend running on port 3000 (per .env.example's defaults).

## Verify the green flag

1. Open http://localhost:5173 — should redirect to /login.
2. Register a new account — should land on /chats showing your display name.
3. Toggle light/dark/system — should switch instantly, no flash on reload.
4. Hard refresh the page while logged in — should silently re-authenticate
   (briefly shows "Loading…") rather than bouncing to /login. This is the
   silent-refresh flow working: the in-memory access token is gone after
   a refresh by design, but the httpOnly cookie redeems a new one.
5. Log out — should return to /login, and a hard refresh afterward should
   stay on /login (no session to silently restore).

## What's intentionally not here yet

No real chat UI — chat list, conversation view, friends panel, and
notifications are the next pass, built against this now-working
foundation.

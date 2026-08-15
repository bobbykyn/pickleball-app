# Roadmap

## Invite-only access (required before the custom domain goes public)

**What:** Signing up must require an invite code. A first-time user enters a code, and from then on their email is recognised so they just log in normally. Random people who find the URL must not be able to create an account.

**Why:** The app is for one private group of friends. Today anyone who reaches the URL can sign up with email/password or Google — the obscure `vercel.app` address is the only thing keeping strangers out, and that stops being true once it lives on `app.pickle-kitchen.com`, which is linked from a public store.

**Implementation sketch:**
- New Supabase table `invite_codes`: `code` (PK), `label`, `max_uses`, `uses`, `expires_at`, `created_at`. A single shared group code is probably enough to start; per-person codes if it ever needs revoking individually.
- New table `allowed_emails`: `email` (PK), `invited_via_code`, `first_seen_at`. This is the "recognises them next time" list — once an email is in here, login proceeds with no code.
- Gate at signup, not at login, in `AuthModal.tsx`. Both paths need covering: `signInWithPassword` signup **and** `signInWithOAuth` (Google), since Google sign-in creates an account silently on first use.
- Google is the harder half — the account exists by the time control returns to the app. Options: check `allowed_emails` immediately after the OAuth callback and sign out + delete if absent, or require the code *before* showing the Google button and hold it in session storage across the redirect. The second is cleaner.
- Enforce server-side with a Supabase RLS policy or a database trigger on `auth.users`, not only in the UI — a client-side-only check is bypassable by anyone who opens devtools.
- Existing users must be back-filled into `allowed_emails` before this ships, or everyone gets locked out.

## Level-up celebration screen

**What:** When a player levels up, show a one-time full-screen celebration (big "Congratulations", fireworks + confetti animation) to every user. Each user sees it exactly once, even if they don't open the app until weeks later — it's not tied to being online at the moment the level-up happens.

**Why:** Makes progression feel like a shared community event instead of a private stat change.

**Open question — level system doesn't exist yet:** `src/lib/stats.ts` currently only computes a leaderboard (hours/games, no tiers). Need to define what "leveling up" means before this can be built — e.g. tiers by total hours or games played (Rookie → Intermediate → Advanced → Pro), with thresholds TBD.

**Implementation sketch:**
- New Supabase table `level_up_events`: `id`, `user_id`, `new_level`, `created_at`.
- New table `level_up_seen`: `event_id`, `viewer_user_id`, `seen_at` (composite PK) — tracks which users have already been shown which event.
- On app load (in `page.tsx`, after auth resolves), query for `level_up_events` not yet in `level_up_seen` for the current user, oldest-first. If any exist, show the celebration overlay for the first unseen one, then insert a `level_up_seen` row and re-check for the next.
- Celebration component: full-screen overlay, confetti/fireworks via a lightweight canvas library (e.g. `canvas-confetti`) or CSS/SVG particle animation — no heavy game-engine dependency needed.
- Detecting the level-up itself: either a Supabase trigger/function that inserts into `level_up_events` when a player's computed level crosses a threshold, or computed client/server-side after each session's RSVPs finalize.
- Must be resilient to multiple tabs/devices and to a user never coming back — the "unseen backlog" approach above handles both.

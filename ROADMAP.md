# Roadmap

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

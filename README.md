# Startup Simulation (Option A)

This project implements **Option A** from the assignment PDF:
- Next.js frontend
- Supabase auth + database backend
- Turn-based startup simulation with server-authoritative game logic

Live URL: https://mitcleanstartgame.vercel.app/

## What was built
- Email/password auth with session persistence across reload
- Quarterly decision panel: `price`, `new engineers`, `new sales staff`, `salary %`
- `POST /api/advance` to run model server-side and persist state
- Dashboard with cash, revenue, net income, headcount, quarter
- Last 4 quarters history panel
- Office visualization with filled/empty desks per role
- Win/Lose states

## Data model
- `game_states` table stores current snapshot per user
- `quarter_history` table stores timeline events per user
- SQL is in `supabase/schema.sql`

## Setup (5 commands)
1. `cp .env.example .env.local`
2. Fill `.env.local` with Supabase values.
3. Run `supabase/schema.sql` in your Supabase SQL editor.
4. `npm install`
5. `npm run dev`

## API surface
- `GET /api/game-state` -> returns current game state and last 4 quarters
- `POST /api/advance` -> advances one quarter using submitted decisions

## Tradeoffs / descoping
- No multiplayer; single-player only (per assignment)
- Minimal charting (CSS bars instead of chart library)
- No automated tests were added due time focus on complete feature flow
- Service-role key is used in API routes to keep simulation server-authoritative; RLS policies are still defined for direct table access hygiene

## Known issues
- If Supabase email confirmation is enabled, users must confirm before login.
- The simulation balance constants are intentionally simple and may need tuning.

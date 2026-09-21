# Scenewise Backend

A review/like/shelf backend for the Scenewise movie app, built the same way as
the book-app reference you shared — Express + TypeScript + Mongoose — but with
**no login system**, movies from **TMDB** instead of a book API, and people
identified by an anonymous per-device ID instead of an account.

## Why no login

You asked for likes/reviews/"add to profile" without an account system. The
way that works here: the app generates one random ID the first time it opens
on a phone, stores it locally, and sends it as an `x-device-id` header on
every request. There's no password, no email, nothing to sign in with — but
also no real security. Anyone who copies that ID could act as that "device".
Fine for an anonymous review app; would NOT be fine if this app ever needs to
protect something sensitive (payments, private data). If you ever want real
accounts later, the book-app's `authRoutes.ts` + JWT middleware is a solid
pattern to drop in — it wasn't reused here only because you asked to skip it.

## Movie data: TMDB

`src/lib/tmdb.ts` is the only file that talks to the outside world. Your
access token goes in `.env` as `TMDB_ACCESS_TOKEN` (already filled in from
what you sent me). TMDB gives:

- Search, trending, and popular movie lists
- Full detail (overview, runtime, genres, poster/backdrop images)
- **Watch providers** — where a movie is available to stream/rent/buy
  (from JustWatch data). This is NOT playback — no free API provides actual
  video streaming, that requires studio licensing deals. This just tells you
  *where* to go watch it.

Same as the book app: **ratings are yours, not TMDB's.** `Movie.avgRating` is
recalculated from your own `Review` documents every time one is added,
edited, or deleted (`src/lib/movieStats.ts`). TMDB's own rating is kept
separately as `tmdbVoteAverage`, shown for reference only.

## Database

Reuses your existing MongoDB Atlas cluster (same `MONGO_URI` from your book
app's `.env`) but connects to its own database, named `scenewise` — so this
app's collections never mix with the book app's.

## Keeping the free tier awake (cron)

Render's free instances sleep after ~15 minutes without traffic and then take
30-50s to boot on the next request. MongoDB Atlas also pauses free clusters
that sit idle. `/api/cron/keep-alive` solves both at once — call it from an
external scheduler every ~10 minutes.

It isn't just a ping. Each run does genuine database work, so Atlas sees real
read *and* write activity:

1. Updates a single `heartbeat` document (last run, total runs, caller).
2. Reads a count from the `movies` collection.
3. Inserts one `cronrun` log document.
4. Deletes `cronrun` documents older than 7 days.

Nothing user-facing is touched — movies, reviews, likes and shelves are never
written by this route.

**Auth.** Set `CRON_SECRET` in `.env` and in Render's environment variables,
then send it as an `x-cron-secret` header (an `Authorization: Bearer <secret>`
header works too). Without the header the route returns 401; if `CRON_SECRET`
isn't set at all, the route is disabled (503) rather than left open. The
comparison is timing-safe.

```bash
curl -H "x-cron-secret: $CRON_SECRET" \
  "https://scenewise.onrender.com/api/cron/keep-alive?source=manual"
```

**The schedule is built in.** Unlike Vercel, Render doesn't run your cron for
you — its Cron Jobs are a separate paid service, and a plain deploy only
restarts the server. So the timer lives in the app itself
(`lib/keepAlive.ts`): it starts with the server, does the database work every
10 minutes, and then makes an HTTP request to the service's own public URL.

That self-request matters. Render decides whether to sleep based on *inbound*
traffic, and a call to the public URL arrives through Render's load balancer,
so it counts — an internal timer alone would keep the database warm but not
the instance. Render provides `RENDER_EXTERNAL_URL` automatically; locally
there's no public URL, so only the database half runs.

Nothing to set up: deploy with `CRON_SECRET` set and it runs.

| Variable | Default | What it does |
|---|---|---|
| `CRON_SECRET` | — | Required. Protects the routes and signs the self-ping. |
| `KEEP_ALIVE_DISABLED` | `false` | `true` turns the built-in scheduler off. |
| `KEEP_ALIVE_INTERVAL_MS` | `600000` | How often it runs (10 minutes). |
| `KEEP_ALIVE_FIRST_DELAY_MS` | `30000` | Wait before the first run after boot. |

**The honest limit.** A timer inside the process can't run while the process is
asleep. If the instance does sleep — a deploy, a crash, a missed tick — the
next real visitor wakes it and the schedule resumes. For a portfolio app
that's a fine trade. If you ever want a guarantee, point a free external
scheduler ([cron-job.org](https://cron-job.org), or GitHub Actions on a
`schedule:` trigger) at `/api/cron/keep-alive` with the `x-cron-secret`
header; the endpoint is there for exactly that, and both can run together.

**On free-tier hours.** Render's free plan includes 750 instance-hours a
month, and a month is ~730 hours. Keeping one service awake around the clock
uses most of that allowance, which is fine for a single service but worth
knowing if you host several.

`GET /api/cron/status` (same secret) reports the last run without writing
anything — handy for checking the scheduler is actually firing.

## API surface

All routes require an `x-device-id` header (any string ≥ 8 characters —
the frontend generates a UUID automatically, see its `lib/deviceId.ts`), apart
from `/api/health` and `/api/cron/*`.

| Method | Route | What it does |
|---|---|---|
| GET | `/api/health` | Public. Server status + how much OMDb budget is left. |
| GET/POST | `/api/cron/keep-alive` | Keep-alive for Render + Atlas. Needs `x-cron-secret`. |
| GET | `/api/cron/status` | Last keep-alive run. Needs `x-cron-secret`. |
| GET | `/api/movie/search?q=dune` | Live TMDB search. Doesn't touch the DB. |
| GET | `/api/movie/trending` | This week's trending movies from TMDB. |
| GET | `/api/movie/popular?page=1` | TMDB's popular list. |
| POST | `/api/movie` | Registers a movie into the catalog (idempotent) — `{ tmdbId }`. Returns the internal `Movie._id` everything else uses. |
| GET | `/api/movie/:id` | Full detail for one cached movie, plus whether this device liked it. |
| GET | `/api/movie/:id/watch-providers` | Where it's available to stream/rent/buy. |
| POST | `/api/movie/:id/like` | Toggles this device's like. |
| POST | `/api/review/:movieId` | Create/update this device's review — `{ rating, text, displayName? }`. |
| GET | `/api/review/movie/:movieId?page=1` | Paginated reviews for a movie. |
| DELETE | `/api/review/:reviewId` | Delete your own review. |
| POST | `/api/shelf/:movieId` | Add/move a movie on this device's shelf — `{ status: "want_to_watch" \| "watching" \| "watched" }`. |
| DELETE | `/api/shelf/:movieId` | Remove from shelf. |
| GET | `/api/profile/shelf?status=watching` | This device's shelf (status filter optional). |
| GET | `/api/profile/reviews` | Every review this device has written. |
| GET | `/api/profile/likes` | Every movie this device has liked. |

### Typical flow for a movie the app hasn't cached yet

1. `GET /api/movie/search?q=dune` → pick a result (has `tmdbId`)
2. `POST /api/movie` with `{ tmdbId }` → get back `movie._id`
3. `POST /api/movie/:id/like`, `POST /api/review/:id`, or `POST /api/shelf/:id`
   using that `_id` from here on

## Setup

```bash
cd scenewise-backend
pnpm install
pnpm dev
```

Runs on port **3001** by default (set in `.env`) so it can run alongside your
book-app backend (port 3000) at the same time without a conflict.

## Verified, not run end-to-end

Same caveat as the book backend: I type-checked this (`tsc --noEmit` passes
clean against your `tsconfig.json`) and reasoned through the TMDB
integration carefully, but couldn't boot the server or hit TMDB/MongoDB Atlas
live — my sandbox can't reach either. Run `pnpm dev` and try
`GET /api/movie/search?q=inception` first — that's the piece talking to
TMDB — and tell me what comes back.

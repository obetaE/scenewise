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

## API surface

All routes require an `x-device-id` header (any string ≥ 8 characters —
the frontend generates a UUID automatically, see its `lib/deviceId.ts`).

| Method | Route | What it does |
|---|---|---|
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

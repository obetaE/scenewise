# Scenewise (Expo)

A movie discovery + review app — Expo Router frontend, backed by
`scenewise-backend` (TMDB catalog, likes, reviews, shelves, no login).

## Stack

- Expo SDK 54 (React Native 0.81.5, React 19.1) — matches your confirmed
  working setup, versions pulled from your real project, not guessed
- Expo Router (file-based navigation, tabs)
- NativeWind v4 + Tailwind CSS v3
- `react-native-svg` for the match-score ring, `lucide-react-native` for icons
- `@expo-google-fonts/fraunces` + `@expo-google-fonts/plus-jakarta-sans`
- `@react-native-async-storage/async-storage` + `expo-crypto` — for the
  anonymous per-device ID that replaces login

## No login — how "your profile" works instead

There's no signup/signin screen. The first time the app opens, it generates
one random ID (`lib/deviceId.ts`) and stores it on the phone. Every request
to the backend sends that ID in an `x-device-id` header. Likes, reviews, and
shelf entries are all tied to that ID — no account needed. See the backend's
README for the tradeoffs that come with this (no real security, fine for an
anonymous review app).

## Setup

```bash
pnpm install
```

Then edit `.env` — set `EXPO_PUBLIC_API_BASE_URL` to your computer's LAN IP
(not `localhost`) plus the backend's port:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:3001/api
```

Find your IP with `ipconfig` (Windows) or `ifconfig | grep inet` (Mac/Linux).
`scenewise-backend` needs to already be running (`pnpm dev` in that folder)
on the same network for Browse/Profile/movie detail to work — Discover
(the original mock quiz) works with no backend at all.

Then:

```bash
npx expo start -c
```

Scan the QR code with **Expo Go**.

## Structure

```
app/
  _layout.tsx           # root stack — wraps the tabs + two detail screens
  (tabs)/
    _layout.tsx          # bottom tab bar: Discover / Browse / Profile
    index.tsx            # Discover — the original mock quiz/trending (untouched)
    browse.tsx           # Browse — live TMDB search + trending
    profile.tsx           # Profile — your shelf, reviews, and likes
  title/[id].tsx          # mock movie detail (Discover tab only, unchanged)
  movie/[id].tsx           # REAL movie detail — like, shelf, rate, review, watch providers
components/
  MatchRing.tsx           # (Discover) circular "will I like this" score ring
  Tag.tsx                 # (Discover) pill badges
  WatchDecisionQuiz.tsx    # (Discover) bottom-sheet quiz modal
  RatingStars.tsx          # 1–5 star picker/display, used on real movie detail + profile
  ReviewCard.tsx           # a single review in a list
lib/
  movies.ts               # (Discover) mock movie data, unchanged
  deviceId.ts              # generates/persists the anonymous device ID
  api.ts                   # typed client for every scenewise-backend endpoint
assets/posters/            # (Discover) the 5 mock poster images, unchanged
```

## Discover vs. Browse — why both exist

**Discover** (the original tab) is the mood-based quiz with pacing/content-
warning data — that's hand-curated info TMDB doesn't provide, so it still
runs on the 5 mock movies from the very first version of this app.

**Browse** is the real thing — live TMDB search and trending, backed by your
own database of likes/reviews/shelves. They're separate on purpose: merging
them would mean either faking pacing/content-warning data for every TMDB
movie, or dropping that feature entirely. Say the word if you'd rather
collapse them into one.

## Verified, not run end-to-end

Whole-project `tsc --noEmit` passes clean. I could not actually boot Expo
and tap through the screens here — no simulator/device in my sandbox, and no
network path to your backend or TMDB. Once both are running, start with the
Browse tab (search for something) since that's the first real network round
trip through your new backend — tell me what you see.

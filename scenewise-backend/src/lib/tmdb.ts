// Thin wrapper around The Movie Database (TMDB) API.
// https://developer.themoviedb.org/docs — free tier, the access token you
// already have covers this comfortably.

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

const ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;

async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`TMDB request failed (${response.status}): ${body}`);
  }

  return response.json();
}

function posterUrl(path: string | null, size: "w342" | "w500" = "w500") {
  return path ? `${IMAGE_BASE}/${size}${path}` : "";
}

function backdropUrl(path: string | null, size: "w780" | "w1280" = "w1280") {
  return path ? `${IMAGE_BASE}/${size}${path}` : "";
}

// Genre ID → name map. TMDB search/list endpoints only return genre_ids;
// this list is fetched once and reused (genres change rarely, if ever).
let genreCache: Record<number, string> | null = null;

async function getGenreMap(): Promise<Record<number, string>> {
  if (genreCache) return genreCache;
  const data = await tmdbFetch("/genre/movie/list");
  genreCache = Object.fromEntries(
    data.genres.map((g: { id: number; name: string }) => [g.id, g.name]),
  );
  return genreCache!;
}

export interface TmdbMovieSummary {
  tmdbId: number;
  title: string;
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  releaseDate: string;
  genres: string[];
  tmdbVoteAverage: number;
}

async function toSummary(raw: any, genreMap: Record<number, string>): Promise<TmdbMovieSummary> {
  return {
    tmdbId: raw.id,
    title: raw.title,
    overview: raw.overview,
    posterUrl: posterUrl(raw.poster_path),
    backdropUrl: backdropUrl(raw.backdrop_path),
    releaseDate: raw.release_date || "",
    genres: (raw.genre_ids || []).map((id: number) => genreMap[id]).filter(Boolean),
    tmdbVoteAverage: raw.vote_average || 0,
  };
}

export async function searchMovies(query: string, page = 1): Promise<TmdbMovieSummary[]> {
  const [data, genreMap] = await Promise.all([
    tmdbFetch("/search/movie", { query, page: String(page) }),
    getGenreMap(),
  ]);
  return Promise.all((data.results || []).map((r: any) => toSummary(r, genreMap)));
}

export async function getTrendingMovies(window: "day" | "week" = "week"): Promise<TmdbMovieSummary[]> {
  const [data, genreMap] = await Promise.all([
    tmdbFetch(`/trending/movie/${window}`),
    getGenreMap(),
  ]);
  return Promise.all((data.results || []).map((r: any) => toSummary(r, genreMap)));
}

export async function getPopularMovies(page = 1): Promise<TmdbMovieSummary[]> {
  const [data, genreMap] = await Promise.all([
    tmdbFetch("/movie/popular", { page: String(page) }),
    getGenreMap(),
  ]);
  return Promise.all((data.results || []).map((r: any) => toSummary(r, genreMap)));
}

export interface TmdbMovieDetail extends TmdbMovieSummary {
  runtime: number | null;
}

export async function getMovieDetail(tmdbId: number): Promise<TmdbMovieDetail> {
  const raw = await tmdbFetch(`/movie/${tmdbId}`);
  return {
    tmdbId: raw.id,
    title: raw.title,
    overview: raw.overview,
    posterUrl: posterUrl(raw.poster_path),
    backdropUrl: backdropUrl(raw.backdrop_path),
    releaseDate: raw.release_date || "",
    genres: (raw.genres || []).map((g: { name: string }) => g.name),
    tmdbVoteAverage: raw.vote_average || 0,
    runtime: raw.runtime ?? null,
  };
}

// ---- Reviews ----
// TMDB carries long-form reviews for most well-known titles. We blend these
// into the app's own reviews so a movie nobody here has reviewed yet still
// has something to read — each one tagged with its source so it's never
// mistaken for a Scenewise review.

export interface NormalizedReview {
  _id: string;
  movie: string;
  source: "scenewise" | "tmdb";
  displayName: string;
  avatarUrl: string | null;
  rating: number | null; // 1-5, or null when the author gave none
  text: string;
  createdAt: string;
  url?: string;
  isMine: boolean;
}

// TMDB's avatar_path is usually "/abc123.jpg", but for Gravatar-backed
// accounts it's a full URL with a stray leading slash ("/https://...").
function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.startsWith("/") ? path.slice(1) : path;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `${IMAGE_BASE}/w45${path.startsWith("/") ? path : `/${path}`}`;
}

// TMDB reviews change rarely; cache them briefly so re-opening a movie
// detail screen doesn't hit the API again. Same idea as genreCache above.
const REVIEW_TTL_MS = 10 * 60 * 1000;
const reviewCache = new Map<string, { data: NormalizedReview[]; expires: number }>();

export async function getMovieReviews(
  tmdbId: number,
  movieId: string,
  pages = 1,
): Promise<NormalizedReview[]> {
  const cacheKey = `${tmdbId}:${pages}`;
  const cached = reviewCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    // Cached entries are keyed by tmdbId, but carry the movie's Mongo id —
    // re-stamp it in case the same TMDB title is reached via a different doc.
    return cached.data.map((r) => ({ ...r, movie: movieId }));
  }

  const responses = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      tmdbFetch(`/movie/${tmdbId}/reviews`, { page: String(i + 1) }),
    ),
  );

  const data: NormalizedReview[] = responses.flatMap((response) =>
    (response.results || []).map((raw: any): NormalizedReview => {
      const details = raw.author_details || {};
      // TMDB rates 0-10; the app's scale is 1-5.
      const rawRating = details.rating;
      return {
        _id: `tmdb:${raw.id}`,
        movie: movieId,
        source: "tmdb",
        displayName: details.username || raw.author || "TMDB user",
        avatarUrl: avatarUrl(details.avatar_path),
        rating: typeof rawRating === "number" ? rawRating / 2 : null,
        text: raw.content || "",
        createdAt: raw.created_at || new Date(0).toISOString(),
        url: raw.url,
        isMine: false,
      };
    }),
  );

  reviewCache.set(cacheKey, { data, expires: Date.now() + REVIEW_TTL_MS });
  return data;
}

// "Where can I watch this" — NOT playback. TMDB aggregates this from
// JustWatch: which services (if any) currently carry the title, per country.
// There is no free API that provides actual video playback — that requires
// a licensing deal with each studio/platform.
export async function getWatchProviders(tmdbId: number, region = "US") {
  const data = await tmdbFetch(`/movie/${tmdbId}/watch/providers`);
  const forRegion = data.results?.[region];
  if (!forRegion) return { region, link: null, flatrate: [], rent: [], buy: [] };

  return {
    region,
    link: forRegion.link || null,
    flatrate: (forRegion.flatrate || []).map((p: any) => p.provider_name),
    rent: (forRegion.rent || []).map((p: any) => p.provider_name),
    buy: (forRegion.buy || []).map((p: any) => p.provider_name),
  };
}

// ---- Extras: runtime, age certification, trailer ----
// All three come from one request via append_to_response, which keeps the
// home feed's per-movie enrichment to a single call each.

export interface TmdbMovieExtras {
  runtime: number | null;
  certification: string | null;
  trailerKey: string | null; // YouTube video key
  trailerName: string | null;
}

// Generic TTL memo — same idea as genreCache/reviewCache above, but reusable.
function makeCache<T>(ttlMs: number) {
  const store = new Map<string, { data: T; expires: number }>();
  return {
    get(key: string) {
      const hit = store.get(key);
      if (hit && hit.expires > Date.now()) return hit.data;
      return undefined;
    },
    set(key: string, data: T) {
      store.set(key, { data, expires: Date.now() + ttlMs });
      return data;
    },
  };
}

const extrasCache = makeCache<TmdbMovieExtras>(60 * 60 * 1000);

// Prefer the official trailer, then any trailer, then a teaser.
function pickTrailer(videos: any[]): { key: string; name: string } | null {
  const youtube = videos.filter((v) => v.site === "YouTube");
  const rank = (v: any) =>
    (v.type === "Trailer" ? 0 : v.type === "Teaser" ? 1 : 2) + (v.official ? 0 : 0.5);
  const best = youtube.sort((a, b) => rank(a) - rank(b))[0];
  return best ? { key: best.key, name: best.name } : null;
}

function pickCertification(releaseDates: any[], region: string): string | null {
  const forRegion = releaseDates.find((r) => r.iso_3166_1 === region);
  const found = (forRegion?.release_dates || [])
    .map((r: any) => r.certification)
    .find((c: string) => c && c.trim());
  return found || null;
}

export async function getMovieExtras(tmdbId: number, region = "US"): Promise<TmdbMovieExtras> {
  const key = `${tmdbId}:${region}`;
  const hit = extrasCache.get(key);
  if (hit) return hit;

  const raw = await tmdbFetch(`/movie/${tmdbId}`, {
    append_to_response: "release_dates,videos",
  });

  const trailer = pickTrailer(raw.videos?.results || []);
  return extrasCache.set(key, {
    runtime: raw.runtime ?? null,
    certification: pickCertification(raw.release_dates?.results || [], region),
    trailerKey: trailer?.key ?? null,
    trailerName: trailer?.name ?? null,
  });
}

// A summary plus the real, sourced extras — everything the home cards show.
export interface TmdbMovieCard extends TmdbMovieSummary {
  runtime: number | null;
  certification: string | null;
}

// Enrich in parallel, tolerating individual failures so one bad title can't
// empty a whole row.
async function enrich(summaries: TmdbMovieSummary[], region: string): Promise<TmdbMovieCard[]> {
  return Promise.all(
    summaries.map(async (s) => {
      try {
        const extras = await getMovieExtras(s.tmdbId, region);
        return { ...s, runtime: extras.runtime, certification: extras.certification };
      } catch {
        return { ...s, runtime: null, certification: null };
      }
    }),
  );
}

// ---- Home feed ----
// One request from the phone becomes a couple of TMDB list calls plus the
// per-title enrichment, all memoized — so the home screen is cheap to reload.

export interface HomeFeed {
  trending: TmdbMovieCard[];
  lowCommitment: TmdbMovieCard[];
}

// Enriching the feed costs ~24 TMDB calls and can take 20s cold, so the
// last good feed is kept indefinitely and served immediately while a
// refresh runs in the background. Only the very first caller ever waits.
const homeCache = makeCache<HomeFeed>(10 * 60 * 1000);
const homeStale = new Map<string, HomeFeed>();
const homeInFlight = new Map<string, Promise<HomeFeed>>();
const LOW_COMMITMENT_MAX_RUNTIME = 105;

export async function getHomeFeed(region = "US"): Promise<HomeFeed> {
  const fresh = homeCache.get(region);
  if (fresh) return fresh;

  // Coalesce concurrent misses onto one upstream refresh.
  let refresh = homeInFlight.get(region);
  if (!refresh) {
    refresh = buildHomeFeed(region)
      .then((feed) => {
        homeCache.set(region, feed);
        homeStale.set(region, feed);
        return feed;
      })
      .finally(() => homeInFlight.delete(region));
    homeInFlight.set(region, refresh);
  }

  // Serve the previous feed instantly rather than making anyone wait 20s.
  const stale = homeStale.get(region);
  if (stale) {
    refresh.catch(() => {}); // keep the background refresh unhandled-safe
    return stale;
  }
  return refresh;
}

// Warm on boot so the first real user never pays the cold cost.
getHomeFeed().catch(() => {});

async function buildHomeFeed(region: string): Promise<HomeFeed> {

  const [trendingRaw, popularRaw] = await Promise.all([
    getTrendingMovies("week"),
    getPopularMovies(1),
  ]);

  // Enrich the trending row for display, and a slice of popular purely to
  // find genuinely short films for the low-commitment row.
  const [trending, popularPool] = await Promise.all([
    enrich(trendingRaw.slice(0, 12), region),
    enrich(popularRaw.slice(0, 12), region),
  ]);

  const seen = new Set<number>();
  const lowCommitment = [...trending, ...popularPool]
    .filter((m) => {
      if (!m.runtime || m.runtime > LOW_COMMITMENT_MAX_RUNTIME) return false;
      if (seen.has(m.tmdbId)) return false;
      seen.add(m.tmdbId);
      return true;
    })
    .sort((a, b) => (a.runtime || 0) - (b.runtime || 0))
    .slice(0, 6);

  return { trending, lowCommitment };
}

// ---- Discover ----
// Powers both the filter sheet and the watch-decision quiz. Everything here
// maps onto TMDB's own discover parameters, so results are real matches
// rather than anything inferred locally.

export interface DiscoverParams {
  genres?: string[]; // genre names, mapped to TMDB ids
  maxRuntime?: number;
  minRuntime?: number;
  minRating?: number;
  certification?: string;
  sortBy?: string;
  page?: number;
}

async function getGenreIdMap(): Promise<Record<string, number>> {
  const byId = await getGenreMap();
  return Object.fromEntries(
    Object.entries(byId).map(([id, name]) => [name.toLowerCase(), Number(id)]),
  );
}

export async function discoverMovies(
  params: DiscoverParams,
  region = "US",
): Promise<TmdbMovieCard[]> {
  const query: Record<string, string> = {
    sort_by: params.sortBy || "popularity.desc",
    include_adult: "false",
    page: String(params.page || 1),
    // Without a vote floor, discover surfaces obscure titles with a single
    // 10/10 vote, which makes the quiz results look broken.
    "vote_count.gte": "150",
  };

  if (params.genres?.length) {
    const idMap = await getGenreIdMap();
    const ids = params.genres
      .map((g) => idMap[g.toLowerCase()])
      .filter((id): id is number => typeof id === "number");
    // TMDB treats a comma as OR here, which is what we want for moods.
    if (ids.length) query.with_genres = ids.join(",");
  }
  if (params.maxRuntime) query["with_runtime.lte"] = String(params.maxRuntime);
  if (params.minRuntime) query["with_runtime.gte"] = String(params.minRuntime);
  if (params.minRating) query["vote_average.gte"] = String(params.minRating);
  if (params.certification) {
    query.certification_country = region;
    query.certification = params.certification;
  }

  const [data, genreMap] = await Promise.all([
    tmdbFetch("/discover/movie", query),
    getGenreMap(),
  ]);

  const summaries = await Promise.all(
    (data.results || []).slice(0, 12).map((r: any) => toSummary(r, genreMap)),
  );
  const cards = await enrich(summaries, region);

  // TMDB's discover runtime filter and its detail runtime occasionally
  // disagree by a few minutes. Re-apply the bound against the value we
  // actually show, so a "under 100 min" filter never lists a 102m film.
  return cards.filter(
    (m) =>
      m.runtime == null ||
      ((!params.maxRuntime || m.runtime <= params.maxRuntime) &&
        (!params.minRuntime || m.runtime >= params.minRuntime)),
  );
}

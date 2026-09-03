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

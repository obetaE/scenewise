import { getDeviceId } from "./deviceId";

// Set this to your computer's LAN IP while developing — "localhost" only
// works from a simulator running on the same machine, not from Expo Go on
// a physical phone. See the README for how to find yours.
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const deviceId = await getDeviceId();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "x-device-id": deviceId,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.message || `Request failed (${response.status})`, response.status);
  }

  return data as T;
}

// ---- Types matching the backend's responses ----

export type Movie = {
  _id: string;
  tmdbId: number;
  title: string;
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  releaseDate: string;
  genres: string[];
  runtime?: number;
  tmdbVoteAverage: number;
  avgRating: number;
  ratingsCount: number;
  likesCount: number;
  likedBy: string[];
};

export type TmdbMovieSummary = {
  tmdbId: number;
  title: string;
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  releaseDate: string;
  genres: string[];
  tmdbVoteAverage: number;
};

// A TMDB summary plus the extras we genuinely have a source for. Used by
// the home feed, discover results and the filter sheet.
export type MovieCard = TmdbMovieSummary & {
  runtime: number | null;
  certification: string | null;
};

export type SpotlightRow = {
  key: string;
  title: string;
  subtitle: string;
  movies: MovieCard[];
};

export type HomeFeed = {
  trending: MovieCard[];
  lowCommitment: MovieCard[];
  spotlight: SpotlightRow;
};

// Critic scores from OMDb (Rotten Tomatoes, Metacritic, IMDb). These are
// scores, not written reviews — no free API exposes RT's review prose.
export type CriticScore = {
  source: "rotten_tomatoes" | "metacritic" | "imdb";
  label: string;
  score: number; // normalised 0-100
  display: string; // as the outlet expresses it, e.g. "79%"
  votes: number | null;
};

export type MovieExtras = {
  runtime: number | null;
  certification: string | null;
  imdbId: string | null;
  trailerKey: string | null;
  trailerName: string | null;
};

export type DiscoverFilters = {
  genres?: string[];
  maxRuntime?: number;
  minRuntime?: number;
  minRating?: number;
  certification?: string;
  sortBy?: string;
  minYear?: number;
  maxYear?: number;
};

// One shape for both sources: reviews written in this app and reviews
// pulled live from TMDB. `source` is what the UI tags each card with.
export type Review = {
  _id: string;
  movie: string;
  source: "scenewise" | "tmdb";
  displayName: string;
  avatarUrl: string | null;
  rating: number | null; // null when a TMDB author left no rating
  text: string;
  createdAt: string;
  url?: string; // TMDB only — permalink to the full review
  isMine: boolean;
};

export type ShelfEntry = {
  _id: string;
  deviceId: string;
  movie: Movie;
  status: "want_to_watch" | "watching" | "watched";
};

export const api = {
  // -- Discovery (live TMDB, not cached in our DB) --
  searchMovies: (q: string) =>
    request<{ results: TmdbMovieSummary[] }>(`/movie/search?q=${encodeURIComponent(q)}`),
  trendingMovies: () => request<{ results: TmdbMovieSummary[] }>("/movie/trending"),
  popularMovies: (page = 1) =>
    request<{ results: TmdbMovieSummary[] }>(`/movie/popular?page=${page}`),

  // The whole home screen in one request, enriched server-side.
  homeFeed: () => request<HomeFeed>("/movie/home"),
  genres: () => request<{ genres: string[] }>("/movie/genres"),

  // Backs both the filter sheet and the watch-decision quiz.
  discover: (filters: DiscoverFilters) => {
    const q = new URLSearchParams();
    if (filters.genres?.length) q.set("genres", filters.genres.join(","));
    if (filters.maxRuntime) q.set("maxRuntime", String(filters.maxRuntime));
    if (filters.minRuntime) q.set("minRuntime", String(filters.minRuntime));
    if (filters.minRating) q.set("minRating", String(filters.minRating));
    if (filters.certification) q.set("certification", filters.certification);
    if (filters.sortBy) q.set("sortBy", filters.sortBy);
    if (filters.minYear) q.set("minYear", String(filters.minYear));
    if (filters.maxYear) q.set("maxYear", String(filters.maxYear));
    return request<{ results: MovieCard[] }>(`/movie/discover?${q.toString()}`);
  },

  // -- Catalog (our DB, cached from TMDB on first touch) --
  registerMovie: (tmdbId: number) =>
    request<{ movie: Movie }>("/movie", { method: "POST", body: { tmdbId } }),
  getMovie: (id: string) => request<{ movie: Movie; likedByMe: boolean }>(`/movie/${id}`),
  toggleLike: (id: string) =>
    request<{ liked: boolean; likesCount: number }>(`/movie/${id}/like`, { method: "POST" }),
  movieExtras: (id: string) => request<{ extras: MovieExtras }>(`/movie/${id}/extras`),
  watchProviders: (id: string) =>
    request<{ providers: { link: string | null; flatrate: string[]; rent: string[]; buy: string[] } }>(
      `/movie/${id}/watch-providers`,
    ),

  // -- Reviews --
  submitReview: (movieId: string, rating: number, text: string, displayName?: string) =>
    request<{ review: Review }>(`/review/${movieId}`, {
      method: "POST",
      body: { rating, text, displayName },
    }),
  movieReviews: (movieId: string, page = 1) =>
    request<{ reviews: Review[]; totalReviews: number; criticScores: CriticScore[] }>(
      `/review/movie/${movieId}?page=${page}`,
    ),
  deleteReview: (reviewId: string) =>
    request<{ message: string }>(`/review/${reviewId}`, { method: "DELETE" }),

  // -- Shelf ("add to profile") --
  setShelfStatus: (movieId: string, status: ShelfEntry["status"]) =>
    request<{ entry: ShelfEntry }>(`/shelf/${movieId}`, { method: "POST", body: { status } }),
  removeFromShelf: (movieId: string) =>
    request<{ message: string }>(`/shelf/${movieId}`, { method: "DELETE" }),

  // -- Profile --
  myShelf: (status?: ShelfEntry["status"]) =>
    request<{ shelf: ShelfEntry[] }>(`/profile/shelf${status ? `?status=${status}` : ""}`),
  myReviews: () => request<{ reviews: (Review & { movie: Movie })[] }>("/profile/reviews"),
  myLikes: () => request<{ movies: Movie[] }>("/profile/likes"),
};

// Thin wrapper around the OMDb API (https://www.omdbapi.com).
//
// TMDB is this app's primary source. OMDb is strictly supplementary and is
// used for two things:
//   1. Critic scores TMDB doesn't carry at all — Rotten Tomatoes' Tomatometer,
//      Metacritic's Metascore and IMDb's rating.
//   2. Filling individual gaps (plot, runtime, age rating) *only* where TMDB
//      returned nothing for that field.
//
// Note on scope: OMDb exposes ratings, not review prose. Rotten Tomatoes'
// actual written reviews are not available through any free API — RT's own
// API is invite-only and enterprise-priced — so what we surface from here is
// each outlet's score, clearly attributed, never invented review text.
//
// The key is optional. Without OMDB_API_KEY set, every function here returns
// null and the app simply carries on with TMDB alone.

const BASE_URL = "https://www.omdbapi.com/";
const API_KEY = process.env.OMDB_API_KEY;

export interface OmdbRecord {
  imdbId: string;
  title: string;
  plot: string | null;
  runtime: number | null;
  rated: string | null; // e.g. "PG-13"
  genres: string[];
  director: string | null;
  actors: string | null;
  awards: string | null;
  imdbRating: number | null; // 0-10
  imdbVotes: number | null;
  rottenTomatoes: number | null; // 0-100
  metascore: number | null; // 0-100
}

export function isOmdbConfigured() {
  return Boolean(API_KEY);
}

// OMDb encodes "missing" as the literal string "N/A" across every field.
function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "N/A") return null;
  return trimmed;
}

function parseRuntime(value: unknown): number | null {
  const raw = clean(value); // "142 min"
  if (!raw) return null;
  const match = raw.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function parseNumber(value: unknown): number | null {
  const raw = clean(value);
  if (!raw) return null;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Ratings arrive as display strings: "8.8/10", "79%", "74/100".
function parseRatings(ratings: any[]): { rottenTomatoes: number | null; metascore: number | null } {
  let rottenTomatoes: number | null = null;
  let metascore: number | null = null;

  for (const r of ratings || []) {
    const value = clean(r?.Value);
    if (!value) continue;
    if (r.Source === "Rotten Tomatoes") {
      const m = value.match(/(\d+)%/);
      if (m) rottenTomatoes = Number(m[1]);
    } else if (r.Source === "Metacritic") {
      const m = value.match(/(\d+)\s*\/\s*100/);
      if (m) metascore = Number(m[1]);
    }
  }
  return { rottenTomatoes, metascore };
}

const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { data: OmdbRecord | null; expires: number }>();

// OMDb's free tier allows 1000 requests/day. TMDB is this app's primary
// source and must never be affected by OMDb running dry, so we spend well
// under the cap and stop cleanly rather than getting hard-blocked mid-day.
// Combined with the 24h cache above, this is roughly "800 distinct movies
// looked up per day" — far more than a portfolio app will see.
const DAILY_BUDGET = 800;
let spentToday = 0;
let budgetDay = new Date().getUTCDate();

function withinBudget(): boolean {
  const today = new Date().getUTCDate();
  if (today !== budgetDay) {
    budgetDay = today;
    spentToday = 0;
  }
  if (spentToday >= DAILY_BUDGET) return false;
  spentToday += 1;
  return true;
}

export function omdbBudgetRemaining(): number {
  const today = new Date().getUTCDate();
  if (today !== budgetDay) return DAILY_BUDGET;
  return Math.max(0, DAILY_BUDGET - spentToday);
}

export async function getByImdbId(imdbId: string): Promise<OmdbRecord | null> {
  if (!API_KEY || !imdbId) return null;

  const hit = cache.get(imdbId);
  if (hit && hit.expires > Date.now()) return hit.data;

  // Out of daily budget: behave exactly as if OMDb weren't configured.
  // Don't cache this, so the lookup retries once the budget resets.
  if (!withinBudget()) return null;

  const url = new URL(BASE_URL);
  url.searchParams.set("apikey", API_KEY);
  url.searchParams.set("i", imdbId);
  url.searchParams.set("plot", "full");

  let record: OmdbRecord | null = null;
  try {
    const response = await fetch(url.toString());
    if (response.ok) {
      const raw = await response.json();
      // OMDb returns HTTP 200 with { Response: "False" } for misses.
      if (raw?.Response !== "False") {
        const { rottenTomatoes, metascore } = parseRatings(raw.Ratings);
        record = {
          imdbId,
          title: clean(raw.Title) || "",
          plot: clean(raw.Plot),
          runtime: parseRuntime(raw.Runtime),
          rated: clean(raw.Rated),
          genres: (clean(raw.Genre) || "").split(",").map((g) => g.trim()).filter(Boolean),
          director: clean(raw.Director),
          actors: clean(raw.Actors),
          awards: clean(raw.Awards),
          imdbRating: parseNumber(raw.imdbRating),
          imdbVotes: parseNumber(raw.imdbVotes),
          rottenTomatoes,
          metascore,
        };
      }
    }
  } catch (error) {
    console.error("OMDb lookup failed:", error);
  }

  cache.set(imdbId, { data: record, expires: Date.now() + TTL_MS });
  return record;
}

// The critic scores rendered alongside reviews. Each is attributed to the
// outlet that actually published it — these are scores, not written reviews.
export interface CriticScore {
  source: "rotten_tomatoes" | "metacritic" | "imdb";
  label: string;
  /** Normalised to 0-100 so one component can render them all. */
  score: number;
  /** How the outlet itself expresses it, e.g. "79%" or "8.8/10". */
  display: string;
  votes: number | null;
}

export function toCriticScores(record: OmdbRecord | null): CriticScore[] {
  if (!record) return [];
  const scores: CriticScore[] = [];

  if (record.rottenTomatoes != null) {
    scores.push({
      source: "rotten_tomatoes",
      label: "Rotten Tomatoes",
      score: record.rottenTomatoes,
      display: `${record.rottenTomatoes}%`,
      votes: null,
    });
  }
  if (record.metascore != null) {
    scores.push({
      source: "metacritic",
      label: "Metacritic",
      score: record.metascore,
      display: `${record.metascore}/100`,
      votes: null,
    });
  }
  if (record.imdbRating != null) {
    scores.push({
      source: "imdb",
      label: "IMDb",
      score: Math.round(record.imdbRating * 10),
      display: `${record.imdbRating.toFixed(1)}/10`,
      votes: record.imdbVotes,
    });
  }
  return scores;
}

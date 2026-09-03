import type { ImageSourcePropType } from "react-native";
import type { MovieCard } from "./api";
import { movies as sampleMovies, type Movie as SampleMovie } from "./movies";

// The home and quiz screens render two kinds of movie: live ones from the
// API and the bundled sample titles used as an offline fallback. This is the
// single shape both collapse into, so the card markup never branches on
// where a movie came from.
export type DisplayCard = {
  key: string;
  title: string;
  year: string;
  genres: string[];
  runtimeLabel: string | null;
  certification: string | null;
  /** 0-100. TMDB's audience score for real titles; the sample's own match. */
  score: number | null;
  poster: ImageSourcePropType;
  /** Set for live titles — register by TMDB id, then open the detail screen. */
  tmdbId: number | null;
  /** Set for sample titles — routed to the local /title/[id] screen instead. */
  sampleId: string | null;
  isSample: boolean;
};

export function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function fromApi(movie: MovieCard): DisplayCard {
  return {
    key: `tmdb-${movie.tmdbId}`,
    title: movie.title,
    year: movie.releaseDate?.slice(0, 4) || "—",
    genres: movie.genres,
    runtimeLabel: formatRuntime(movie.runtime),
    certification: movie.certification,
    // TMDB votes 0-10; the ring is a percentage.
    score: movie.tmdbVoteAverage ? Math.round(movie.tmdbVoteAverage * 10) : null,
    poster: { uri: movie.posterUrl },
    tmdbId: movie.tmdbId,
    sampleId: null,
    isSample: false,
  };
}

export function fromSample(movie: SampleMovie): DisplayCard {
  return {
    key: `sample-${movie.id}`,
    title: movie.title,
    year: String(movie.year),
    genres: movie.genres,
    runtimeLabel: movie.runtime,
    certification: null,
    score: movie.match,
    poster: movie.poster,
    tmdbId: null,
    sampleId: movie.id,
    isSample: true,
  };
}

// The offline fallback rows, mirroring what the live feed provides.
export const sampleTrending: DisplayCard[] = sampleMovies.map(fromSample);
export const sampleLowCommitment: DisplayCard[] = sampleMovies
  .filter((m) => m.intensity <= 3)
  .map(fromSample);

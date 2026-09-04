import express from "express";
import Movie from "../lib/models/Movie.ts";
import requireDeviceId from "../middleware/device.middleware.ts";
import {
  searchMovies,
  getTrendingMovies,
  getPopularMovies,
  getMovieDetail,
  getWatchProviders,
  getHomeFeed,
  discoverMovies,
  getMovieExtras,
  listGenres,
} from "../lib/tmdb.ts";
import { getByImdbId } from "../lib/omdb.ts";

const router = express.Router();

// GET /api/movie/search?q=dune — live TMDB search, doesn't touch our DB
router.get("/search", requireDeviceId, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ message: "Query param 'q' is required" });

    const results = await searchMovies(q);
    res.json({ results });
  } catch (error) {
    console.error("Error searching TMDB:", error);
    res.status(502).json({ message: "Movie search is temporarily unavailable" });
  }
});

// GET /api/movie/trending — this week's trending movies, straight from TMDB
router.get("/trending", requireDeviceId, async (req, res) => {
  try {
    const results = await getTrendingMovies("week");
    res.json({ results });
  } catch (error) {
    console.error("Error fetching trending movies:", error);
    res.status(502).json({ message: "Trending movies are temporarily unavailable" });
  }
});

// GET /api/movie/popular — TMDB's popular list, for a browse/discover screen
router.get("/popular", requireDeviceId, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const results = await getPopularMovies(page);
    res.json({ results });
  } catch (error) {
    console.error("Error fetching popular movies:", error);
    res.status(502).json({ message: "Popular movies are temporarily unavailable" });
  }
});

// GET /api/movie/home — the whole home screen in one request: the trending
// row plus short "low-commitment" picks, each enriched with real runtime and
// age certification. Cached upstream, so this is cheap to re-hit.
//
// Declared before /:id so those literal paths aren't swallowed by the param route.
router.get("/home", requireDeviceId, async (req, res) => {
  try {
    const feed = await getHomeFeed(String(req.query.region || "US"));
    res.json(feed);
  } catch (error) {
    console.error("Error building home feed:", error);
    res.status(502).json({ message: "Home feed is temporarily unavailable" });
  }
});

// GET /api/movie/genres — the genre list backing the profile picker.
router.get("/genres", requireDeviceId, async (_req, res) => {
  try {
    res.json({ genres: await listGenres() });
  } catch (error) {
    console.error("Error listing genres:", error);
    res.status(502).json({ message: "Genres are temporarily unavailable" });
  }
});

// GET /api/movie/discover?genres=Comedy,Drama&maxRuntime=100&minRating=6
// Backs the filter sheet and the watch-decision quiz.
router.get("/discover", requireDeviceId, async (req, res) => {
  try {
    const q = req.query;
    const list = (v: unknown) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

    const results = await discoverMovies({
      genres: list(q.genres),
      maxRuntime: q.maxRuntime ? Number(q.maxRuntime) : undefined,
      minRuntime: q.minRuntime ? Number(q.minRuntime) : undefined,
      minRating: q.minRating ? Number(q.minRating) : undefined,
      certification: q.certification ? String(q.certification) : undefined,
      sortBy: q.sortBy ? String(q.sortBy) : undefined,
      page: q.page ? Number(q.page) : undefined,
      minYear: q.minYear ? Number(q.minYear) : undefined,
      maxYear: q.maxYear ? Number(q.maxYear) : undefined,
      minVotes: q.minVotes ? Number(q.minVotes) : undefined,
    });

    res.json({ results });
  } catch (error) {
    console.error("Error running discover:", error);
    res.status(502).json({ message: "Discover is temporarily unavailable" });
  }
});

// Finds a cached Movie by tmdbId, or creates one from TMDB's own detail
// endpoint. Called before any like/review/shelf action on a movie we
// haven't seen before.
async function findOrCreateMovie(tmdbId: number) {
  let movie = await Movie.findOne({ tmdbId });
  if (movie) return movie;

  const detail = await getMovieDetail(tmdbId);

  movie = await Movie.create({
    tmdbId: detail.tmdbId,
    title: detail.title,
    overview: detail.overview,
    posterUrl: detail.posterUrl,
    backdropUrl: detail.backdropUrl,
    releaseDate: detail.releaseDate,
    genres: detail.genres,
    runtime: detail.runtime,
    tmdbVoteAverage: detail.tmdbVoteAverage,
    imdbId: detail.imdbId,
  });
  return movie;
}

// POST /api/movie — registers a movie into our catalog (idempotent) by
// TMDB ID. Call this before liking/reviewing/shelving a movie the app
// hasn't seen yet. Returns our internal Movie _id.
router.post("/", requireDeviceId, async (req, res) => {
  try {
    const { tmdbId } = req.body;
    if (!tmdbId) return res.status(400).json({ message: "tmdbId is required" });

    const movie = await findOrCreateMovie(Number(tmdbId));
    res.status(201).json({ movie });
  } catch (error) {
    console.error("Error registering movie:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/movie/:id — full detail for one cached movie
router.get("/:id", requireDeviceId, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: "Movie not found" });

    const likedByMe = movie.likedBy.includes(req.deviceId!);

    // TMDB stays authoritative. OMDb is consulted only to fill fields TMDB
    // genuinely left empty — never to override something TMDB provided.
    const needsOverview = !movie.overview;
    const needsRuntime = !movie.runtime;
    if ((needsOverview || needsRuntime) && movie.imdbId) {
      const omdb = await getByImdbId(movie.imdbId).catch(() => null);
      if (omdb) {
        if (needsOverview && omdb.plot) movie.overview = omdb.plot;
        if (needsRuntime && omdb.runtime) movie.runtime = omdb.runtime;
        await movie.save().catch(() => {});
      }
    }

    res.json({ movie, likedByMe });
  } catch (error) {
    console.error("Error fetching movie:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/movie/:id/watch-providers — where it's available to stream/rent/buy
router.get("/:id/watch-providers", requireDeviceId, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: "Movie not found" });

    const providers = await getWatchProviders(movie.tmdbId);
    res.json({ providers });
  } catch (error) {
    console.error("Error fetching watch providers:", error);
    res.status(502).json({ message: "Watch providers are temporarily unavailable" });
  }
});

// GET /api/movie/:id/extras — runtime, age certification and the trailer.
// One TMDB call behind the scenes (append_to_response), cached for an hour.
router.get("/:id/extras", requireDeviceId, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: "Movie not found" });

    const extras = await getMovieExtras(movie.tmdbId, String(req.query.region || "US"));
    res.json({ extras });
  } catch (error) {
    console.error("Error fetching movie extras:", error);
    res.status(502).json({ message: "Movie extras are temporarily unavailable" });
  }
});

// POST /api/movie/:id/like — toggles the current device's like on a movie
router.post("/:id/like", requireDeviceId, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: "Movie not found" });

    const deviceId = req.deviceId!;
    const alreadyLiked = movie.likedBy.includes(deviceId);

    if (alreadyLiked) {
      movie.likedBy = movie.likedBy.filter((id: string) => id !== deviceId);
    } else {
      movie.likedBy.push(deviceId);
    }
    movie.likesCount = movie.likedBy.length;
    await movie.save();

    res.json({ liked: !alreadyLiked, likesCount: movie.likesCount });
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
export { findOrCreateMovie };

import express from "express";
import Movie from "../lib/models/Movie.ts";
import requireDeviceId from "../middleware/device.middleware.ts";
import {
  searchMovies,
  getTrendingMovies,
  getPopularMovies,
  getMovieDetail,
  getWatchProviders,
} from "../lib/tmdb.ts";

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

import express from "express";
import Review from "../lib/models/Review.ts";
import Movie from "../lib/models/Movie.ts";
import requireDeviceId from "../middleware/device.middleware.ts";
import { recalculateMovieRating } from "../lib/movieStats.ts";
import { getMovieReviews } from "../lib/tmdb.ts";
import { serializeReview } from "../lib/reviewSerializer.ts";

const router = express.Router();

// POST /api/review/:movieId — create or update this device's review.
// Reviewing again just edits the existing review (one per device per movie).
router.post("/:movieId", requireDeviceId, async (req, res) => {
  try {
    const { rating, text, displayName } = req.body;
    const { movieId } = req.params;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) return res.status(404).json({ message: "Movie not found" });

    const review = await Review.findOneAndUpdate(
      { movie: movieId, deviceId: req.deviceId },
      { rating, text: text || "", ...(displayName ? { displayName } : {}) },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await recalculateMovieRating(String(movieId));

    res.status(201).json({ review: serializeReview(review, req.deviceId!) });
  } catch (error) {
    console.error("Error saving review:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/review/movie/:movieId?page=1&limit=10
// This app's reviews merged with TMDB's, newest first, each tagged with its
// source. Pagination happens over the merged list, so both are sorted into
// one stream rather than one source being stuck below the other.
const TMDB_PAGE_SIZE = 20;
const MAX_TMDB_PAGES = 3;

router.get("/movie/:movieId", requireDeviceId, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const movie = await Movie.findById(req.params.movieId);
    if (!movie) return res.status(404).json({ message: "Movie not found" });

    // Enough TMDB pages to cover what this page of the merged list could
    // need, capped so deep paging can't fan out unbounded.
    const tmdbPages = Math.min(
      Math.ceil((page * limit) / TMDB_PAGE_SIZE),
      MAX_TMDB_PAGES,
    );

    const [ownReviews, tmdbReviews] = await Promise.all([
      // One review per device per movie, so this stays small — no need to
      // paginate the DB side before merging.
      Review.find({ movie: req.params.movieId }).sort({ createdAt: -1 }),
      // TMDB is a nice-to-have: a missing token or an outage must not take
      // down this app's own reviews.
      getMovieReviews(movie.tmdbId, String(movie._id), tmdbPages).catch((error) => {
        console.error("TMDB reviews unavailable:", error);
        return [];
      }),
    ]);

    const merged = [
      ...ownReviews.map((r: any) => serializeReview(r, req.deviceId!)),
      ...tmdbReviews,
    ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    const totalReviews = merged.length;

    res.json({
      reviews: merged.slice((page - 1) * limit, page * limit),
      currentPage: page,
      totalReviews,
      totalPages: Math.ceil(totalReviews / limit),
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/review/:reviewId — delete your own (this device's) review
router.delete("/:reviewId", requireDeviceId, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (review.deviceId !== req.deviceId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const movieId = review.movie.toString();
    await review.deleteOne();
    await recalculateMovieRating(movieId);

    res.json({ message: "Review deleted" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

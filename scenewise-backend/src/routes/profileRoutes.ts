import express from "express";
import Shelf from "../lib/models/Shelf.ts";
import Review from "../lib/models/Review.ts";
import Movie from "../lib/models/Movie.ts";
import requireDeviceId from "../middleware/device.middleware.ts";
import { serializeReview } from "../lib/reviewSerializer.ts";

const router = express.Router();

// GET /api/profile/shelf?status=watching — this device's shelved movies
router.get("/shelf", requireDeviceId, async (req, res) => {
  try {
    const filter: Record<string, unknown> = { deviceId: req.deviceId };
    if (req.query.status) filter.status = req.query.status;

    const shelf = await Shelf.find(filter).sort({ updatedAt: -1 }).populate("movie");
    res.json({ shelf });
  } catch (error) {
    console.error("Error fetching shelf:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/profile/reviews — every review this device has written
router.get("/reviews", requireDeviceId, async (req, res) => {
  try {
    const reviews = await Review.find({ deviceId: req.deviceId })
      .sort({ createdAt: -1 })
      .populate("movie");

    // Same serialized shape as /api/review/movie/:movieId, except the movie
    // stays populated — the profile screen renders its poster and title.
    res.json({
      reviews: reviews.map((review: any) => ({
        ...serializeReview(review, req.deviceId!),
        movie: review.movie,
      })),
    });
  } catch (error) {
    console.error("Error fetching your reviews:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/profile/likes — every movie this device has liked
router.get("/likes", requireDeviceId, async (req, res) => {
  try {
    const movies = await Movie.find({ likedBy: req.deviceId }).sort({ updatedAt: -1 });
    res.json({ movies });
  } catch (error) {
    console.error("Error fetching liked movies:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

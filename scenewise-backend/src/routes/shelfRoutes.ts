import express from "express";
import Shelf, { SHELF_STATUSES } from "../lib/models/Shelf.ts";
import Movie from "../lib/models/Movie.ts";
import requireDeviceId from "../middleware/device.middleware.ts";

const router = express.Router();

// POST /api/shelf/:movieId — add/move a movie on this device's shelf
router.post("/:movieId", requireDeviceId, async (req, res) => {
  try {
    const { status } = req.body;
    const { movieId } = req.params;

    if (!SHELF_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ message: `status must be one of: ${SHELF_STATUSES.join(", ")}` });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) return res.status(404).json({ message: "Movie not found" });

    const entry = await Shelf.findOneAndUpdate(
      { movie: movieId, deviceId: req.deviceId },
      { status },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(201).json({ entry });
  } catch (error) {
    console.error("Error updating shelf:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/shelf/:movieId — remove a movie from this device's shelf
router.delete("/:movieId", requireDeviceId, async (req, res) => {
  try {
    await Shelf.findOneAndDelete({ movie: req.params.movieId, deviceId: req.deviceId });
    res.json({ message: "Removed from shelf" });
  } catch (error) {
    console.error("Error removing from shelf:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

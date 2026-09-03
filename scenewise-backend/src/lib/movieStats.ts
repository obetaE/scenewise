import mongoose from "mongoose";
import Review from "./models/Review.ts";
import Movie from "./models/Movie.ts";

export async function recalculateMovieRating(movieId: string) {
  const stats = await Review.aggregate([
    { $match: { movie: new mongoose.Types.ObjectId(movieId) } },
    {
      $group: {
        _id: "$movie",
        avgRating: { $avg: "$rating" },
        ratingsCount: { $sum: 1 },
      },
    },
  ]);

  const { avgRating = 0, ratingsCount = 0 } = stats[0] || {};

  await Movie.findByIdAndUpdate(movieId, {
    avgRating: Math.round(avgRating * 10) / 10,
    ratingsCount,
  });
}

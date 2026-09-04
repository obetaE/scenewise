import mongoose from "mongoose";

// A Movie is a shared catalog entry, cached from TMDB the first time anyone
// searches for, likes, reviews, or shelves it. Many devices can like/review/
// shelf the same Movie document.
const movieSchema = new mongoose.Schema(
  {
    tmdbId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    overview: {
      type: String,
      default: "",
    },
    posterUrl: {
      type: String,
      default: "",
    },
    backdropUrl: {
      type: String,
      default: "",
    },
    releaseDate: {
      type: String,
      default: "",
    },
    genres: [{ type: String }],
    runtime: {
      type: Number, // minutes
    },
    // IMDb id, used to look this title up in OMDb for critic scores.
    imdbId: {
      type: String,
      default: null,
      index: true,
    },
    tmdbVoteAverage: {
      type: Number, // TMDB's own aggregate rating, informational only
      default: 0,
    },
    // Our own aggregate, built entirely from this app's Review documents —
    // recalculated by src/lib/movieStats.ts
    avgRating: {
      type: Number,
      default: 0,
    },
    ratingsCount: {
      type: Number,
      default: 0,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    // Anonymous per-device IDs, not user accounts — see middleware/device.ts
    likedBy: [{ type: String }],
  },
  { timestamps: true },
);

const Movie = mongoose.models.Movie || mongoose.model("Movie", movieSchema);

export default Movie;

import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
      index: true,
    },
    // No accounts — this app identifies a person by an anonymous ID
    // generated once on their device and sent as the x-device-id header.
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    // Optional display name a person can set locally so their reviews don't
    // all show up as "Anonymous" — never verified, never unique, purely
    // cosmetic since there's no account behind it.
    displayName: {
      type: String,
      default: "Anonymous",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      default: "",
      maxlength: 3000,
    },
    // Where this review came from. Everything stored here is written in the
    // app, so it's always "scenewise" — TMDB reviews are fetched live and
    // never persisted. The field exists so the API shape is uniform between
    // the two sources and the client can tag each review without guessing.
    source: {
      type: String,
      enum: ["scenewise", "tmdb"],
      default: "scenewise",
    },
  },
  { timestamps: true },
);

// One review per device per movie — reviewing again edits it in place.
reviewSchema.index({ movie: 1, deviceId: 1 }, { unique: true });

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default Review;

import mongoose from "mongoose";

export const SHELF_STATUSES = ["want_to_watch", "watching", "watched"] as const;
export type ShelfStatus = (typeof SHELF_STATUSES)[number];

const shelfSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: SHELF_STATUSES,
      required: true,
      default: "want_to_watch",
    },
  },
  { timestamps: true },
);

shelfSchema.index({ deviceId: 1, movie: 1 }, { unique: true });

const Shelf = mongoose.models.Shelf || mongoose.model("Shelf", shelfSchema);

export default Shelf;

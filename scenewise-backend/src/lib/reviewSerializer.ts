import type { NormalizedReview } from "./tmdb.ts";

// Reviews reach the client from two places: this app's own Review documents
// and TMDB's live review feed. Both are serialized into the same shape (see
// NormalizedReview in tmdb.ts) so the client can render one merged list and
// tag each entry with its source.
//
// Note this deliberately drops `deviceId` from the payload — it's the
// ownership key and has no business being public. `isMine` is what the UI
// actually needs.
export function serializeReview(review: any, deviceId: string): NormalizedReview {
  return {
    _id: String(review._id),
    // Populated by profileRoutes, a bare ObjectId everywhere else.
    movie: review.movie?._id ? String(review.movie._id) : String(review.movie),
    source: review.source || "scenewise",
    displayName: review.displayName || "Anonymous",
    avatarUrl: null,
    rating: review.rating,
    text: review.text || "",
    createdAt: new Date(review.createdAt).toISOString(),
    isMine: review.deviceId === deviceId,
  };
}

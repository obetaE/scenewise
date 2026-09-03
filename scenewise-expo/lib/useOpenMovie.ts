import { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { api } from "./api";
import type { DisplayCard } from "./cards";

// Opening a movie differs by source: a live TMDB title has to be registered
// into our catalog first (to get a Mongo id), while a bundled sample title
// routes straight to the local preview screen. Both paths land the user on a
// detail page, so callers don't need to care which they tapped.
export function useOpenMovie() {
  const router = useRouter();
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(
    async (card: DisplayCard) => {
      setError(null);

      if (card.isSample && card.sampleId) {
        router.push(`/title/${card.sampleId}`);
        return;
      }
      if (card.tmdbId == null) return;

      setOpeningKey(card.key);
      try {
        const { movie } = await api.registerMovie(card.tmdbId);
        router.push(`/movie/${movie._id}`);
      } catch (e: any) {
        setError(e?.message || "Couldn't open that movie");
      } finally {
        setOpeningKey(null);
      }
    },
    [router],
  );

  return { open, openingKey, error, clearError: () => setError(null) };
}

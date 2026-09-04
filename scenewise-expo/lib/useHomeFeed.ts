import { useState, useEffect, useCallback, useRef } from "react";
import {
  api,
  ApiError,
  DEFAULT_TIMEOUT_MS,
  COLD_START_TIMEOUT_MS,
  type SpotlightRow,
} from "./api";
import { fromApi, sampleTrending, sampleLowCommitment, type DisplayCard } from "./cards";

export type FeedStatus = "loading" | "waking" | "ready" | "error";

type Spotlight = (Omit<SpotlightRow, "movies"> & { movies: DisplayCard[] }) | null;

// How long to keep retrying a cold start before giving up and calling it an
// error. Render's free tier typically wakes in 30-50s; this allows for the
// slow end plus a margin.
const MAX_COLD_START_ATTEMPTS = 3;

/**
 * Loads the home feed in a way that survives a sleeping backend.
 *
 * The screen never shows an empty state: it starts on the bundled sample
 * titles and swaps them for live data the moment it arrives. A short first
 * attempt distinguishes "server is asleep" from "server is broken" — a
 * timeout means it's booting, so we say so and keep retrying with a long
 * timeout instead of surfacing a scary error.
 */
export function useHomeFeed() {
  const [trending, setTrending] = useState<DisplayCard[]>(sampleTrending);
  const [lowCommitment, setLowCommitment] = useState<DisplayCard[]>(sampleLowCommitment);
  const [spotlight, setSpotlight] = useState<Spotlight>(null);

  const [status, setStatus] = useState<FeedStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [usingSamples, setUsingSamples] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Guards against a slow in-flight attempt resolving after the component
  // unmounts, or after a newer manual refresh has superseded it.
  const runId = useRef(0);

  const apply = useCallback((feed: Awaited<ReturnType<typeof api.homeFeed>>) => {
    setTrending(feed.trending.map(fromApi));
    setLowCommitment(feed.lowCommitment.map(fromApi));
    setSpotlight(
      feed.spotlight
        ? { ...feed.spotlight, movies: feed.spotlight.movies.map(fromApi) }
        : null,
    );
    setUsingSamples(false);
    setStatus("ready");
    setError(null);
  }, []);

  const load = useCallback(
    async (isRefresh = false) => {
      const id = ++runId.current;
      if (isRefresh) setRefreshing(true);
      else if (status !== "ready") setStatus("loading");
      setError(null);

      // Attempt 1: short. If this times out the host is almost certainly
      // asleep rather than down.
      try {
        const feed = await api.homeFeed(DEFAULT_TIMEOUT_MS);
        if (id !== runId.current) return;
        apply(feed);
        return;
      } catch (e) {
        if (id !== runId.current) return;
        const timedOut = e instanceof ApiError && e.timedOut;
        if (!timedOut) {
          // A real failure — refused, DNS, 5xx. Keep the samples up.
          setError(e instanceof Error ? e.message : "Couldn't reach Scenewise");
          setStatus("error");
          setRefreshing(false);
          return;
        }
      }

      // Cold start: tell the user what's happening and wait it out.
      if (id !== runId.current) return;
      setStatus("waking");

      for (let attempt = 1; attempt <= MAX_COLD_START_ATTEMPTS; attempt++) {
        try {
          const feed = await api.homeFeed(COLD_START_TIMEOUT_MS);
          if (id !== runId.current) return;
          apply(feed);
          setRefreshing(false);
          return;
        } catch (e) {
          if (id !== runId.current) return;
          if (attempt === MAX_COLD_START_ATTEMPTS) {
            setError(
              e instanceof Error && !(e as ApiError).timedOut
                ? e.message
                : "The server didn't wake up in time",
            );
            setStatus("error");
            setRefreshing(false);
          }
        }
      }
    },
    [apply, status],
  );

  useEffect(() => {
    load();
    // Intentionally once on mount — `load` reads status, and re-running on
    // every status change would restart the request loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(() => load(true), [load]);

  return {
    trending,
    lowCommitment,
    spotlight,
    status,
    error,
    usingSamples,
    refreshing,
    refresh,
  };
}

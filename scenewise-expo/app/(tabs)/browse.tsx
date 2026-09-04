import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Search as SearchIcon, Star } from "lucide-react-native";
import { api, ApiError, type TmdbMovieSummary } from "@/lib/api";
import { ErrorBanner } from "@/components/ErrorBanner";
import { sampleTrending } from "@/lib/cards";
import { colors } from "@/lib/theme";

export default function Browse() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbMovieSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navigatingId, setNavigatingId] = useState<number | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  // A timeout means the host is likely asleep and booting, not broken.
  const [waking, setWaking] = useState(false);

  const loadTrending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { results } = await api.trendingMovies();
      setResults(results);
      setUsingFallback(false);
      setWaking(false);
    } catch (e: any) {
      // Fall back to the bundled sample titles so the screen stays usable
      // offline; the banner says why they're there.
      setError(e.message || "Couldn't load trending movies");
      setWaking(e instanceof ApiError && e.timedOut);
      setResults([]);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(async (term: string) => {
    setLoading(true);
    setError(null);
    try {
      const { results } = await api.searchMovies(term);
      setResults(results);
      setUsingFallback(false);
      setWaking(false);
    } catch (e: any) {
      setError(e.message || "Search failed");
      setWaking(e instanceof ApiError && e.timedOut);
      setResults([]);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  // Debounced search — falls back to trending when the query is cleared.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      loadTrending();
      return;
    }
    const handle = setTimeout(() => search(trimmed), 400);
    return () => clearTimeout(handle);
  }, [query, loadTrending, search]);

  const retry = () => {
    const trimmed = query.trim();
    if (trimmed) {
      search(trimmed);
    } else {
      loadTrending();
    }
  };

  const openMovie = async (movie: TmdbMovieSummary) => {
    setNavigatingId(movie.tmdbId);
    try {
      const { movie: registered } = await api.registerMovie(movie.tmdbId);
      router.push(`/movie/${registered._id}`);
    } catch (e: any) {
      setError(e.message || "Couldn't open that movie");
    } finally {
      setNavigatingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 pt-5 bg-background">
      <View className="px-5 pt-4">
        <Text className="font-display text-2xl text-primary">Browse</Text>
        <View className="mt-4 flex-row items-center gap-2 rounded-2xl border border-border bg-secondary/50 px-4 py-3">
          <SearchIcon size={16} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search movies…"
            placeholderTextColor={colors.mutedForeground + "60"}
            returnKeyType="search"
            accessibilityLabel="Search movies"
            className="flex-1 font-sans text-foreground"
          />
        </View>
        {!query.trim() && (
          <Text className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
            Trending this week
          </Text>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : usingFallback ? (
        // Offline: keep the sample titles on screen with an explanatory
        // banner, rather than replacing the whole tab with an error.
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {waking ? (
            <ErrorBanner variant="waking" message="Waking the server up…" />
          ) : (
            <ErrorBanner message={error || "Couldn't reach Scenewise"} onRetry={retry} />
          )}
          <View className="mt-4 gap-3 px-5">
            {sampleTrending.map((m) => (
              <Pressable
                key={m.key}
                onPress={() => m.sampleId && router.push(`/title/${m.sampleId}`)}
                accessibilityRole="button"
                accessibilityLabel={`${m.title}, ${m.year}`}
                className="flex-row items-center gap-3.5 rounded-2xl border border-border bg-card/70 p-3 active:opacity-70"
              >
                <Image
                  source={m.poster}
                  className="h-[92px] w-[62px] rounded-xl"
                  resizeMode="cover"
                />
                <View className="min-w-0 flex-1">
                  <Text className="font-sans-medium text-foreground" numberOfLines={2}>
                    {m.title}
                  </Text>
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    {[m.runtimeLabel, m.year, m.genres[0]].filter(Boolean).join(" · ")}
                  </Text>
                  <Text className="mt-1.5 text-[11px] text-muted-foreground">
                    Sample title
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.tmdbId)}
          contentContainerStyle={{ padding: 20, gap: 12, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <Text className="text-center text-sm text-muted-foreground">
                {query.trim() ? `No movies found for "${query.trim()}"` : "No movies to show"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openMovie(item)}
              disabled={navigatingId === item.tmdbId}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${item.releaseDate?.slice(0, 4) || "unknown year"}, rated ${item.tmdbVoteAverage.toFixed(1)} on TMDB`}
              className="flex-row items-center gap-3.5 rounded-2xl border border-border bg-card/70 p-3 active:opacity-70"
              style={{ opacity: navigatingId === item.tmdbId ? 0.5 : 1 }}
            >
              {item.posterUrl ? (
                <Image
                  source={{ uri: item.posterUrl }}
                  className="h-[92px] w-[62px] rounded-xl"
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View className="h-[92px] w-[62px] rounded-xl bg-secondary" />
              )}
              <View className="min-w-0 flex-1">
                <Text className="font-sans-medium text-foreground" numberOfLines={2}>
                  {item.title}
                </Text>
                <Text className="mt-0.5 text-xs text-muted-foreground">
                  {item.releaseDate?.slice(0, 4) || "—"}
                  {item.genres.length ? ` · ${item.genres.slice(0, 2).join(", ")}` : ""}
                </Text>
                <View className="mt-1.5 flex-row items-center gap-1">
                  <Star size={12} color={colors.primary} fill={colors.primary} />
                  <Text className="text-xs text-muted-foreground">
                    {item.tmdbVoteAverage.toFixed(1)} on TMDB
                  </Text>
                </View>
              </View>
              {navigatingId === item.tmdbId && (
                <ActivityIndicator color={colors.primary} size="small" />
              )}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Heart, Sparkles } from "lucide-react-native";
import { api, type Movie, type Review, type ShelfEntry } from "@/lib/api";
import { fromApi, type DisplayCard } from "@/lib/cards";
import { useOpenMovie } from "@/lib/useOpenMovie";
import { RatingStars } from "@/components/RatingStars";
import { Tag } from "@/components/Tag";
import { DeveloperCard } from "@/components/DeveloperCard";
import { colors } from "@/lib/theme";

const TABS = [
  { key: "foryou", label: "For you" },
  { key: "shelf", label: "Shelf" },
  { key: "reviews", label: "Reviews" },
  { key: "likes", label: "Likes" },
] as const;

// A starting set so the row is populated before the live genre list arrives.
const FALLBACK_GENRES = [
  "Action",
  "Comedy",
  "Drama",
  "Horror",
  "Science Fiction",
  "Romance",
  "Thriller",
  "Animation",
];

export default function Profile() {
  const router = useRouter();
  const { open, openingKey } = useOpenMovie();

  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("foryou");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [shelf, setShelf] = useState<ShelfEntry[]>([]);
  const [reviews, setReviews] = useState<(Review & { movie: Movie })[]>([]);
  const [likes, setLikes] = useState<Movie[]>([]);

  // "For you" — genre-led recommendations, so there's always something to
  // scroll even for a brand new device with an empty shelf.
  const [genres, setGenres] = useState<string[]>(FALLBACK_GENRES);
  const [activeGenre, setActiveGenre] = useState<string>(FALLBACK_GENRES[0]!);
  const [recommendations, setRecommendations] = useState<DisplayCard[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);
  const [recsError, setRecsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [shelfRes, reviewsRes, likesRes] = await Promise.all([
        api.myShelf(),
        api.myReviews(),
        api.myLikes(),
      ]);
      setShelf(shelfRes.shelf);
      setReviews(reviewsRes.reviews);
      setLikes(likesRes.movies);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live genre list, falling back to the built-in set if it can't load.
  useEffect(() => {
    api
      .genres()
      .then(({ genres }) => {
        if (genres?.length) setGenres(genres);
      })
      .catch(() => {});
  }, []);

  const loadRecommendations = useCallback(async (genre: string) => {
    setRecsLoading(true);
    setRecsError(null);
    try {
      const { results } = await api.discover({
        genres: [genre],
        minRating: 6.5,
        sortBy: "popularity.desc",
      });
      setRecommendations(results.map(fromApi));
    } catch (e: any) {
      setRecsError(e?.message || "Couldn't load recommendations");
      setRecommendations([]);
    } finally {
      setRecsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendations(activeGenre);
  }, [activeGenre, loadRecommendations]);

  return (
    <SafeAreaView className="flex-1 bg-background pt-3">
      <View className="px-5 pt-4">
        <Text className="font-display text-2xl text-primary">Your profile</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
          contentContainerStyle={{ gap: 6 }}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className="rounded-full border px-4 py-2"
                style={{
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : "rgba(255,255,255,0.05)",
                }}
              >
                <Text
                  className="text-xs font-sans-semibold"
                  style={{ color: active ? colors.primaryForeground : colors.mutedForeground }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 16, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
                loadRecommendations(activeGenre);
              }}
              tintColor={colors.primary}
            />
          }
        >
          {tab === "foryou" && (
            <>
              <View className="flex-row items-center gap-2">
                <Sparkles size={14} color={colors.primary} />
                <Text className="text-xs font-sans-semibold uppercase tracking-widest text-primary">
                  Pick a genre
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
              >
                {genres.map((g) => {
                  const active = activeGenre === g;
                  return (
                    <Pressable
                      key={g}
                      onPress={() => setActiveGenre(g)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      className="rounded-full border px-3.5 py-2"
                      style={{
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active
                          ? "rgba(217,185,106,0.15)"
                          : "rgba(255,255,255,0.04)",
                      }}
                    >
                      <Text
                        className="text-xs font-sans-medium"
                        style={{ color: active ? colors.primary : colors.foreground }}
                      >
                        {g}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {recsLoading ? (
                <View className="items-center py-12">
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : recsError ? (
                <View className="items-center rounded-2xl border border-dashed border-border py-10">
                  <Text className="px-8 text-center text-sm text-muted-foreground">
                    {recsError}
                  </Text>
                </View>
              ) : recommendations.length === 0 ? (
                <EmptyState text={`Nothing to show for ${activeGenre} right now.`} />
              ) : (
                <View className="gap-3">
                  {recommendations.map((card) => (
                    <Pressable
                      key={card.key}
                      onPress={() => open(card)}
                      disabled={openingKey === card.key}
                      accessibilityRole="button"
                      accessibilityLabel={`${card.title}, ${card.year}`}
                      className="flex-row items-center gap-3.5 rounded-2xl border border-border bg-card/70 p-3 active:opacity-70"
                      style={{ opacity: openingKey === card.key ? 0.5 : 1 }}
                    >
                      <Image
                        source={card.poster}
                        className="h-[74px] w-[52px] rounded-xl"
                        resizeMode="cover"
                      />
                      <View className="min-w-0 flex-1">
                        <Text className="font-sans-medium text-foreground" numberOfLines={1}>
                          {card.title}
                        </Text>
                        <Text
                          className="mt-0.5 text-xs text-muted-foreground"
                          numberOfLines={1}
                        >
                          {[card.runtimeLabel, card.year, card.certification]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      </View>
                      {openingKey === card.key ? (
                        <ActivityIndicator color={colors.primary} size="small" />
                      ) : card.score != null ? (
                        <Text className="font-display text-base text-primary">
                          {card.score}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              )}

              <View className="mt-4">
                <DeveloperCard />
              </View>
            </>
          )}

          {tab === "shelf" &&
            (shelf.length === 0 ? (
              <EmptyState text="Nothing on your shelf yet — add a movie from its detail page." />
            ) : (
              shelf.map((entry) => (
                <MovieRow
                  key={entry._id}
                  movie={entry.movie}
                  subtitle={shelfLabel(entry.status)}
                  onPress={() => router.push(`/movie/${entry.movie._id}`)}
                />
              ))
            ))}

          {tab === "reviews" &&
            (reviews.length === 0 ? (
              <EmptyState text="You haven't reviewed anything yet." />
            ) : (
              reviews.map((r) => (
                <View key={r._id} className="rounded-2xl border border-border bg-card/70 p-3">
                  <Pressable
                    onPress={() => router.push(`/movie/${r.movie._id}`)}
                    className="flex-row items-center gap-3"
                  >
                    <Image
                      source={{ uri: r.movie.posterUrl }}
                      className="h-[70px] w-[50px] rounded-xl"
                      resizeMode="cover"
                    />
                    <View className="min-w-0 flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text
                          className="shrink font-sans-medium text-foreground"
                          numberOfLines={1}
                        >
                          {r.movie.title}
                        </Text>
                        <Tag variant="scenewise" className="px-2 py-0.5">
                          Scenewise
                        </Tag>
                      </View>
                      <View className="mt-1">
                        {r.rating == null ? (
                          <Text className="text-xs text-muted-foreground">No rating</Text>
                        ) : (
                          <RatingStars value={r.rating} size={13} />
                        )}
                      </View>
                    </View>
                  </Pressable>
                  {r.text ? (
                    <Text className="mt-2 text-sm text-muted-foreground">{r.text}</Text>
                  ) : null}
                </View>
              ))
            ))}

          {tab === "likes" &&
            (likes.length === 0 ? (
              <EmptyState text="Movies you like will show up here." />
            ) : (
              likes.map((movie) => (
                <MovieRow
                  key={movie._id}
                  movie={movie}
                  subtitle={
                    <View className="mt-1 flex-row items-center gap-1">
                      <Heart size={11} color={colors.destructive} fill={colors.destructive} />
                      <Text className="text-xs text-muted-foreground">Liked</Text>
                    </View>
                  }
                  onPress={() => router.push(`/movie/${movie._id}`)}
                />
              ))
            ))}

          {/* Always reachable, whichever tab you're on. */}
          {tab !== "foryou" && (
            <View className="mt-4">
              <DeveloperCard />
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function shelfLabel(status: ShelfEntry["status"]) {
  return { want_to_watch: "Want to watch", watching: "Watching", watched: "Watched" }[status];
}

function MovieRow({
  movie,
  subtitle,
  onPress,
}: {
  movie: Movie;
  subtitle: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-3.5 rounded-2xl border border-border bg-card/70 p-3 active:opacity-70"
    >
      <Image
        source={{ uri: movie.posterUrl }}
        className="h-[74px] w-[52px] rounded-xl"
        resizeMode="cover"
      />
      <View className="min-w-0 flex-1">
        <Text className="font-sans-medium text-foreground" numberOfLines={1}>
          {movie.title}
        </Text>
        {typeof subtitle === "string" ? (
          <Text className="mt-0.5 text-xs text-muted-foreground">{subtitle}</Text>
        ) : (
          subtitle
        )}
      </View>
    </Pressable>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-border py-10">
      <Text className="px-8 text-center text-sm text-muted-foreground">{text}</Text>
    </View>
  );
}

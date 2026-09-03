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
import { Heart } from "lucide-react-native";
import { api, type Movie, type Review, type ShelfEntry } from "@/lib/api";
import { RatingStars } from "@/components/RatingStars";
import { Tag } from "@/components/Tag";

const TABS = [
  { key: "shelf", label: "Shelf" },
  { key: "reviews", label: "Reviews" },
  { key: "likes", label: "Likes" },
] as const;

export default function Profile() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("shelf");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [shelf, setShelf] = useState<ShelfEntry[]>([]);
  const [reviews, setReviews] = useState<(Review & { movie: Movie })[]>([]);
  const [likes, setLikes] = useState<Movie[]>([]);

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

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <SafeAreaView className="flex-1 bg-background pt-3">
      <View className="px-5 pt-4">
        <Text className="font-display text-2xl text-primary">Your profile</Text>

        <View className="mt-4 flex-row rounded-full border border-border bg-secondary/40 p-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                className="flex-1 items-center rounded-full py-2"
                style={{ backgroundColor: active ? "#d9b96a" : "transparent" }}
              >
                <Text
                  className="text-xs font-sans-semibold"
                  style={{ color: active ? "#3a2e16" : "#b7ac9c" }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#d9b96a" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 16, gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d9b96a" />
          }
        >
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
                <View
                  key={r._id}
                  className="rounded-2xl border border-border bg-card/70 p-3"
                >
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
                      <Heart size={11} color="#d0574a" fill="#d0574a" />
                      <Text className="text-xs text-muted-foreground">Liked</Text>
                    </View>
                  }
                  onPress={() => router.push(`/movie/${movie._id}`)}
                />
              ))
            ))}
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
      className="flex-row items-center gap-3.5 rounded-2xl border border-border bg-card/70 p-3"
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

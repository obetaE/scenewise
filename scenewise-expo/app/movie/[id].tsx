import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Heart, Clock, Star, ExternalLink } from "lucide-react-native";
import { api, type Movie, type Review, type ShelfEntry } from "@/lib/api";
import { RatingStars } from "@/components/RatingStars";
import { ReviewCard } from "@/components/ReviewCard";

const SHELF_LABELS: Record<ShelfEntry["status"], string> = {
  want_to_watch: "Want to watch",
  watching: "Watching",
  watched: "Watched",
};

export default function MovieDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [likedByMe, setLikedByMe] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [shelfStatus, setShelfStatus] = useState<ShelfEntry["status"] | null>(null);
  const [providers, setProviders] = useState<{
    link: string | null;
    flatrate: string[];
    rent: string[];
    buy: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [myRating, setMyRating] = useState(0);
  const [myText, setMyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [{ movie, likedByMe }, { reviews, totalReviews }] = await Promise.all([
        api.getMovie(id),
        api.movieReviews(id),
      ]);
      setMovie(movie);
      setLikedByMe(likedByMe);
      setReviews(reviews);
      setTotalReviews(totalReviews);
      setReviewPage(1);

      // Watch providers is a nice-to-have — don't block the screen on it.
      api.watchProviders(id).then(({ providers }) => setProviders(providers)).catch(() => {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleLike = async () => {
    if (!movie) return;
    const prev = likedByMe;
    setLikedByMe(!prev); // optimistic
    try {
      const { liked, likesCount } = await api.toggleLike(movie._id);
      setLikedByMe(liked);
      setMovie((m) => (m ? { ...m, likesCount } : m));
    } catch {
      setLikedByMe(prev); // revert on failure
    }
  };

  const chooseShelf = async (status: ShelfEntry["status"]) => {
    if (!movie) return;
    setShelfStatus(status);
    try {
      await api.setShelfStatus(movie._id, status);
    } catch {
      setShelfStatus(null);
    }
  };

  const submitReview = async () => {
    if (!movie || myRating === 0) return;
    setSubmitting(true);
    try {
      await api.submitReview(movie._id, myRating, myText);
      const { reviews, totalReviews } = await api.movieReviews(movie._id);
      setReviews(reviews);
      setTotalReviews(totalReviews);
      setReviewPage(1);
      const fresh = await api.getMovie(movie._id);
      setMovie(fresh.movie);
      setMyText("");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const loadMoreReviews = async () => {
    if (!movie || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = reviewPage + 1;
      const { reviews: more, totalReviews } = await api.movieReviews(movie._id, next);
      setReviews((prev) => [...prev, ...more]);
      setTotalReviews(totalReviews);
      setReviewPage(next);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading || !movie) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#d9b96a" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ height: 320 }} className="relative">
          <Image
            source={{ uri: movie.backdropUrl || movie.posterUrl }}
            className="absolute inset-0 h-full w-full"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/40" />

          <SafeAreaView edges={["top"]} className="absolute inset-x-0 top-0">
            <View className="flex-row items-center justify-between p-4">
              <Pressable
                onPress={() => router.back()}
                className="rounded-full bg-black/45 p-2.5"
              >
                <ArrowLeft size={16} color="#f5f4f2" />
              </Pressable>
              <Pressable
                onPress={toggleLike}
                className="rounded-full bg-black/45 p-2.5"
              >
                <Heart
                  size={16}
                  color={likedByMe ? "#d0574a" : "#f5f4f2"}
                  fill={likedByMe ? "#d0574a" : "transparent"}
                />
              </Pressable>
            </View>
          </SafeAreaView>

          <View className="absolute inset-x-5 bottom-5">
            <Text className="text-xs font-sans-semibold uppercase tracking-wide text-primary">
              {movie.genres.join(" · ")}
            </Text>
            <Text className="mt-1.5 font-display text-3xl leading-tight text-foreground">
              {movie.title}
            </Text>
            <View className="mt-1.5 flex-row items-center gap-3">
              <Text className="text-sm text-muted-foreground">
                {movie.releaseDate?.slice(0, 4) || "—"}
                {movie.runtime ? ` · ${movie.runtime}m` : ""}
              </Text>
              {movie.likesCount > 0 && (
                <View className="flex-row items-center gap-1">
                  <Heart size={11} color="#d0574a" fill="#d0574a" />
                  <Text className="text-xs text-muted-foreground">{movie.likesCount}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Ratings summary */}
        <View className="mt-5 flex-row gap-3 px-5">
          <View className="flex-1 rounded-2xl border border-border bg-card p-4">
            <Text className="text-xs text-muted-foreground">Scenewise rating</Text>
            <View className="mt-1.5 flex-row items-center gap-2">
              <Text className="font-display text-xl text-primary">
                {movie.avgRating > 0 ? movie.avgRating.toFixed(1) : "—"}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {movie.ratingsCount} {movie.ratingsCount === 1 ? "review" : "reviews"}
              </Text>
            </View>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-card p-4">
            <Text className="text-xs text-muted-foreground">TMDB rating</Text>
            <View className="mt-1.5 flex-row items-center gap-1.5">
              <Star size={14} color="#d9b96a" fill="#d9b96a" />
              <Text className="font-display text-xl text-foreground">
                {movie.tmdbVoteAverage.toFixed(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Overview */}
        <View className="mt-6 px-5">
          <Text className="text-sm font-sans-semibold text-foreground">Overview</Text>
          <Text className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {movie.overview || "No overview available."}
          </Text>
        </View>

        {/* Add to profile */}
        <View className="mt-6 px-5">
          <Text className="text-sm font-sans-semibold text-foreground">Add to profile</Text>
          <View className="mt-3 flex-row gap-2">
            {(Object.keys(SHELF_LABELS) as ShelfEntry["status"][]).map((status) => {
              const active = shelfStatus === status;
              return (
                <Pressable
                  key={status}
                  onPress={() => chooseShelf(status)}
                  className="flex-1 items-center rounded-full border py-2.5"
                  style={{
                    borderColor: active ? "#d9b96a" : "rgba(255,255,255,0.1)",
                    backgroundColor: active ? "#d9b96a" : "rgba(255,255,255,0.05)",
                  }}
                >
                  <Text
                    className="text-xs font-sans-medium"
                    style={{ color: active ? "#3a2e16" : "#f5f4f2" }}
                  >
                    {SHELF_LABELS[status]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Where to watch */}
        {providers && (providers.flatrate.length || providers.rent.length || providers.buy.length) ? (
          <View className="mt-6 px-5">
            <Text className="text-sm font-sans-semibold text-foreground">Where to watch</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {[...providers.flatrate, ...providers.rent, ...providers.buy].map((name) => (
                <View
                  key={name}
                  className="rounded-full border border-border bg-secondary/50 px-3 py-1.5"
                >
                  <Text className="text-xs text-foreground">{name}</Text>
                </View>
              ))}
            </View>
            {providers.link && (
              <View className="mt-2 flex-row items-center gap-1.5">
                <ExternalLink size={12} color="#b7ac9c" />
                <Text className="text-xs text-muted-foreground">Data via TMDB / JustWatch</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Leave a review */}
        <View className="mt-7 px-5">
          <Text className="text-sm font-sans-semibold text-foreground">Rate this movie</Text>
          <View className="mt-3 rounded-2xl border border-border bg-card p-4">
            <RatingStars value={myRating} onChange={setMyRating} size={26} />
            <TextInput
              value={myText}
              onChangeText={setMyText}
              placeholder="Write a review (optional)…"
              placeholderTextColor="#7a716660"
              multiline
              className="mt-3 min-h-[80px] rounded-xl border border-border bg-background p-3 text-sm text-foreground"
              style={{ color: "#fafaf8", textAlignVertical: "top" }}
            />
            <Pressable
              onPress={submitReview}
              disabled={myRating === 0 || submitting}
              className="mt-3 items-center rounded-full bg-primary py-3"
              style={{ opacity: myRating === 0 || submitting ? 0.4 : 1 }}
            >
              <Text className="text-sm font-sans-semibold text-primary-foreground">
                {submitting ? "Posting…" : "Post review"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Reviews list */}
        <View className="mt-7 px-5">
          <Text className="text-sm font-sans-semibold text-foreground">
            {totalReviews ? `Reviews (${totalReviews})` : "No reviews yet"}
          </Text>
          <View className="mt-3 gap-3">
            {reviews.map((r) => (
              <ReviewCard key={r._id} review={r} />
            ))}
          </View>
          {reviews.length < totalReviews ? (
            <Pressable
              onPress={loadMoreReviews}
              disabled={loadingMore}
              className="mt-3 items-center rounded-full border border-border bg-secondary/50 py-3"
            >
              <Text className="text-xs font-sans-semibold text-foreground">
                {loadingMore ? "Loading…" : "Load more reviews"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

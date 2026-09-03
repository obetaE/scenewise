import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Search, SlidersHorizontal, Clock, X } from "lucide-react-native";
import { api, type DiscoverFilters } from "@/lib/api";
import {
  fromApi,
  sampleTrending,
  sampleLowCommitment,
  type DisplayCard,
} from "@/lib/cards";
import { useOpenMovie } from "@/lib/useOpenMovie";
import { MatchRing } from "@/components/MatchRing";
import { Tag } from "@/components/Tag";
import { ErrorBanner } from "@/components/ErrorBanner";
import { MovieFilterSheet } from "@/components/MovieFilterSheet";
import { WatchDecisionQuiz } from "@/components/WatchDecisionQuiz";
import { colors } from "@/lib/theme";

export default function Home() {
  const router = useRouter();
  const { open, openingKey } = useOpenMovie();

  const [quizOpen, setQuizOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [trending, setTrending] = useState<DisplayCard[]>([]);
  const [lowCommitment, setLowCommitment] = useState<DisplayCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When set, the live rows are replaced by a single filtered row.
  const [filters, setFilters] = useState<DiscoverFilters | null>(null);
  const [filtered, setFiltered] = useState<DisplayCard[] | null>(null);
  const [filtering, setFiltering] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const feed = await api.homeFeed();
      setTrending(feed.trending.map(fromApi));
      setLowCommitment(feed.lowCommitment.map(fromApi));
    } catch (e: any) {
      // Keep the built-in sample titles on screen rather than emptying the
      // home page — the banner explains why they're there.
      setError(e?.message || "Couldn't reach Scenewise");
      setTrending(sampleTrending);
      setLowCommitment(sampleLowCommitment);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilters = async (next: DiscoverFilters) => {
    setFiltersOpen(false);
    setFilters(next);
    setFiltering(true);
    try {
      const { results } = await api.discover(next);
      setFiltered(results.map(fromApi));
    } catch (e: any) {
      setError(e?.message || "Couldn't apply those filters");
      setFiltered([]);
    } finally {
      setFiltering(false);
    }
  };

  const clearFilters = () => {
    setFilters(null);
    setFiltered(null);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 pt-2 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-4">
          <View className="flex-row items-center gap-2.5">
            <Image
              source={require("../../assets/logo.png")}
              style={{ width: 34, height: 34 }}
              resizeMode="contain"
            />
            <View>
              <Text className="text-xs font-sans-medium uppercase tracking-widest text-muted-foreground">
                Tonight
              </Text>
              <Text className="mt-1 font-display text-2xl text-primary">Scenewise</Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => router.push("/browse")}
              accessibilityRole="button"
              accessibilityLabel="Search movies"
              className="rounded-full border border-border bg-secondary/50 p-2.5 active:opacity-70"
            >
              <Search size={16} color={colors.secondaryForeground} />
            </Pressable>
            <Pressable
              onPress={() => setFiltersOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Filter movies"
              className="rounded-full border p-2.5 active:opacity-70"
              style={{
                borderColor: filters ? colors.primary : colors.border,
                backgroundColor: filters ? colors.primary : "rgba(255,255,255,0.06)",
              }}
            >
              <SlidersHorizontal
                size={16}
                color={filters ? colors.primaryForeground : colors.secondaryForeground}
              />
            </Pressable>
          </View>
        </View>

        {error ? (
          <ErrorBanner
            message={error}
            onRetry={() => {
              setRefreshing(true);
              load();
            }}
            retrying={refreshing}
          />
        ) : null}

        <Text className="mt-5 px-5 text-sm leading-relaxed text-muted-foreground">
          Know the pacing, the intensity and the warnings before you press play. No
          spoilers, ever.
        </Text>

        <Pressable
          onPress={() => setQuizOpen(true)}
          accessibilityRole="button"
          className="mx-5 mt-4 flex-row items-center justify-between rounded-2xl bg-primary px-5 py-3.5 active:opacity-80"
        >
          <Text className="text-sm font-sans-semibold text-primary-foreground">
            {`Can't decide? Take the 30-second quiz`}
          </Text>
          <Text className="text-lg leading-none text-primary-foreground">→</Text>
        </Pressable>

        {filtered ? (
          <FilteredSection
            cards={filtered}
            loading={filtering}
            onClear={clearFilters}
            onOpen={open}
            openingKey={openingKey}
          />
        ) : (
          <>
            {/* Trending now */}
            <View className="mt-8">
              <View className="flex-row items-baseline justify-between px-5">
                <Text className="font-display text-lg text-foreground">Trending now</Text>
                <Text className="text-xs text-muted-foreground">Swipe</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
                className="mt-4"
              >
                {trending.map((m) => (
                  <PosterCard
                    key={m.key}
                    card={m}
                    busy={openingKey === m.key}
                    onPress={() => open(m)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Low-commitment picks */}
            <View className="mt-9 px-5">
              <Text className="font-display text-lg text-foreground">
                Low-commitment picks
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                Shorter runtimes, if you haven&apos;t got all evening.
              </Text>
              <View className="mt-4 gap-3">
                {lowCommitment.map((m) => (
                  <RowCard
                    key={m.key}
                    card={m}
                    busy={openingKey === m.key}
                    onPress={() => open(m)}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <MovieFilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={applyFilters}
        initial={filters ?? undefined}
      />
      <WatchDecisionQuiz open={quizOpen} onClose={() => setQuizOpen(false)} />
    </SafeAreaView>
  );
}

function FilteredSection({
  cards,
  loading,
  onClear,
  onOpen,
  openingKey,
}: {
  cards: DisplayCard[];
  loading: boolean;
  onClear: () => void;
  onOpen: (c: DisplayCard) => void;
  openingKey: string | null;
}) {
  return (
    <View className="mt-8 px-5">
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-lg text-foreground">Filtered results</Text>
        <Pressable
          onPress={onClear}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear filters"
          className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5 active:opacity-70"
        >
          <X size={12} color={colors.mutedForeground} />
          <Text className="text-[11px] font-sans-medium text-muted-foreground">Clear</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : cards.length === 0 ? (
        <View className="mt-4 items-center rounded-2xl border border-dashed border-border py-10">
          <Text className="px-8 text-center text-sm text-muted-foreground">
            Nothing matched those filters. Try widening them.
          </Text>
        </View>
      ) : (
        <View className="mt-4 gap-3">
          {cards.map((m) => (
            <RowCard
              key={m.key}
              card={m}
              busy={openingKey === m.key}
              onPress={() => onOpen(m)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function PosterCard({
  card,
  busy,
  onPress,
}: {
  card: DisplayCard;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${card.title}, ${card.year}`}
      className="relative w-[248px] overflow-hidden rounded-3xl"
      style={{ aspectRatio: 2 / 3, opacity: busy ? 0.6 : 1 }}
    >
      <Image source={card.poster} className="absolute inset-0 h-full w-full" resizeMode="cover" />
      <View className="absolute inset-0 bg-black/25" />

      {card.score != null && (
        <View className="absolute right-3 top-3 flex-row items-center gap-2 rounded-2xl bg-black/45 px-2.5 py-2">
          <MatchRing value={card.score} size={40} />
          <Text className="pr-1 text-[10px] font-sans-medium leading-tight text-foreground/85">
            {card.isSample ? "Will I\nlike this" : "Audience\nscore"}
          </Text>
        </View>
      )}

      <View className="absolute inset-x-3 bottom-3 rounded-2xl bg-black/55 p-3.5">
        <Text className="text-xs font-sans-semibold uppercase tracking-wide text-primary">
          {card.genres.slice(0, 2).join(" · ") || "—"}
        </Text>
        <Text
          className="mt-1 font-display text-lg leading-snug text-foreground"
          numberOfLines={1}
        >
          {card.title}
        </Text>
        <View className="mt-1 flex-row items-center gap-3">
          {card.runtimeLabel ? (
            <View className="flex-row items-center gap-1">
              <Clock size={11} color={colors.mutedForeground} />
              <Text className="text-[11px] text-muted-foreground">{card.runtimeLabel}</Text>
            </View>
          ) : null}
          <Text className="text-[11px] text-muted-foreground">{card.year}</Text>
        </View>
        {card.certification ? (
          <View className="mt-2.5 flex-row flex-wrap gap-1.5">
            <Tag variant="neutral" className="px-2 py-0.5">
              {card.certification}
            </Tag>
          </View>
        ) : null}
      </View>

      {busy && (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </Pressable>
  );
}

function RowCard({
  card,
  busy,
  onPress,
}: {
  card: DisplayCard;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${card.title}, ${card.year}`}
      className="flex-row items-center gap-3.5 rounded-2xl border border-border bg-card/70 p-3 active:opacity-70"
      style={{ opacity: busy ? 0.6 : 1 }}
    >
      <Image source={card.poster} className="h-[74px] w-[52px] rounded-xl" resizeMode="cover" />
      <View className="min-w-0 flex-1">
        <Text className="font-sans-medium text-foreground" numberOfLines={1}>
          {card.title}
        </Text>
        <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
          {[card.runtimeLabel, card.year, card.genres[0]].filter(Boolean).join(" · ")}
        </Text>
        {card.certification ? (
          <View className="mt-1.5 flex-row gap-1.5">
            <Tag variant="neutral" className="px-2 py-0.5">
              {card.certification}
            </Tag>
          </View>
        ) : null}
      </View>
      {busy ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : card.score != null ? (
        <MatchRing value={card.score} size={42} />
      ) : null}
    </Pressable>
  );
}

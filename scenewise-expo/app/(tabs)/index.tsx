import { useState } from "react";
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
import { fromApi, type DisplayCard } from "@/lib/cards";
import { useOpenMovie } from "@/lib/useOpenMovie";
import { useHomeFeed } from "@/lib/useHomeFeed";
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

  // Starts on the bundled sample titles and swaps to live data when it
  // arrives, so the screen is never blank — even while a sleeping backend
  // boots. See lib/useHomeFeed.ts for the cold-start handling.
  const {
    trending,
    lowCommitment,
    spotlight,
    status,
    error,
    usingSamples,
    refreshing,
    refresh,
  } = useHomeFeed();

  // When set, the live rows are replaced by a single filtered row.
  const [filters, setFilters] = useState<DiscoverFilters | null>(null);
  const [filtered, setFiltered] = useState<DisplayCard[] | null>(null);
  const [filtering, setFiltering] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);

  const applyFilters = async (next: DiscoverFilters) => {
    setFiltersOpen(false);
    setFilters(next);
    setFiltering(true);
    try {
      const { results } = await api.discover(next);
      setFiltered(results.map(fromApi));
    } catch (e: any) {
      setFilterError(e?.message || "Couldn't apply those filters");
      setFiltered([]);
    } finally {
      setFiltering(false);
    }
  };

  const clearFilters = () => {
    setFilters(null);
    setFiltered(null);
    setFilterError(null);
  };

  // No blocking spinner: the sample titles render immediately and are
  // replaced in place once the live feed lands.
  return (
    <SafeAreaView className="flex-1 pt-2 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
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

        {status === "waking" ? (
          <ErrorBanner variant="waking" message="Waking the server up…" />
        ) : filterError ? (
          <ErrorBanner message={filterError} onRetry={clearFilters} />
        ) : error ? (
          <ErrorBanner message={error} onRetry={refresh} retrying={refreshing} />
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
                <Text className="font-display text-lg text-foreground">
                  {usingSamples ? "Sample titles" : "Trending now"}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {usingSamples ? "Preview" : "Swipe"}
                </Text>
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

            {/* Rotating collection — box office hits, classics, new releases… */}
            {spotlight && spotlight.movies.length > 0 ? (
              <View className="mt-9">
                <View className="px-5">
                  <Text className="font-display text-lg text-foreground">
                    {spotlight.title}
                  </Text>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    {spotlight.subtitle}
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
                  className="mt-4"
                >
                  {spotlight.movies.map((m) => (
                    <SpotlightCard
                      key={m.key}
                      card={m}
                      busy={openingKey === m.key}
                      onPress={() => open(m)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

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

function SpotlightCard({
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
      className="w-[132px]"
      style={{ opacity: busy ? 0.6 : 1 }}
    >
      <View className="overflow-hidden rounded-2xl" style={{ aspectRatio: 2 / 3 }}>
        <Image source={card.poster} className="h-full w-full" resizeMode="cover" />
        {busy && (
          <View className="absolute inset-0 items-center justify-center bg-black/40">
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
        )}
        {card.score != null && (
          <View className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5">
            <Text className="text-[10px] font-sans-semibold text-primary">
              {card.score}
            </Text>
          </View>
        )}
      </View>
      <Text className="mt-2 text-xs font-sans-medium text-foreground" numberOfLines={1}>
        {card.title}
      </Text>
      <Text className="mt-0.5 text-[11px] text-muted-foreground" numberOfLines={1}>
        {[card.year, card.runtimeLabel].filter(Boolean).join(" · ")}
      </Text>
    </Pressable>
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

import { useState } from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { X, SlidersHorizontal } from "lucide-react-native";
import type { DiscoverFilters } from "@/lib/api";
import { colors } from "@/lib/theme";

// Only genres TMDB actually defines — these names are mapped back to TMDB
// genre ids server-side, so an unknown label can't silently match nothing.
const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Science Fiction",
  "Thriller",
];

const RUNTIMES: { label: string; value: number | undefined }[] = [
  { label: "Any length", value: undefined },
  { label: "Under 90 min", value: 90 },
  { label: "Under 2 hours", value: 120 },
  { label: "Under 2½ hours", value: 150 },
];

const RATINGS: { label: string; value: number | undefined }[] = [
  { label: "Any rating", value: undefined },
  { label: "6+", value: 6 },
  { label: "7+", value: 7 },
  { label: "8+", value: 8 },
];

// US certifications, matching what the backend requests from TMDB.
const CERTS: { label: string; value: string | undefined }[] = [
  { label: "Any", value: undefined },
  { label: "G", value: "G" },
  { label: "PG", value: "PG" },
  { label: "PG-13", value: "PG-13" },
  { label: "R", value: "R" },
];

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className="rounded-full border px-3.5 py-2"
      style={{
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary : "rgba(255,255,255,0.06)",
      }}
    >
      <Text
        className="text-xs font-sans-medium"
        style={{ color: active ? colors.primaryForeground : colors.foreground }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function MovieFilterSheet({
  open,
  onClose,
  onApply,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (filters: DiscoverFilters) => void;
  initial?: DiscoverFilters;
}) {
  const [genres, setGenres] = useState<string[]>(initial?.genres ?? []);
  const [maxRuntime, setMaxRuntime] = useState<number | undefined>(initial?.maxRuntime);
  const [minRating, setMinRating] = useState<number | undefined>(initial?.minRating);
  const [certification, setCertification] = useState<string | undefined>(
    initial?.certification,
  );

  const toggleGenre = (g: string) =>
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const clear = () => {
    setGenres([]);
    setMaxRuntime(undefined);
    setMinRating(undefined);
    setCertification(undefined);
  };

  const activeCount =
    genres.length +
    (maxRuntime ? 1 : 0) +
    (minRating ? 1 : 0) +
    (certification ? 1 : 0);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/70" onPress={onClose} />
        <View className="rounded-t-[2rem] bg-[#2b2723] p-6 pb-9">
          <View className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />
          <Pressable
            onPress={onClose}
            className="absolute right-5 top-5 rounded-full p-2"
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close filters"
          >
            <X size={18} color={colors.mutedForeground} />
          </Pressable>

          <View className="flex-row items-center gap-2">
            <SlidersHorizontal size={14} color={colors.primary} />
            <Text className="text-xs font-sans-semibold uppercase tracking-widest text-primary">
              Filters
            </Text>
          </View>
          <Text className="mt-3 font-display text-2xl text-foreground">
            Narrow it down
          </Text>

          <ScrollView style={{ maxHeight: 380 }} className="mt-5">
            <Text className="text-xs font-sans-semibold text-muted-foreground">Genre</Text>
            <View className="mt-2.5 flex-row flex-wrap gap-2">
              {GENRES.map((g) => (
                <Chip
                  key={g}
                  label={g}
                  active={genres.includes(g)}
                  onPress={() => toggleGenre(g)}
                />
              ))}
            </View>

            <Text className="mt-5 text-xs font-sans-semibold text-muted-foreground">
              Length
            </Text>
            <View className="mt-2.5 flex-row flex-wrap gap-2">
              {RUNTIMES.map((r) => (
                <Chip
                  key={r.label}
                  label={r.label}
                  active={maxRuntime === r.value}
                  onPress={() => setMaxRuntime(r.value)}
                />
              ))}
            </View>

            <Text className="mt-5 text-xs font-sans-semibold text-muted-foreground">
              Minimum score
            </Text>
            <View className="mt-2.5 flex-row flex-wrap gap-2">
              {RATINGS.map((r) => (
                <Chip
                  key={r.label}
                  label={r.label}
                  active={minRating === r.value}
                  onPress={() => setMinRating(r.value)}
                />
              ))}
            </View>

            <Text className="mt-5 text-xs font-sans-semibold text-muted-foreground">
              Age rating
            </Text>
            <View className="mt-2.5 flex-row flex-wrap gap-2">
              {CERTS.map((c) => (
                <Chip
                  key={c.label}
                  label={c.label}
                  active={certification === c.value}
                  onPress={() => setCertification(c.value)}
                />
              ))}
            </View>
          </ScrollView>

          <View className="mt-6 flex-row gap-3">
            <Pressable
              onPress={clear}
              className="items-center rounded-full border border-border px-5 py-3.5 active:opacity-70"
              accessibilityRole="button"
            >
              <Text className="text-sm font-sans-medium text-muted-foreground">Clear</Text>
            </Pressable>
            <Pressable
              onPress={() => onApply({ genres, maxRuntime, minRating, certification })}
              className="flex-1 items-center rounded-full bg-primary py-3.5 active:opacity-80"
              accessibilityRole="button"
            >
              <Text className="text-sm font-sans-semibold text-primary-foreground">
                {activeCount ? `Show results (${activeCount})` : "Show results"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

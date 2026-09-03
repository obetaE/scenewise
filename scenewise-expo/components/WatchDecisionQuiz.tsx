import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { X, Sparkles, ArrowRight } from "lucide-react-native";
import { moodQuestions } from "@/lib/movies";
import { api } from "@/lib/api";
import { fromApi, sampleTrending, type DisplayCard } from "@/lib/cards";
import { useOpenMovie } from "@/lib/useOpenMovie";
import { MatchRing } from "./MatchRing";
import { colors } from "@/lib/theme";

// The quiz asks about mood in plain language; TMDB only understands genres
// and runtime. These maps are the translation layer — each answer becomes
// real discover parameters, so the picks are genuine matches rather than a
// local re-ranking of a fixed list.
const MOOD_GENRES: Record<string, string[]> = {
  Cozy: ["Family", "Comedy", "Romance"],
  Tense: ["Thriller", "Mystery"],
  Laugh: ["Comedy"],
  Awe: ["Science Fiction", "Adventure", "Fantasy"],
  Emotional: ["Drama"],
  Adrenaline: ["Action", "Thriller"],
};

const ENERGY_GENRES: Record<string, string[]> = {
  "Wind down": ["Comedy", "Family", "Romance"],
  Thoughtful: ["Drama", "Documentary", "Mystery"],
  Escape: ["Fantasy", "Science Fiction", "Adventure"],
  Alone: ["Drama", "Mystery"],
  "With friends": ["Comedy", "Action", "Adventure"],
};

const LENGTH_MAX_RUNTIME: Record<string, number | undefined> = {
  "Under 100 min": 100,
  "About two hours": 130,
  "All evening": undefined,
};

export function WatchDecisionQuiz({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { open: openMovie, openingKey } = useOpenMovie();

  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [results, setResults] = useState<DisplayCard[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = results !== null || loading || error !== null;
  const q = moodQuestions[Math.min(step, moodQuestions.length - 1)]!;
  const selected = picks[q.key] ?? [];
  const isLastStep = step === moodQuestions.length - 1;

  const toggle = (opt: string) =>
    setPicks((p) => {
      const cur = p[q.key] ?? [];
      return {
        ...p,
        [q.key]: cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt],
      };
    });

  const runQuiz = async (finalPicks: Record<string, string[]>) => {
    setLoading(true);
    setError(null);
    try {
      const genres = new Set<string>();
      (finalPicks.mood ?? []).forEach((m) =>
        (MOOD_GENRES[m] ?? []).forEach((g) => genres.add(g)),
      );
      (finalPicks.energy ?? []).forEach((e) =>
        (ENERGY_GENRES[e] ?? []).forEach((g) => genres.add(g)),
      );

      // Take the tightest length constraint the person chose.
      const runtimes = (finalPicks.length ?? [])
        .map((l) => LENGTH_MAX_RUNTIME[l])
        .filter((v): v is number => typeof v === "number");
      const maxRuntime = runtimes.length ? Math.min(...runtimes) : undefined;

      const { results } = await api.discover({
        genres: [...genres],
        maxRuntime,
        minRating: 6,
        sortBy: "popularity.desc",
      });
      setResults(results.map(fromApi));
    } catch (e: any) {
      setError(e?.message || "Couldn't fetch recommendations");
      // Still give them something to look at.
      setResults(sampleTrending.slice(0, 3));
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    if (isLastStep) {
      runQuiz(picks);
    } else {
      setStep((s) => s + 1);
    }
  };

  const reset = () => {
    setStep(0);
    setPicks({});
    setResults(null);
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/70" onPress={handleClose} />
        <View className="rounded-t-[2rem] bg-[#2b2723] p-6 pb-9">
          <View className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />
          <Pressable
            onPress={handleClose}
            className="absolute right-5 top-5 rounded-full p-2"
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close quiz"
          >
            <X size={18} color={colors.mutedForeground} />
          </Pressable>

          {!done ? (
            <>
              <View className="flex-row items-center gap-2">
                <Sparkles size={14} color={colors.primary} />
                <Text className="text-xs font-sans-semibold uppercase tracking-widest text-primary">
                  Watch decision · {step + 1}/{moodQuestions.length}
                </Text>
              </View>
              <Text className="mt-3 font-display text-2xl text-foreground">{q.prompt}</Text>

              <View className="mt-6 flex-row flex-wrap gap-2.5">
                {q.options.map((opt) => {
                  const on = selected.includes(opt);
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => toggle(opt)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      className="rounded-full border px-4 py-2.5"
                      style={{
                        borderColor: on ? colors.primary : colors.border,
                        backgroundColor: on ? colors.primary : "rgba(255,255,255,0.06)",
                      }}
                    >
                      <Text
                        className="text-sm font-sans-medium"
                        style={{ color: on ? colors.primaryForeground : colors.foreground }}
                      >
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={next}
                disabled={selected.length === 0}
                accessibilityRole="button"
                className="mt-8 flex-row items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5"
                style={{ opacity: selected.length === 0 ? 0.35 : 1 }}
              >
                <Text className="text-sm font-sans-semibold text-primary-foreground">
                  {isLastStep ? "See my pick" : "Continue"}
                </Text>
                <ArrowRight size={16} color={colors.primaryForeground} />
              </Pressable>
            </>
          ) : (
            <>
              <Text className="text-xs font-sans-semibold uppercase tracking-widest text-accent">
                Spoiler-free pick
              </Text>
              <Text className="mt-3 font-display text-2xl text-foreground">
                Watch this tonight
              </Text>

              {error ? (
                <Text className="mt-2 text-xs text-destructive">
                  {error} — showing sample titles instead.
                </Text>
              ) : null}

              {loading ? (
                <View className="items-center py-12">
                  <ActivityIndicator color={colors.primary} />
                  <Text className="mt-3 text-xs text-muted-foreground">
                    Finding your match…
                  </Text>
                </View>
              ) : (
                <ScrollView className="mt-5" style={{ maxHeight: 320 }}>
                  <View className="gap-3">
                    {(results ?? []).length === 0 ? (
                      <View className="items-center rounded-2xl border border-dashed border-border py-10">
                        <Text className="px-8 text-center text-sm text-muted-foreground">
                          Nothing matched that combination. Try fewer answers.
                        </Text>
                      </View>
                    ) : (
                      (results ?? []).slice(0, 5).map((card, i) => (
                        <Pressable
                          key={card.key}
                          onPress={() => {
                            handleClose();
                            openMovie(card);
                          }}
                          disabled={openingKey === card.key}
                          accessibilityRole="button"
                          accessibilityLabel={`${card.title}, ${card.year}`}
                          className="flex-row items-center gap-3 rounded-2xl border p-3"
                          style={{
                            borderColor:
                              i === 0 ? "rgba(217,185,106,0.4)" : colors.border,
                            backgroundColor:
                              i === 0
                                ? "rgba(217,185,106,0.05)"
                                : "rgba(255,255,255,0.03)",
                          }}
                        >
                          <Image source={card.poster} className="h-16 w-11 rounded-lg" />
                          <View className="min-w-0 flex-1">
                            <Text
                              className="text-sm font-sans-semibold text-foreground"
                              numberOfLines={1}
                            >
                              {card.title}
                            </Text>
                            <Text
                              className="text-xs text-muted-foreground"
                              numberOfLines={1}
                            >
                              {[card.runtimeLabel, card.year, card.certification]
                                .filter(Boolean)
                                .join(" · ")}
                            </Text>
                          </View>
                          {card.score != null && <MatchRing value={card.score} size={40} />}
                        </Pressable>
                      ))
                    )}
                  </View>
                </ScrollView>
              )}

              <Pressable
                onPress={reset}
                accessibilityRole="button"
                className="mt-6 items-center rounded-full border border-border py-3 active:opacity-70"
              >
                <Text className="text-sm font-sans-medium text-muted-foreground">
                  Start over
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

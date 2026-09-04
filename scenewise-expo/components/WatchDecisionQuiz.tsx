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
import { X, Sparkles, ArrowRight, ArrowLeft, RotateCcw } from "lucide-react-native";
import { api, type DiscoverFilters } from "@/lib/api";
import { quizQuestions, buildFilters, describeFilters, type QuizOption } from "@/lib/quiz";
import { fromApi, sampleTrending, type DisplayCard } from "@/lib/cards";
import { useOpenMovie } from "@/lib/useOpenMovie";
import { MatchRing } from "./MatchRing";
import { colors } from "@/lib/theme";

export function WatchDecisionQuiz({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { open: openMovie } = useOpenMovie();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizOption>>({});
  const [results, setResults] = useState<DisplayCard[] | null>(null);
  const [usedFilters, setUsedFilters] = useState<DiscoverFilters | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showingResults = results !== null || loading;
  const question = quizQuestions[step]!;
  const isLastStep = step === quizQuestions.length - 1;

  const run = async (finalAnswers: Record<string, QuizOption>) => {
    const filters = buildFilters(finalAnswers);
    setUsedFilters(filters);
    setLoading(true);
    setError(null);
    try {
      let { results } = await api.discover(filters);

      // A very tight combination can legitimately return nothing. Rather
      // than a dead end, relax the rating floor once and say so.
      if (results.length === 0 && (filters.minRating ?? 0) > 6) {
        const relaxed = { ...filters, minRating: 6 };
        ({ results } = await api.discover(relaxed));
        setUsedFilters(relaxed);
      }
      setResults(results.map(fromApi));
    } catch (e: any) {
      setError(e?.message || "Couldn't fetch recommendations");
      setResults(sampleTrending.slice(0, 3));
    } finally {
      setLoading(false);
    }
  };

  const choose = (option: QuizOption) => {
    const next = { ...answers, [question.key]: option };
    setAnswers(next);
    if (isLastStep) {
      run(next);
    } else {
      setStep((s) => s + 1);
    }
  };

  const skip = () => {
    if (isLastStep) {
      run(answers);
    } else {
      setStep((s) => s + 1);
    }
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const reset = () => {
    setStep(0);
    setAnswers({});
    setResults(null);
    setUsedFilters(null);
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

          {!showingResults ? (
            <>
              <View className="flex-row items-center gap-2">
                <Sparkles size={14} color={colors.primary} />
                <Text className="text-xs font-sans-semibold uppercase tracking-widest text-primary">
                  Step {step + 1} of {quizQuestions.length}
                </Text>
              </View>

              {/* Progress */}
              <View className="mt-3 flex-row gap-1.5">
                {quizQuestions.map((q, i) => (
                  <View
                    key={q.key}
                    className="h-1 flex-1 rounded-full"
                    style={{
                      backgroundColor:
                        i <= step ? colors.primary : "rgba(255,255,255,0.12)",
                    }}
                  />
                ))}
              </View>

              <Text className="mt-4 font-display text-2xl text-foreground">
                {question.prompt}
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">{question.helper}</Text>

              <ScrollView style={{ maxHeight: 300 }} className="mt-5">
                <View className="gap-2.5">
                  {question.options.map((opt) => {
                    const active = answers[question.key]?.label === opt.label;
                    return (
                      <Pressable
                        key={opt.label}
                        onPress={() => choose(opt)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        className="flex-row items-center justify-between rounded-2xl border px-4 py-3.5 active:opacity-80"
                        style={{
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active
                            ? "rgba(217,185,106,0.12)"
                            : "rgba(255,255,255,0.04)",
                        }}
                      >
                        <View className="min-w-0 flex-1">
                          <Text className="text-sm font-sans-semibold text-foreground">
                            {opt.label}
                          </Text>
                          {opt.hint ? (
                            <Text className="mt-0.5 text-[11px] text-muted-foreground">
                              {opt.hint}
                            </Text>
                          ) : null}
                        </View>
                        <ArrowRight size={15} color={colors.mutedForeground} />
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <View className="mt-5 flex-row items-center justify-between">
                {step > 0 ? (
                  <Pressable
                    onPress={back}
                    hitSlop={8}
                    accessibilityRole="button"
                    className="flex-row items-center gap-1.5 active:opacity-70"
                  >
                    <ArrowLeft size={14} color={colors.mutedForeground} />
                    <Text className="text-xs font-sans-medium text-muted-foreground">Back</Text>
                  </Pressable>
                ) : (
                  <View />
                )}
                <Pressable onPress={skip} hitSlop={8} accessibilityRole="button">
                  <Text className="text-xs font-sans-medium text-muted-foreground">
                    {isLastStep ? "Skip & see picks" : "Skip"}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text className="text-xs font-sans-semibold uppercase tracking-widest text-accent">
                Your picks
              </Text>
              <Text className="mt-2 font-display text-2xl text-foreground">
                {loading ? "Finding your match…" : "Watch this tonight"}
              </Text>
              {usedFilters && !loading ? (
                <Text className="mt-1 text-xs text-muted-foreground">
                  {describeFilters(usedFilters)}
                </Text>
              ) : null}
              {error ? (
                <Text className="mt-2 text-xs text-destructive">
                  {error} — showing sample titles instead.
                </Text>
              ) : null}

              {loading ? (
                <View className="items-center py-14">
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                <ScrollView className="mt-4" style={{ maxHeight: 330 }}>
                  <View className="gap-3">
                    {(results ?? []).length === 0 ? (
                      <View className="items-center rounded-2xl border border-dashed border-border py-10">
                        <Text className="px-8 text-center text-sm text-muted-foreground">
                          Nothing matched that combination. Try starting over with
                          looser answers.
                        </Text>
                      </View>
                    ) : (
                      (results ?? []).slice(0, 6).map((card, i) => (
                        <Pressable
                          key={card.key}
                          onPress={() => {
                            handleClose();
                            openMovie(card);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`${card.title}, ${card.year}`}
                          className="flex-row items-center gap-3 rounded-2xl border p-3 active:opacity-80"
                          style={{
                            borderColor: i === 0 ? "rgba(217,185,106,0.4)" : colors.border,
                            backgroundColor:
                              i === 0
                                ? "rgba(217,185,106,0.05)"
                                : "rgba(255,255,255,0.03)",
                          }}
                        >
                          <Image source={card.poster} className="h-16 w-11 rounded-lg" />
                          <View className="min-w-0 flex-1">
                            {i === 0 ? (
                              <Text className="text-[10px] font-sans-semibold uppercase tracking-widest text-primary">
                                Top pick
                              </Text>
                            ) : null}
                            <Text
                              className="text-sm font-sans-semibold text-foreground"
                              numberOfLines={1}
                            >
                              {card.title}
                            </Text>
                            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
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
                className="mt-5 flex-row items-center justify-center gap-2 rounded-full border border-border py-3 active:opacity-70"
              >
                <RotateCcw size={14} color={colors.mutedForeground} />
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

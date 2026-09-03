import { useState } from "react";
import { View, Text, Pressable, Modal, Image, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { X, Sparkles, ArrowRight } from "lucide-react-native";
import { moodQuestions, movies } from "@/lib/movies";
import { MatchRing } from "./MatchRing";

export function WatchDecisionQuiz({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<Record<string, string[]>>({});

  const done = step >= moodQuestions.length;
  const q = moodQuestions[Math.min(step, moodQuestions.length - 1)]!;
  const selected = picks[q.key] ?? [];

  const toggle = (opt: string) =>
    setPicks((p) => {
      const cur = p[q.key] ?? [];
      return {
        ...p,
        [q.key]: cur.includes(opt)
          ? cur.filter((o) => o !== opt)
          : [...cur, opt],
      };
    });

  const chosen = Object.values(picks).flat();
  const ranked = [...movies]
    .map((m) => ({
      movie: m,
      score: Math.min(
        99,
        m.match +
          chosen.filter((c) => m.moods.includes(c) || m.safeTags.includes(c))
            .length *
            4,
      ),
    }))
    .sort((a, b) => b.score - a.score);

  const reset = () => {
    setStep(0);
    setPicks({});
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  const goToMovie = (id: string) => {
    handleClose();
    router.push(`/title/${id}`);
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/70"
          onPress={handleClose}
        />
        <View className="rounded-t-[2rem] bg-[#2b2723] p-6 pb-9">
          <View className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />
          <Pressable
            onPress={handleClose}
            className="absolute right-5 top-5 rounded-full p-2"
            hitSlop={8}
          >
            <X size={18} color="#b7ac9c" />
          </Pressable>

          {!done ? (
            <>
              <View className="flex-row items-center gap-2">
                <Sparkles size={14} color="#d9b96a" />
                <Text className="text-xs font-sans-semibold uppercase tracking-widest text-primary">
                  Watch decision · {step + 1}/{moodQuestions.length}
                </Text>
              </View>
              <Text className="mt-3 font-display text-2xl text-foreground">
                {q.prompt}
              </Text>

              <View className="mt-6 flex-row flex-wrap gap-2.5">
                {q.options.map((opt) => {
                  const on = selected.includes(opt);
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => toggle(opt)}
                      className="rounded-full border px-4 py-2.5"
                      style={{
                        borderColor: on ? "#d9b96a" : "rgba(255,255,255,0.1)",
                        backgroundColor: on
                          ? "#d9b96a"
                          : "rgba(255,255,255,0.06)",
                      }}
                    >
                      <Text
                        className="text-sm font-sans-medium"
                        style={{ color: on ? "#3a2e16" : "#f5f4f2" }}
                      >
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={() => setStep((s) => s + 1)}
                disabled={selected.length === 0}
                className="mt-8 flex-row items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5"
                style={{ opacity: selected.length === 0 ? 0.35 : 1 }}
              >
                <Text className="text-sm font-sans-semibold text-primary-foreground">
                  {step === moodQuestions.length - 1
                    ? "See my pick"
                    : "Continue"}
                </Text>
                <ArrowRight size={16} color="#3a2e16" />
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
              <ScrollView className="mt-5" style={{ maxHeight: 320 }}>
                <View className="gap-3">
                  {ranked.slice(0, 3).map(({ movie, score }, i) => (
                    <Pressable
                      key={movie.id}
                      onPress={() => goToMovie(movie.id)}
                      className="flex-row items-center gap-3 rounded-2xl border p-3"
                      style={{
                        borderColor:
                          i === 0 ? "rgba(217,185,106,0.4)" : "rgba(255,255,255,0.1)",
                        backgroundColor:
                          i === 0 ? "rgba(217,185,106,0.05)" : "rgba(255,255,255,0.03)",
                      }}
                    >
                      <Image
                        source={movie.poster}
                        className="h-16 w-11 rounded-lg"
                      />
                      <View className="min-w-0 flex-1">
                        <Text
                          className="text-sm font-sans-semibold text-foreground"
                          numberOfLines={1}
                        >
                          {movie.title}
                        </Text>
                        <Text
                          className="text-xs text-muted-foreground"
                          numberOfLines={1}
                        >
                          {movie.pacing} · {movie.runtime}
                        </Text>
                      </View>
                      <MatchRing value={score} size={40} />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <Pressable
                onPress={reset}
                className="mt-6 items-center rounded-full border border-border py-3"
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

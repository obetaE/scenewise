import { View, Text } from "react-native";
import type { CriticScore } from "@/lib/api";

// Each outlet's own colour, so the row reads at a glance.
const STYLES: Record<CriticScore["source"], { bg: string; border: string; text: string }> = {
  rotten_tomatoes: {
    bg: "rgba(250,50,10,0.12)",
    border: "rgba(250,50,10,0.35)",
    text: "#fa6a4a",
  },
  metacritic: {
    bg: "rgba(255,204,51,0.12)",
    border: "rgba(255,204,51,0.35)",
    text: "#ffcc33",
  },
  imdb: {
    bg: "rgba(245,197,24,0.12)",
    border: "rgba(245,197,24,0.35)",
    text: "#f5c518",
  },
};

function formatVotes(votes: number | null): string | null {
  if (!votes) return null;
  if (votes >= 1_000_000) return `${(votes / 1_000_000).toFixed(1)}M votes`;
  if (votes >= 1_000) return `${Math.round(votes / 1_000)}k votes`;
  return `${votes} votes`;
}

// Critic scores sit above the written reviews as their own row. They're
// deliberately not mixed into the review list: a score has no author and no
// date, and shouldn't be mistaken for someone's written opinion.
export function CriticScores({ scores }: { scores: CriticScore[] }) {
  if (!scores.length) return null;

  return (
    <View className="mt-7 px-5">
      <Text className="text-sm font-sans-semibold text-foreground">Critic scores</Text>
      <Text className="mt-1 text-xs text-muted-foreground">
        Aggregated by each outlet · via OMDb
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-2.5">
        {scores.map((s) => {
          const style = STYLES[s.source];
          return (
            <View
              key={s.source}
              accessibilityLabel={`${s.label}: ${s.display}`}
              className="min-w-[104px] flex-1 rounded-2xl border p-3.5"
              style={{ backgroundColor: style.bg, borderColor: style.border }}
            >
              <Text className="text-[10px] font-sans-semibold uppercase tracking-wide" style={{ color: style.text }}>
                {s.label}
              </Text>
              <Text className="mt-1.5 font-display text-xl" style={{ color: style.text }}>
                {s.display}
              </Text>
              {formatVotes(s.votes) ? (
                <Text className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatVotes(s.votes)}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

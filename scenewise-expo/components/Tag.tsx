import { View, Text } from "react-native";
import type { LucideIcon } from "lucide-react-native";

type Variant =
  | "safe"
  | "mild"
  | "moderate"
  | "heavy"
  | "neutral"
  | "scenewise"
  | "tmdb";

const styles: Record<Variant, { bg: string; border: string; text: string }> = {
  safe: { bg: "rgba(148,232,191,0.15)", border: "rgba(148,232,191,0.3)", text: "#94e8bf" },
  mild: { bg: "#312c27", border: "rgba(255,255,255,0.1)", text: "#b7ac9c" },
  moderate: { bg: "rgba(226,164,104,0.15)", border: "rgba(226,164,104,0.3)", text: "#e2a468" },
  heavy: { bg: "rgba(208,87,74,0.15)", border: "rgba(208,87,74,0.35)", text: "#d0574a" },
  neutral: { bg: "#332e28", border: "rgba(255,255,255,0.1)", text: "#f5f4f2" },
  // Review source badges — our gold vs TMDB's brand blue, so the two are
  // distinguishable at a glance without reading the label.
  scenewise: { bg: "rgba(217,185,106,0.15)", border: "rgba(217,185,106,0.35)", text: "#d9b96a" },
  tmdb: { bg: "rgba(1,180,228,0.15)", border: "rgba(1,180,228,0.35)", text: "#5ac8e8" },
};

export function Tag({
  children,
  variant = "neutral",
  icon: Icon,
  suffix,
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  icon?: LucideIcon;
  suffix?: string;
  className?: string;
}) {
  const s = styles[variant];
  return (
    <View
      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1 ${className ?? ""}`}
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      {Icon ? <Icon size={11} color={s.text} /> : null}
      <Text className="text-xs font-sans-medium" style={{ color: s.text }}>
        {children}
        {suffix ? <Text style={{ opacity: 0.6 }}> · {suffix}</Text> : null}
      </Text>
    </View>
  );
}

import { View, Text, Pressable, Linking } from "react-native";
import { Mail, ExternalLink, Code2 } from "lucide-react-native";
import { colors } from "@/lib/theme";

const EMAIL = "obetachukwuka1@gmail.com";
const PORTFOLIO = "https://obetas-portfolio.vercel.app/";

// Scenewise is a portfolio project — this is the deliberate route back to the
// person who built it.
export function DeveloperCard() {
  return (
    <View
      className="rounded-2xl border p-5"
      style={{
        borderColor: "rgba(217,185,106,0.3)",
        backgroundColor: "rgba(217,185,106,0.06)",
      }}
    >
      <View className="flex-row items-center gap-2">
        <Code2 size={14} color={colors.primary} />
        <Text className="text-xs font-sans-semibold uppercase tracking-widest text-primary">
          Built by
        </Text>
      </View>

      <Text className="mt-2.5 font-display text-xl text-foreground">Obeta Chukwuka</Text>
      <Text className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Scenewise is a personal project — built to help people decide what to watch
        without spoilers. If you like it, want to work together, or just have feedback,
        I&apos;d genuinely love to hear from you.
      </Text>

      <View className="mt-4 gap-2.5">
        <Pressable
          onPress={() => Linking.openURL(`mailto:${EMAIL}?subject=Scenewise`)}
          accessibilityRole="link"
          accessibilityLabel={`Email ${EMAIL}`}
          className="flex-row items-center gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 active:opacity-70"
        >
          <Mail size={15} color={colors.primary} />
          <View className="min-w-0 flex-1">
            <Text className="text-xs font-sans-semibold text-foreground">Email me</Text>
            <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
              {EMAIL}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => Linking.openURL(PORTFOLIO)}
          accessibilityRole="link"
          accessibilityLabel="Open portfolio"
          className="flex-row items-center gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 active:opacity-70"
        >
          <ExternalLink size={15} color={colors.primary} />
          <View className="min-w-0 flex-1">
            <Text className="text-xs font-sans-semibold text-foreground">
              See my portfolio
            </Text>
            <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
              obetas-portfolio.vercel.app
            </Text>
          </View>
        </Pressable>
      </View>

      <Text className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
        Movie data from TMDB · critic scores via OMDb. This product uses the TMDB API
        but is not endorsed or certified by TMDB.
      </Text>
    </View>
  );
}

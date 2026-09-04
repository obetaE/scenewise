import { View, Text, Pressable, Image, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Clock,
  Gauge,
  ShieldCheck,
  Flag,
  Heart,
  Play,
} from "lucide-react-native";
import { getMovie, movies } from "@/lib/movies";
import { Tag } from "@/components/Tag";
import { MatchRing } from "@/components/MatchRing";

export default function TitleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const movie = getMovie(id);

  if (!movie) return <Redirect href="/" />;

  const related = movies.filter((m) => m.id !== movie.id).slice(0, 4);

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ height: 340 }} className="relative">
          <Image
            source={movie.poster}
            className="absolute inset-0 h-full w-full"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/30" />

          <SafeAreaView edges={["top"]} className="absolute inset-x-0 top-0">
            <View className="flex-row items-center justify-between p-4">
              <Pressable
                onPress={() => router.back()}
                className="rounded-full bg-black/45 p-2.5"
              >
                <ArrowLeft size={16} color="#f5f4f2" />
              </Pressable>
              <Pressable className="rounded-full bg-black/45 p-2.5">
                <Heart size={16} color="#f5f4f2" />
              </Pressable>
            </View>
          </SafeAreaView>

          <View className="absolute inset-x-5 bottom-5 flex-row items-end justify-between gap-4">
            <View className="flex-1">
              <Text className="text-xs font-sans-semibold uppercase tracking-wide text-primary">
                {movie.genres.join(" · ")}
              </Text>
              <Text className="mt-1.5 font-display text-3xl leading-tight text-foreground">
                {movie.title}
              </Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                {movie.year} · {movie.runtime}
              </Text>
            </View>
            <View className="rounded-2xl bg-black/45 p-2">
              <MatchRing value={movie.match} size={54} />
            </View>
          </View>
        </View>

        {/* Content warnings */}
        <View className="px-5 pt-5">
          <View className="flex-row items-center gap-2">
            <Flag size={15} color="#e2a468" />
            <Text className="text-sm font-sans-semibold text-foreground">
              Content warnings
            </Text>
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {movie.warnings.map((w) => (
              <Tag key={w.label} variant={w.level} suffix={w.level}>
                {w.label}
              </Tag>
            ))}
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {movie.safeTags.map((t) => (
              <Tag key={t} variant="safe" icon={ShieldCheck}>
                {t}
              </Tag>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View className="mt-6 px-5">
          <Text className="text-sm font-sans-semibold text-foreground">
            Spoiler-free summary
          </Text>
          <Text className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {movie.summary}
          </Text>
        </View>

        {/* Pacing / runtime / ending cards */}
        <View className="mt-6 flex-row flex-wrap gap-3 px-5">
          <View className="w-[47%] rounded-2xl border border-border bg-card p-4">
            <View className="flex-row items-center gap-1.5">
              <Gauge size={13} color="#b7ac9c" />
              <Text className="text-xs text-muted-foreground">Pacing</Text>
            </View>
            <Text className="mt-1.5 font-sans-semibold text-primary">
              {movie.pacing}
            </Text>
          </View>
          <View className="w-[47%] rounded-2xl border border-border bg-card p-4">
            <View className="flex-row items-center gap-1.5">
              <Clock size={13} color="#b7ac9c" />
              <Text className="text-xs text-muted-foreground">Runtime</Text>
            </View>
            <Text className="mt-1.5 font-sans-semibold text-foreground">
              {movie.runtime}
            </Text>
          </View>

          <View className="w-full rounded-2xl border border-border bg-card p-4">
            <Text className="text-xs text-muted-foreground">
              Pacing notes
            </Text>
            <Text className="mt-1.5 text-sm leading-relaxed text-foreground">
              {movie.pacingNote}
            </Text>
            <View className="mt-4 flex-row items-center gap-3">
              <Text className="text-xs text-muted-foreground">Intensity</Text>
              <View className="flex-row gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <View
                    key={i}
                    className="h-1.5 w-7 rounded-full"
                    style={{
                      backgroundColor:
                        i <= movie.intensity
                          ? "#d9b96a"
                          : "rgba(255,255,255,0.12)",
                    }}
                  />
                ))}
              </View>
            </View>
          </View>

          <View className="w-full rounded-2xl border border-accent/25 bg-accent/10 p-4">
            <Text className="text-xs font-sans-semibold uppercase tracking-wide text-accent">
              How it ends — no spoilers
            </Text>
            <Text className="mt-1.5 text-sm text-foreground">
              {movie.ending}
            </Text>
          </View>
        </View>

        {/* Related */}
        <View className="mt-7">
          <Text className="px-5 text-sm font-sans-semibold text-foreground">
            If this isn&apos;t it
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            className="mt-3"
          >
            {related.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => router.push(`/title/${m.id}`)}
                style={{ width: 112 }}
              >
                <Image
                  source={m.poster}
                  style={{ height: 160, width: "100%" }}
                  className="rounded-xl"
                  resizeMode="cover"
                />
                <Text
                  className="mt-2 text-xs font-sans-medium text-foreground"
                  numberOfLines={1}
                >
                  {m.title}
                </Text>
                <Text
                  className="text-[11px] text-muted-foreground"
                  numberOfLines={1}
                >
                  {m.pacing}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} className="w-full p-4">
        <Pressable className="flex-row items-center justify-center gap-2 rounded-full bg-primary py-3.5">
          <Play size={15} color="#3a2e16" />
          <Text className="text-sm font-sans-semibold text-primary-foreground">
            I&apos;m watching this
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

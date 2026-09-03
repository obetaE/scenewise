import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Search, SlidersHorizontal, ShieldCheck, Clock } from "lucide-react-native";
import { movies } from "@/lib/movies";
import { MatchRing } from "@/components/MatchRing";
import { Tag } from "@/components/Tag";
import { WatchDecisionQuiz } from "@/components/WatchDecisionQuiz";

export default function Home() {
  const router = useRouter();
  const [quizOpen, setQuizOpen] = useState(false);
  const trending = movies;
  const lowCommitment = movies.filter((m) => m.intensity <= 3);

  return (
    <SafeAreaView className="flex-1 pt-10 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
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
              <Text className="mt-1 font-display text-2xl text-primary">
                Scenewise
              </Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <Pressable className="rounded-full border border-border bg-secondary/50 p-2.5">
              <Search size={16} color="#f5f4f2" />
            </Pressable>
            <Pressable
              onPress={() => setQuizOpen(true)}
              className="rounded-full border border-border bg-secondary/50 p-2.5"
            >
              <SlidersHorizontal size={16} color="#f5f4f2" />
            </Pressable>
          </View>
        </View>

        <Text className="mt-5 px-5 text-sm leading-relaxed text-muted-foreground">
          Know the pacing, the intensity and the warnings before you press
          play. No spoilers, ever.
        </Text>

        <Pressable
          onPress={() => setQuizOpen(true)}
          className="mx-5 mt-4 flex-row items-center justify-between rounded-2xl bg-primary px-5 py-3.5"
        >
          <Text className="text-sm font-sans-semibold text-primary-foreground">
            {`Can't decide? Take the 30-second quiz`}
          </Text>
          <Text className="text-lg leading-none text-primary-foreground">
            →
          </Text>
        </Pressable>

        {/* Trending now */}
        <View className="mt-8">
          <View className="flex-row items-baseline justify-between px-5">
            <Text className="font-display text-lg text-foreground">
              Trending now
            </Text>
            <Text className="text-xs text-muted-foreground">Swipe</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
            className="mt-4"
          >
            {trending.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => router.push(`/title/${m.id}`)}
                className="relative w-[248px] overflow-hidden rounded-3xl"
                style={{ aspectRatio: 2 / 3 }}
              >
                <Image
                  source={m.poster}
                  className="absolute inset-0 h-full w-full"
                  resizeMode="cover"
                />
                <View className="absolute inset-0 bg-black/25" />

                <View className="absolute right-3 top-3 flex-row items-center gap-2 rounded-2xl bg-black/45 px-2.5 py-2">
                  <MatchRing value={m.match} size={40} />
                  <Text className="pr-1 text-[10px] font-sans-medium leading-tight text-foreground/85">
                    Will I{"\n"}like this
                  </Text>
                </View>

                <View className="absolute inset-x-3 bottom-3 rounded-2xl bg-black/55 p-3.5">
                  <Text className="text-xs font-sans-semibold uppercase tracking-wide text-primary">
                    {m.genres.join(" · ")}
                  </Text>
                  <Text
                    className="mt-1 font-display text-lg leading-snug text-foreground"
                    numberOfLines={1}
                  >
                    {m.title}
                  </Text>
                  <View className="mt-1 flex-row items-center gap-3">
                    <View className="flex-row items-center gap-1">
                      <Clock size={11} color="#b7ac9c" />
                      <Text className="text-[11px] text-muted-foreground">
                        {m.runtime}
                      </Text>
                    </View>
                    <Text className="text-[11px] text-muted-foreground">
                      {m.pacing}
                    </Text>
                  </View>
                  <View className="mt-2.5 flex-row flex-wrap gap-1.5">
                    {m.safeTags.slice(0, 2).map((t) => (
                      <Tag
                        key={t}
                        variant="safe"
                        icon={ShieldCheck}
                        className="px-2 py-0.5"
                      >
                        {t}
                      </Tag>
                    ))}
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Low-commitment picks */}
        <View className="mt-9 px-5">
          <Text className="font-display text-lg text-foreground">
            Low-commitment picks
          </Text>
          <View className="mt-4 gap-3">
            {lowCommitment.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => router.push(`/title/${m.id}`)}
                className="flex-row items-center gap-3.5 rounded-2xl border border-border bg-card/70 p-3"
              >
                <Image
                  source={m.poster}
                  className="h-[74px] w-[52px] rounded-xl"
                  resizeMode="cover"
                />
                <View className="min-w-0 flex-1">
                  <Text
                    className="font-sans-medium text-foreground"
                    numberOfLines={1}
                  >
                    {m.title}
                  </Text>
                  <Text
                    className="mt-0.5 text-xs text-muted-foreground"
                    numberOfLines={1}
                  >
                    {m.pacing} · {m.runtime}
                  </Text>
                  <View className="mt-1.5 flex-row gap-1.5">
                    <Tag variant="safe" className="px-2 py-0.5">
                      {m.safeTags[0]}
                    </Tag>
                  </View>
                </View>
                <MatchRing value={m.match} size={42} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <WatchDecisionQuiz open={quizOpen} onClose={() => setQuizOpen(false)} />
    </SafeAreaView>
  );
}

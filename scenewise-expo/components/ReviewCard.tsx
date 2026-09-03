import { useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { RatingStars } from "./RatingStars";
import { Tag } from "./Tag";
import type { Review } from "@/lib/api";

// TMDB reviews run long — clip them and let the reader expand.
const CLIPPED_LINES = 8;
const CLIP_THRESHOLD = 320;

export function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);

  const isTmdb = review.source === "tmdb";
  const date = new Date(review.createdAt);
  const dateLabel = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const clippable = review.text.length > CLIP_THRESHOLD;

  return (
    <View className="rounded-2xl border border-border bg-card/70 p-4">
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          {review.avatarUrl ? (
            <Image
              source={{ uri: review.avatarUrl }}
              className="h-7 w-7 rounded-full"
              resizeMode="cover"
            />
          ) : null}
          <Text
            numberOfLines={1}
            className="shrink font-sans-semibold text-foreground"
          >
            {review.displayName || "Anonymous"}
          </Text>
          <Tag variant={isTmdb ? "tmdb" : "scenewise"} className="px-2 py-0.5">
            {isTmdb ? "TMDB" : "Scenewise"}
          </Tag>
        </View>
        <Text className="text-xs text-muted-foreground">{dateLabel}</Text>
      </View>

      <View className="mt-1.5">
        {review.rating == null ? (
          // TMDB authors often review without scoring — an empty star row
          // would read as a 0/5, which isn't what they said.
          <Text className="text-xs text-muted-foreground">No rating</Text>
        ) : (
          <RatingStars value={review.rating} size={14} />
        )}
      </View>

      {review.text ? (
        <>
          <Text
            numberOfLines={expanded ? undefined : CLIPPED_LINES}
            className="mt-2 text-sm leading-relaxed text-muted-foreground"
          >
            {review.text}
          </Text>
          {clippable ? (
            <Pressable onPress={() => setExpanded((e) => !e)} hitSlop={6}>
              <Text className="mt-1.5 text-xs font-sans-medium text-primary">
                {expanded ? "Show less" : "Read more"}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

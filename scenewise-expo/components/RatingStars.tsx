import { View, Pressable } from "react-native";
import { Star } from "lucide-react-native";

export function RatingStars({
  value,
  onChange,
  size = 22,
}: {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
}) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View className="flex-row gap-1">
      {stars.map((n) => {
        const filled = n <= Math.round(value);
        const Wrapper = onChange ? Pressable : View;
        return (
          <Wrapper key={n} onPress={onChange ? () => onChange(n) : undefined} hitSlop={4}>
            <Star
              size={size}
              color={filled ? "#d9b96a" : "rgba(255,255,255,0.2)"}
              fill={filled ? "#d9b96a" : "transparent"}
            />
          </Wrapper>
        );
      })}
    </View>
  );
}

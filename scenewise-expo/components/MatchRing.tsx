import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";

export function MatchRing({
  value,
  size = 52,
}: {
  value: number;
  size?: number;
}) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (c * value) / 100;

  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="rgba(255,255,255,0.15)"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          stroke="#d9b96a"
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text
          className="font-sans-semibold text-primary"
          style={{ fontSize: size * 0.3 }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

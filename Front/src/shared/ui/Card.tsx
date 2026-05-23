import { View, type StyleProp, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { cardStyles } from "./tokens";

type CardVariant = "default" | "flat" | "highlighted";

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function Card({
  children,
  variant = "default",
  style,
  className,
}: CardProps): JSX.Element {
  return (
    <View style={[cardStyles[variant], style]} className={className}>
      {children}
    </View>
  );
}

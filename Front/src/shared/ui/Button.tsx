import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, radius, spacing } from "./tokens";

type Variant = "primary" | "secondary" | "danger" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  isDisabled?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const sizeMap: Record<
  Size,
  { paddingVertical: number; fontSize: number; minHeight: number }
> = {
  sm: { paddingVertical: spacing.sm, fontSize: 14, minHeight: 40 },
  md: { paddingVertical: spacing.md, fontSize: 15, minHeight: 48 },
  lg: { paddingVertical: spacing.lg, fontSize: 16, minHeight: 56 },
};

function getVariantStyle(
  variant: Variant,
  isInactive: boolean,
): { background: string; text: string; borderColor?: string; borderWidth?: number } {
  if (isInactive) {
    return { background: colors.borderStrong, text: colors.textDisabled };
  }
  if (variant === "primary") {
    return { background: colors.primary, text: colors.textOnPrimary };
  }
  if (variant === "secondary") {
    return { background: colors.primaryLight, text: colors.primary };
  }
  if (variant === "danger") {
    return { background: colors.danger, text: colors.white };
  }
  if (variant === "outline") {
    return {
      background: colors.white,
      text: colors.primary,
      borderColor: colors.primary,
      borderWidth: 1.5,
    };
  }
  return { background: "transparent", text: colors.textSecondary };
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  isDisabled = false,
  fullWidth = false,
  onPress,
  style,
}: ButtonProps): JSX.Element {
  const isInactive = isLoading || isDisabled;
  const v = getVariantStyle(variant, isInactive);
  const s = sizeMap[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      style={({ pressed }) => [
        {
          borderRadius: radius.md,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          paddingVertical: s.paddingVertical,
          paddingHorizontal: spacing.xl,
          minHeight: s.minHeight,
          backgroundColor: v.background,
          borderColor: v.borderColor,
          borderWidth: v.borderWidth,
          opacity: pressed ? 0.9 : 1,
          width: fullWidth ? "100%" : undefined,
        },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={v.text}
          style={{ marginRight: 8 }}
        />
      ) : null}
      <Text style={{ color: v.text, fontWeight: "600", fontSize: s.fontSize }}>
        {children}
      </Text>
    </Pressable>
  );
}

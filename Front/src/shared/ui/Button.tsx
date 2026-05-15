import { Pressable, Text } from "react-native";
import { cn } from "@/shared/lib/utils";

type Variant = "primary" | "secondary" | "warning" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  disabled?: boolean;
}

const containerByVariant: Record<Variant, string> = {
  primary: "bg-primary",
  secondary: "bg-card border border-border",
  warning: "bg-warning",
  danger: "bg-danger",
  ghost: "bg-transparent",
};

const textByVariant: Record<Variant, string> = {
  primary: "text-text-on-primary",
  secondary: "text-text-primary",
  warning: "text-text-on-primary",
  danger: "text-text-on-primary",
  ghost: "text-text-secondary",
};

const containerBySize: Record<Size, string> = {
  sm: "py-2 px-3 rounded-lg",
  md: "py-3 px-4 rounded-xl",
  lg: "py-4 px-5 rounded-2xl",
};

const textBySize: Record<Size, string> = {
  sm: "text-sm font-medium",
  md: "text-base font-semibold",
  lg: "text-lg font-bold",
};

/** 공통 버튼. 색상은 토큰만 사용 (tailwind.config.js 정의값). */
export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
}: Props): JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "items-center justify-center",
        containerByVariant[variant],
        containerBySize[size],
        fullWidth && "w-full",
        disabled && "opacity-50",
      )}
    >
      <Text className={cn(textByVariant[variant], textBySize[size])}>
        {label}
      </Text>
    </Pressable>
  );
}

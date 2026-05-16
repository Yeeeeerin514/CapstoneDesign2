// src/shared/ui/Button.tsx
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

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
}

const variantStyles: Record<Variant, { container: string; text: string }> = {
  primary:   { container: "bg-blue-600 active:bg-blue-700",   text: "text-white" },
  secondary: { container: "bg-gray-100 active:bg-gray-200",   text: "text-gray-700" },
  danger:    { container: "bg-red-500 active:bg-red-600",     text: "text-white" },
  outline:   { container: "border-2 border-blue-600 bg-white active:bg-blue-50", text: "text-blue-600" },
  ghost:     { container: "bg-transparent active:bg-gray-100", text: "text-gray-500" },
};

const sizeStyles: Record<Size, { container: string; text: string }> = {
  sm: { container: "h-10 px-4 rounded-xl",  text: "text-sm" },
  md: { container: "h-12 px-5 rounded-2xl", text: "text-base" },
  lg: { container: "h-14 px-6 rounded-2xl", text: "text-base" },
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  isDisabled = false,
  fullWidth = false,
  onPress,
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const disabled = isLoading || isDisabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={[
        "flex-row items-center justify-center",
        v.container,
        s.container,
        fullWidth ? "w-full" : "",
        disabled ? "opacity-50" : "",
      ].join(" ")}
    >
      {isLoading && (
        <ActivityIndicator
          size="small"
          color={variant === "primary" || variant === "danger" ? "#fff" : "#2563EB"}
          className="mr-2"
        />
      )}
      <Text className={["font-semibold", v.text, s.text].join(" ")}>
        {children}
      </Text>
    </Pressable>
  );
}

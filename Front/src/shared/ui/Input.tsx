import { View, Text, TextInput } from "react-native";
import { cn } from "@/shared/lib/utils";

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  label?: string;
  error?: string | null;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: "default" | "url" | "numeric" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

/** 라벨 + 입력 + 에러 메시지 한 묶음. */
export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  multiline = false,
  numberOfLines,
  keyboardType = "default",
  autoCapitalize = "none",
}: Props): JSX.Element {
  const hasError = typeof error === "string" && error.length > 0;
  return (
    <View className="gap-1">
      {label !== undefined && (
        <Text className="text-sm font-medium text-text-primary">{label}</Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        className={cn(
          "bg-card border rounded-xl px-3 py-3 text-text-primary",
          hasError ? "border-danger" : "border-border",
        )}
      />
      {hasError && <Text className="text-xs text-danger">{error}</Text>}
    </View>
  );
}

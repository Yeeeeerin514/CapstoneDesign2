import { View } from "react-native";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
}

/** 흰 배경 + 둥근 모서리 + 얕은 보더의 기본 카드. */
export function Card({ children, className }: Props): JSX.Element {
  return (
    <View
      className={cn(
        "bg-card rounded-2xl border border-border p-4",
        className,
      )}
    >
      {children}
    </View>
  );
}

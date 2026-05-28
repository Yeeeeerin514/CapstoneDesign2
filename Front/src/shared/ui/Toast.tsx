import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  onHide?: () => void;
  durationMs?: number;
}

const TYPE_STYLES: Record<
  ToastType,
  {
    bg: string;
    borderColor: string;
    icon: "checkmark-circle" | "close-circle" | "information-circle";
    iconColor: string;
    textColor: string;
  }
> = {
  success: {
    bg: "#DCFCE7",
    borderColor: "#86EFAC",
    icon: "checkmark-circle",
    iconColor: "#16A34A",
    textColor: "#14532D",
  },
  error: {
    bg: "#FEF2F2",
    borderColor: "#FCA5A5",
    icon: "close-circle",
    iconColor: "#DC2626",
    textColor: "#7F1D1D",
  },
  info: {
    bg: "#EFF6FF",
    borderColor: "#93C5FD",
    icon: "information-circle",
    iconColor: "#2563EB",
    textColor: "#1E3A8A",
  },
};

export function Toast({
  visible,
  message,
  type = "success",
  onHide,
  durationMs = 2500,
}: ToastProps): JSX.Element | null {
  const translateY = useRef(new Animated.Value(-40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -40,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide?.();
      });
    }, durationMs);

    return () => clearTimeout(timer);
  }, [visible, translateY, opacity, durationMs, onHide]);

  if (!visible) return null;

  const style = TYPE_STYLES[type];

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 12,
        left: 16,
        right: 16,
        zIndex: 999,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: style.bg,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: style.borderColor,
        }}
      >
        <Ionicons name={style.icon} size={18} color={style.iconColor} />
        <Text
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: "600",
            color: style.textColor,
          }}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

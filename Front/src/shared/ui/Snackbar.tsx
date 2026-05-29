import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";

interface SnackbarProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  /** 기본 2500ms. */
  duration?: number;
  /** 하단 탭바 위로 띄울 오프셋. 기본 80. */
  bottomOffset?: number;
}

/**
 * 하단 Snackbar — 상태바와 겹치지 않게 화면 아래에서 fade in/out.
 * 토스트의 상단 변형 (Toast)과 다르게 alert/confirmation에 적합.
 */
export function Snackbar({
  message,
  visible,
  onHide,
  duration = 2500,
  bottomOffset = 80,
}: SnackbarProps): JSX.Element | null {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(duration),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  }, [visible, opacity, duration, onHide]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { bottom: bottomOffset, opacity }]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#2C2C2A",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});

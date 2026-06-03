import { Alert, Platform } from "react-native";

/**
 * 웹(React Native Web) 전역 Alert 폴리필.
 *
 * RN Web 의 기본 Alert.alert 는 **버튼이 1개를 넘으면 동작하지 않아**
 * "삭제하기" 같은 확인 콜백(onPress)이 호출되지 않는다.
 * (예: 관심업장 삭제가 "눌러도 안 지워지는" 증상)
 *
 * 이 폴리필은 웹에서만 Alert.alert 를 window.confirm / window.alert 로 매핑한다.
 * - 버튼 0~1개: window.alert 후 해당 onPress 호출
 * - 버튼 2개+: window.confirm → 확인 시 (cancel 이 아닌) 액션 버튼 onPress,
 *              취소 시 cancel 버튼 onPress
 *
 * 네이티브(Android/iOS)에는 전혀 영향을 주지 않는다.
 */

type AlertButtonLike = {
  text?: string;
  onPress?: (value?: string) => void;
  style?: "default" | "cancel" | "destructive";
};

export function installWebAlertPolyfill(): void {
  if (Platform.OS !== "web") return;

  const w = globalThis as unknown as {
    confirm?: (message?: string) => boolean;
    alert?: (message?: string) => void;
  };
  if (typeof w.confirm !== "function" || typeof w.alert !== "function") return;

  const patched = (
    title?: string,
    message?: string,
    buttons?: AlertButtonLike[],
  ): void => {
    const heading = [title, message].filter(Boolean).join("\n\n");

    if (buttons === undefined || buttons.length <= 1) {
      w.alert?.(heading);
      const only = buttons?.[0];
      only?.onPress?.();
      return;
    }

    const cancelBtn = buttons.find((b) => b.style === "cancel");
    const confirmBtn =
      buttons.find((b) => b.style !== "cancel") ?? buttons[buttons.length - 1];

    const accepted = w.confirm?.(heading) ?? false;
    if (accepted) {
      confirmBtn?.onPress?.();
    } else {
      cancelBtn?.onPress?.();
    }
  };

  // RN 의 AlertStatic.alert 시그니처와 호환되도록 캐스팅.
  (Alert as unknown as { alert: typeof patched }).alert = patched;
}

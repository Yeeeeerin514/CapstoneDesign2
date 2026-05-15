/// <reference types="nativewind/types" />

/**
 * NativeWind v4의 자체 타입(`nativewind/types`)이 `react-native-css-interop/types`를
 * 참조하지만 일부 환경에서 해당 d.ts가 누락돼 augmentation이 적용되지 않는 문제가 있다.
 * → React Native 컴포넌트 props에 `className?: string`을 직접 보강한다.
 *
 * 이 선언이 있어야 `<View className="..." />` 형태가 strict 모드에서도 컴파일된다.
 */
import "react-native";

declare module "react-native" {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
  interface ImageBackgroundProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  interface TouchableHighlightProps {
    className?: string;
  }
  interface TouchableWithoutFeedbackProps {
    className?: string;
  }
  interface TouchableNativeFeedbackProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface SwitchProps {
    className?: string;
  }
  interface FlatListProps<ItemT> {
    className?: string;
  }
  interface SectionListProps<ItemT, SectionT> {
    className?: string;
  }
  interface VirtualizedListProps<ItemT> {
    className?: string;
  }
  interface SafeAreaViewProps {
    className?: string;
  }
  interface ActivityIndicatorProps {
    className?: string;
  }
  interface ModalProps {
    className?: string;
  }
  interface KeyboardAvoidingViewProps {
    className?: string;
  }
  interface RefreshControlProps {
    className?: string;
  }
}

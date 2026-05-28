import { Platform, StatusBar, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "./tokens";

interface Props {
  showLogo?: boolean;
  title?: string;
}

const HEADER_BODY_HEIGHT = 56;
const LOGO_BOX_SIZE = 28;
const LOGO_ICON_SIZE = 18;

export function ScreenHeader({ showLogo = false, title }: Props): JSX.Element {
  const insets = useSafeAreaInsets();
  const androidStatusBarHeight =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  const topInset = Math.max(insets.top, androidStatusBarHeight);

  return (
    <View
      style={{
        backgroundColor: colors.white,
        paddingTop: topInset,
      }}
    >
      <View
        style={{
          height: HEADER_BODY_HEIGHT,
          paddingHorizontal: spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {showLogo ? (
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <View
              style={{
                width: LOGO_BOX_SIZE,
                height: LOGO_BOX_SIZE,
                borderRadius: 8,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="shield-checkmark"
                size={LOGO_ICON_SIZE}
                color={colors.white}
              />
            </View>
            <Text style={typography.title3}>알바지킴이</Text>
          </View>
        ) : (
          <View />
        )}
        {title !== undefined ? (
          <Text style={typography.title3}>{title}</Text>
        ) : null}
      </View>
    </View>
  );
}

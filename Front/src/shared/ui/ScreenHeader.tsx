import { Text, View } from "react-native";
import { ShieldCheck } from "lucide-react-native";

interface Props {
  showLogo?: boolean;
  title?: string;
}

/** 화면 상단 공통 헤더. showLogo면 알바지킴이 로고 표시. title이 있으면 우측에 표시. */
export function ScreenHeader({ showLogo = false, title }: Props): JSX.Element {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 0.5,
        borderBottomColor: "#E5E7EB",
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {showLogo ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: "#2563EB",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={16} color="#FFFFFF" />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#0F172A" }}>
            알바지킴이
          </Text>
        </View>
      ) : (
        <View />
      )}
      {title !== undefined && (
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#0F172A" }}>
          {title}
        </Text>
      )}
    </View>
  );
}

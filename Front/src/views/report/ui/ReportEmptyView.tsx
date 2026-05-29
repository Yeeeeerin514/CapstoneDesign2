import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";

interface ReportEmptyViewProps {
  /** "신고 가능한 내 업장 보기" 버튼 — 같은 신고 탭 내에서 인라인 업장 선택으로 전환. */
  onSelectWorkplace: () => void;
}

export function ReportEmptyView({
  onSelectWorkplace,
}: ReportEmptyViewProps): JSX.Element {
  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
    >
      <ScreenHeader showLogo />

      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#0F172A" }}>
          신고
        </Text>
        <Text style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
          임금체불, 부당해고 등 위법 사항을 신고합니다
        </Text>
      </View>

      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: "#E8F2FF",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Ionicons name="cafe" size={48} color="#3182F6" />
        </View>

        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: "#0F172A",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          현재 진행 중인 신고가 없습니다
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: "#64748B",
            textAlign: "center",
            lineHeight: 20,
            marginBottom: 32,
          }}
        >
          안전한 알바 생활을 응원합니다!{"\n"}
          만약 임금체불·위법 사항이 발생하면{"\n"}
          아래 버튼으로 바로 신고할 수 있습니다.
        </Text>

        <Pressable
          onPress={onSelectWorkplace}
          style={{
            backgroundColor: "#3182F6",
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text
            style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}
          >
            신고 가능한 내 업장 보기
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </Pressable>

        <View
          style={{
            marginTop: 40,
            padding: 14,
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            width: "100%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <Ionicons name="information-circle" size={16} color="#3182F6" />
            <Text
              style={{ fontSize: 13, fontWeight: "600", color: "#0F172A" }}
            >
              신고 절차 안내
            </Text>
          </View>
          <Text
            style={{ fontSize: 12, color: "#64748B", lineHeight: 18 }}
          >
            앱이 자동 수집한 근무기록과 계약서를 기반으로{"\n"}
            진정서 초안 작성부터 노동청 제출까지{"\n"}
            단계별로 안내해드립니다.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";

interface ContractGateViewProps {
  workplaceName: string;
  onBack: () => void;
  /** [계약서 올리기] — 기존 계약서 업로드/AI 분석 흐름으로 진입. */
  onUploadContract: () => void;
  /** [건너뛰기 or 나중에 업로드] — 근무 정보 수동 입력 흐름으로 진입. */
  onSkip: () => void;
}

/**
 * 업장 등록 직전 게이트: "계약서가 있으세요?" — 사용자에게 두 갈래 진입점 제공.
 *  - 계약서 올리기 → ContractUploadView → ContractAnalysisView → WorkInfoInputView (auto-prefill)
 *  - 건너뛰기 or 나중에 업로드 → WorkInfoInputView (수동 입력)
 */
export function ContractGateView({
  workplaceName,
  onBack,
  onUploadContract,
  onSkip,
}: ContractGateViewProps): JSX.Element {
  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
    >
      <ScreenHeader showLogo />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          gap: 8,
        }}
      >
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: "#94A3B8" }}>업장 등록</Text>
          <Text
            style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}
          >
            {workplaceName}
          </Text>
        </View>
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 60,
        }}
      >
        {/* 아이콘 + 헤드라인 */}
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "#EBF3FF",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Ionicons name="document-text" size={32} color="#1A5FAF" />
        </View>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: "#0F172A",
            marginBottom: 10,
          }}
        >
          계약서가 있으세요?
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#475569",
            lineHeight: 22,
            marginBottom: 32,
          }}
        >
          {
            "올리면 근무정보가 자동으로 채워지고,\n최저임금·수당 위반까지 한 번에 확인해드려요."
          }
        </Text>

        {/* 주 CTA — 계약서 올리기 */}
        <Pressable
          onPress={onUploadContract}
          style={{
            backgroundColor: "#3182F6",
            borderRadius: 14,
            paddingVertical: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
          <Text
            style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
          >
            계약서 올리기
          </Text>
        </Pressable>

        {/* 보조 — 건너뛰기 or 나중에 업로드 */}
        <Pressable
          onPress={onSkip}
          style={{ paddingVertical: 16, alignItems: "center", marginTop: 8 }}
        >
          <Text
            style={{ fontSize: 14, color: "#64748B", fontWeight: "500" }}
          >
            나중에 업로드
          </Text>
        </Pressable>

        {/* 안내 */}
        <View
          style={{
            backgroundColor: "#F1F5F9",
            borderRadius: 10,
            padding: 12,
            marginTop: 32,
            flexDirection: "row",
            gap: 6,
            alignItems: "flex-start",
          }}
        >
          <Ionicons
            name="lock-closed-outline"
            size={14}
            color="#64748B"
            style={{ marginTop: 1 }}
          />
          <Text
            style={{
              flex: 1,
              fontSize: 11,
              color: "#64748B",
              lineHeight: 17,
            }}
          >
            업로드한 계약서는 분석 후 안전하게 처리되며, 제3자에게 공유되지
            않습니다.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

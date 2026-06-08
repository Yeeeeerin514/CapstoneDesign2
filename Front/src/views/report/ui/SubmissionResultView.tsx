import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import { useReportStore } from "@/features/report-submit";

interface SubmissionResultViewProps {
  caseId: string;
  onGoCaseDetail: () => void;
  /** 호환 prop — 더 이상 화면에서 사용하지 않음. 부모가 detail에서 처리. */
  onConnectMentor?: () => void;
}

/**
 * 진정서 제출 직후 노출되는 단순 확인 화면.
 *
 * 정책: 제출 후 5단계 timeline·멘토 결제 CTA 등 부가 정보 모두 제거.
 * 사용자는 "사건 상세 보기" 하나만 누르면 되고, 그곳에서 임금 수령 여부만 확인.
 */
export function SubmissionResultView({
  caseId,
  onGoCaseDetail,
  onConnectMentor: _onConnectMentor,
}: SubmissionResultViewProps): JSX.Element | null {
  const reportCase = useReportStore((s) =>
    s.cases.find((c) => c.id === caseId),
  );

  if (reportCase === undefined) {
    return null;
  }

  const submittedDate = reportCase.submittedAt
    ? new Date(reportCase.submittedAt).toLocaleDateString("ko-KR")
    : new Date().toLocaleDateString("ko-KR");

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
    >
      <ScreenHeader showLogo />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32,
          flexGrow: 1,
          justifyContent: "space-between",
        }}
      >
        <View>
          {/* 제출 완료 헤더 */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 28,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 42,
                backgroundColor: "#DCFCE7",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}
            >
              <Ionicons name="checkmark" size={48} color="#16A34A" />
            </View>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 8,
              }}
            >
              진정서 제출 완료!
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#475569",
                textAlign: "center",
                marginBottom: 10,
                lineHeight: 20,
              }}
            >
              {`${reportCase.workplaceName} 임금체불 진정이\n노동청에 정상 접수되었습니다.`}
            </Text>
            <Text style={{ fontSize: 12, color: "#94A3B8" }}>
              {`제출일: ${submittedDate}`}
            </Text>
          </View>

          {/* 다음 단계 안내 */}
          <View
            style={{
              backgroundColor: "#EBF3FF",
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: "#B5D4F4",
              flexDirection: "row",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <Ionicons
              name="information-circle"
              size={20}
              color="#1B64DA"
              style={{ marginTop: 1 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#185FA5",
                  marginBottom: 6,
                }}
              >
                사업주로부터 임금을 받으면 알려주세요
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "#475569",
                  lineHeight: 18,
                }}
              >
                사건 상세 화면에서 임금 수령 여부만 알려주시면 됩니다.
                노동청 절차 안내·진행 추적은 별도로 챙기지 않으셔도 돼요.
              </Text>
            </View>
          </View>
        </View>

        {/* 단일 메인 CTA */}
        <Pressable
          onPress={onGoCaseDetail}
          style={{
            backgroundColor: "#3182F6",
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            marginTop: 20,
          }}
        >
          <Text
            style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
          >
            사건 상세 보기
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

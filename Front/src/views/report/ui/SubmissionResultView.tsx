import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import { useReportStore } from "@/features/report-submit";

interface SubmissionResultViewProps {
  caseId: string;
  onGoCaseDetail: () => void;
  onConnectMentor: () => void;
}

interface TimelineEntry {
  number: string;
  title: string;
  desc: string;
  timing: string;
}

const TIMELINE: TimelineEntry[] = [
  {
    number: "1",
    title: "근로감독관 배정",
    desc: "1~2주 이내 사건이 담당 감독관에게 배정됩니다",
    timing: "약 1~2주 후",
  },
  {
    number: "2",
    title: "출석요구서 수신",
    desc: "사업주와 근로자 모두에게 출석요구서가 발송됩니다",
    timing: "배정 후 1~2주",
  },
  {
    number: "3",
    title: "출석조사",
    desc: "지정된 날짜에 노동청에 출석해 조사를 받습니다",
    timing: "요구서 수신 후",
  },
  {
    number: "4",
    title: "시정지시",
    desc: "체불 사실이 확인되면 사업주에게 지급 시정지시",
    timing: "조사 후",
  },
  {
    number: "5",
    title: "해결",
    desc: "사업주가 지급하면 사건 종결, 미이행 시 형사입건",
    timing: "시정 후",
  },
];

export function SubmissionResultView({
  caseId,
  onGoCaseDetail,
  onConnectMentor,
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
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* 제출 완료 헤더 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 24,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: "#DCFCE7",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Ionicons name="checkmark" size={40} color="#16A34A" />
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: "#0F172A",
              marginBottom: 6,
            }}
          >
            진정서 제출 완료!
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#475569",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {`${reportCase.workplaceName} 임금체불 진정이 접수되었습니다`}
          </Text>
          <Text style={{ fontSize: 11, color: "#94A3B8" }}>
            {`제출일: ${submittedDate}`}
          </Text>
        </View>

        {/* 앞으로의 진행 일정 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#0F172A",
              marginBottom: 14,
            }}
          >
            앞으로 무슨 일이 일어나나요?
          </Text>
          {TIMELINE.map((item, idx) => (
            <View
              key={item.number}
              style={{
                flexDirection: "row",
                gap: 12,
                marginBottom: idx === TIMELINE.length - 1 ? 0 : 14,
              }}
            >
              <View style={{ alignItems: "center" }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1.5,
                    borderColor: "#CBD5E1",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: "#94A3B8",
                    }}
                  >
                    {item.number}
                  </Text>
                </View>
                {idx < TIMELINE.length - 1 ? (
                  <View
                    style={{
                      width: 2,
                      flex: 1,
                      backgroundColor: "#F1F5F9",
                      marginTop: 4,
                      minHeight: 14,
                    }}
                  />
                ) : null}
              </View>
              <View style={{ flex: 1, paddingBottom: 4 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#0F172A",
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#94A3B8" }}>
                    {item.timing}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#64748B",
                    marginTop: 2,
                    lineHeight: 17,
                  }}
                >
                  {item.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* 출석조사 멘토 연결 CTA */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <Ionicons name="school" size={16} color="#3182F6" />
            <Text
              style={{ fontSize: 14, fontWeight: "700", color: "#0F172A" }}
            >
              출석조사가 처음이라 막막하신가요?
            </Text>
          </View>
          <Text
            style={{
              fontSize: 12,
              color: "#475569",
              lineHeight: 18,
              marginBottom: 12,
            }}
          >
            같은 경험을 가진 멘토와 함께 준비하세요
          </Text>
          <Pressable
            onPress={onConnectMentor}
            style={{
              backgroundColor: "#3182F6",
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}
            >
              출석조사 멘토 연결하기 · ₩10,000
            </Text>
          </Pressable>
        </View>

        {/* 사건 상세 보기 */}
        <Pressable
          onPress={onGoCaseDetail}
          style={{
            paddingVertical: 13,
            borderRadius: 10,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Text
            style={{ fontSize: 14, fontWeight: "600", color: "#475569" }}
          >
            사건 상세 보기
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#475569" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

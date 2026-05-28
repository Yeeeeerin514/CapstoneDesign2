import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScreenHeader } from "@/shared/ui";
import {
  useFavoriteWorkplaceStore,
  type FavoriteWorkplace,
} from "@/features/favorite-workplace";
import { useReportStore } from "@/features/report-submit";

interface WorkplaceSelectForReportViewProps {
  /** 뒤로가기 — Empty 상태로 복귀. */
  onBack: () => void;
  /** 사건 생성 후 부모가 처리할 후속 동작 (예: detail 화면으로 이동). */
  onCaseCreated: (caseId: string) => void;
}

/**
 * 신고 탭 인라인 — 신고 가능한 내 업장 리스트.
 * 등록 완료된(workplaceRegistered) 관심업장만 표시. 카드에서 "신고하기" 누르면
 * 새 ReportCase 생성 후 onCaseCreated 콜백으로 상위에 caseId 전달.
 */
export function WorkplaceSelectForReportView({
  onBack,
  onCaseCreated,
}: WorkplaceSelectForReportViewProps): JSX.Element {
  const workplaces = useFavoriteWorkplaceStore((s) => s.workplaces);
  const startReport = useReportStore((s) => s.startReport);

  const eligibleWorkplaces = workplaces.filter(
    (w) => w.registrationStatus === "registered",
  );

  const handleReport = (wp: FavoriteWorkplace): void => {
    const caseId = startReport({
      workplaceName: wp.name,
      industry: "카페·음식점",
      region: "서울 강남구",
      damageTypes: ["임금체불"],
      initialEvidence:
        wp.contractStatus === "uploaded" ? { contracts: 1 } : {},
    });
    onCaseCreated(caseId);
  };

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
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
        <Pressable onPress={onBack} hitSlop={6}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
            신고할 업장 선택
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            등록된 근무지 중에서 골라주세요
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 32 }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: "#94A3B8",
            marginTop: 4,
            marginBottom: 10,
            letterSpacing: 0.5,
          }}
        >
          근무 중인 업장
        </Text>

        {eligibleWorkplaces.length === 0 ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 20,
              alignItems: "center",
            }}
          >
            <Ionicons name="briefcase-outline" size={36} color="#94A3B8" />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#0F172A",
                marginTop: 12,
                marginBottom: 6,
                textAlign: "center",
              }}
            >
              등록된 근무 업장이 없어요
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#64748B",
                lineHeight: 18,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              {
                "관심업장 탭에서 업장을 등록한 뒤\nWi-Fi BSSID까지 연결해야 신고할 수 있어요"
              }
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/workplace")}
              style={{
                backgroundColor: "#3182F6",
                paddingHorizontal: 18,
                paddingVertical: 11,
                borderRadius: 10,
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}
              >
                관심업장 탭으로 이동
              </Text>
            </Pressable>
          </View>
        ) : (
          eligibleWorkplaces.map((wp) => (
            <WorkplaceReportCard
              key={wp.id}
              workplace={wp}
              onReport={() => handleReport(wp)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface WorkplaceReportCardProps {
  workplace: FavoriteWorkplace;
  onReport: () => void;
}

function WorkplaceReportCard({
  workplace,
  onReport,
}: WorkplaceReportCardProps): JSX.Element {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        borderWidth: 0.5,
        borderColor: "#E0E0DC",
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#111111" }}>
          {workplace.name}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginTop: 4,
          }}
        >
          <Ionicons name="wifi" size={12} color="#888888" />
          <Text style={{ fontSize: 12, color: "#888888" }}>
            {workplace.ssid ?? "위치 정보 없음"}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
          {workplace.contractStatus === "uploaded"
            ? "✓ 계약서 등록됨"
            : "계약서 미등록"}
        </Text>
      </View>
      <Pressable
        onPress={onReport}
        style={{
          backgroundColor: "#1A5FAF",
          borderRadius: 8,
          paddingHorizontal: 14,
          paddingVertical: 9,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>
          신고하기
        </Text>
      </Pressable>
    </View>
  );
}

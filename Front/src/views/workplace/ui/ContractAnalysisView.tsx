import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  HighlightedContractText,
  IssueDetailSheet,
  type ContractAnalysisResult,
  type ContractIssue,
} from "@/entities/job-post";
import { ScreenHeader } from "@/shared/ui";

interface ContractAnalysisViewProps {
  result: ContractAnalysisResult;
  onBack: () => void;
  onRegister: () => void;
}

type TabKey = "contract" | "issues";

export function ContractAnalysisView({
  result,
  onBack,
  onRegister,
}: ContractAnalysisViewProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>("contract");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const selectedIssue = useMemo<ContractIssue | null>(() => {
    if (selectedIssueId === null) return null;
    return result.issues.find((i) => i.id === selectedIssueId) ?? null;
  }, [selectedIssueId, result.issues]);

  const selectedIndex = useMemo<number>(() => {
    if (selectedIssueId === null) return -1;
    return result.issues.findIndex((i) => i.id === selectedIssueId);
  }, [selectedIssueId, result.issues]);

  const handlePrev = (): void => {
    if (selectedIndex > 0) {
      setSelectedIssueId(result.issues[selectedIndex - 1].id);
    }
  };
  const handleNext = (): void => {
    if (selectedIndex >= 0 && selectedIndex < result.issues.length - 1) {
      setSelectedIssueId(result.issues[selectedIndex + 1].id);
    }
  };

  // 계약기간 표시 헬퍼: "2026-04-01" → "2026.04"
  const contractPeriodLabel = `계약 기간 ${result.contractPeriod.start.slice(0, 7).replace("-", ".")}`;

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
        <Pressable onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "500", color: "#0F172A" }}>
          AI 계약서 분석
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        {/* 요약 카드 */}
        <View
          style={{
            backgroundColor: "#E1F5EE",
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "500", color: "#04342C" }}>
              {result.workplaceName}
            </Text>
            <Text style={{ fontSize: 12, color: "#0F6E56" }}>
              {contractPeriodLabel}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={{ fontSize: 11, color: "#0F6E56", marginBottom: 4 }}
              >
                시급
              </Text>
              <Text
                style={{ fontSize: 20, fontWeight: "700", color: "#04342C" }}
              >
                {`${result.hourlyWage.toLocaleString()}원`}
              </Text>
            </View>
            <View>
              <Text
                style={{ fontSize: 11, color: "#0F6E56", marginBottom: 4 }}
              >
                예상 월급
              </Text>
              <Text
                style={{ fontSize: 20, fontWeight: "700", color: "#04342C" }}
              >
                {`약 ${Math.round(result.estimatedMonthlyWage / 10000)}만원`}
              </Text>
            </View>
          </View>
        </View>

        {/* 탭 */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <Pressable
            onPress={() => setActiveTab("contract")}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor:
                activeTab === "contract" ? "#EF4444" : "#FFFFFF",
              borderWidth: 1,
              borderColor: activeTab === "contract" ? "#EF4444" : "#E2E8F0",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: activeTab === "contract" ? "#FFFFFF" : "#475569",
                fontWeight: "500",
                fontSize: 14,
              }}
            >
              {`계약서 보기 (${result.issues.length})`}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("issues")}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: activeTab === "issues" ? "#EF4444" : "#FFFFFF",
              borderWidth: 1,
              borderColor: activeTab === "issues" ? "#EF4444" : "#E2E8F0",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: activeTab === "issues" ? "#FFFFFF" : "#475569",
                fontWeight: "500",
                fontSize: 14,
              }}
            >
              이슈 목록
            </Text>
          </Pressable>
        </View>

        {/* 본문 */}
        {activeTab === "contract" ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <HighlightedContractText
              segments={result.textSegments}
              issues={result.issues}
              onIssuePress={(id) => setSelectedIssueId(id)}
            />
            <View
              style={{
                marginTop: 16,
                padding: 10,
                backgroundColor: "#F8FAFC",
                borderRadius: 8,
              }}
            >
              <Text
                style={{ fontSize: 12, color: "#64748B", textAlign: "center" }}
              >
                형광펜 부분을 탭하면 상세 설명을 볼 수 있어요
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {result.issues.map((issue) => (
              <Pressable
                key={issue.id}
                onPress={() => setSelectedIssueId(issue.id)}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 14,
                  borderLeftWidth: 4,
                  borderLeftColor:
                    issue.level === "danger"
                      ? "#EF4444"
                      : issue.level === "warning"
                        ? "#F97316"
                        : "#3B82F6",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "500",
                    color: "#0F172A",
                    marginBottom: 4,
                  }}
                >
                  {`${issue.number}. ${issue.title}`}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#64748B",
                    lineHeight: 20,
                    marginBottom: 6,
                  }}
                >
                  {issue.description}
                </Text>
                <Text style={{ fontSize: 11, color: "#94A3B8" }}>
                  {`관련 법령: ${issue.legalBasis.law}`}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
        }}
      >
        <Pressable
          onPress={onRegister}
          style={{
            backgroundColor: "#2563EB",
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "500" }}>
            사업장 등록하기 →
          </Text>
        </Pressable>
      </View>

      {/* 바텀시트 */}
      <IssueDetailSheet
        issue={selectedIssue}
        totalCount={result.issues.length}
        onClose={() => setSelectedIssueId(null)}
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={selectedIndex > 0}
        hasNext={selectedIndex >= 0 && selectedIndex < result.issues.length - 1}
      />
    </SafeAreaView>
  );
}

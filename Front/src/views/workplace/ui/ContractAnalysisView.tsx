import { useState } from "react";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import type { ContractAnalysisResult, ContractIssue } from "@/entities/job-post";
import { ScreenHeader } from "@/shared/ui";

type TabKey = "issues" | "content" | "guide";

interface Props {
  result: ContractAnalysisResult;
  onBack: () => void;
  onRegister: () => void;
}

const ISSUE_STYLES: Record<
  ContractIssue["level"],
  { bg: string; border: string; titleColor: string; descColor: string }
> = {
  danger: {
    bg: "#FEF2F2",
    border: "#EF4444",
    titleColor: "#991B1B",
    descColor: "#B91C1C",
  },
  warning: {
    bg: "#FEF9F0",
    border: "#F59E0B",
    titleColor: "#92400E",
    descColor: "#B45309",
  },
  info: {
    bg: "#EFF6FF",
    border: "#60A5FA",
    titleColor: "#1E40AF",
    descColor: "#1D4ED8",
  },
};

const RISK_BANNER: Record<
  ContractAnalysisResult["overallRisk"],
  { bg: string; border: string; text: string; label: string; desc: string }
> = {
  high: {
    bg: "#FEF2F2",
    border: "#FCA5A5",
    text: "#991B1B",
    label: "위험",
    desc: "심각한 위법 소지가 발견되어 계약 전 확인이 필요해요",
  },
  medium: {
    bg: "#FFFBEB",
    border: "#FCD34D",
    text: "#92400E",
    label: "주의",
    desc: "주의가 필요한 항목이 있어요",
  },
  low: {
    bg: "#F0FDF4",
    border: "#86EFAC",
    text: "#166534",
    label: "양호",
    desc: "특별히 발견된 위법 사항이 없어요",
  },
};

export function ContractAnalysisView({
  result,
  onBack,
  onRegister,
}: Props): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>("issues");
  const banner = RISK_BANNER[result.overallRisk];
  const isBelowMinWage =
    result.hourlyWage > 0 && result.hourlyWage < result.minimumWage;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScreenHeader showLogo />
      <View
        style={{
          backgroundColor: "#fff",
          borderBottomWidth: 0.5,
          borderBottomColor: "#E5E7EB",
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={onBack}>
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>
          AI 계약서 분석
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, padding: 16 }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* 상단 위험도 + 요약 */}
        <View
          style={{
            backgroundColor: banner.bg,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            borderWidth: 0.5,
            borderColor: banner.border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: banner.text }}>
              {result.workplaceName}
            </Text>
            <View
              style={{
                backgroundColor: banner.border,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 11, color: "#fff", fontWeight: "700" }}>
                {banner.label}
              </Text>
            </View>
          </View>
          {result.summary !== "" && (
            <Text
              style={{
                fontSize: 12,
                color: banner.text,
                marginBottom: 12,
                lineHeight: 17,
              }}
            >
              {result.summary}
            </Text>
          )}
          <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
            <View>
              <Text style={{ fontSize: 11, color: banner.text, marginBottom: 2 }}>
                계약 시급
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: banner.text }}>
                {result.hourlyWage > 0
                  ? `${result.hourlyWage.toLocaleString()}원`
                  : result.extracted.monthlyWage !== null
                    ? "역산 중"
                    : "확인불가"}
                {isBelowMinWage && (
                  <Text style={{ fontSize: 11, color: "#DC2626" }}> (미달)</Text>
                )}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 11, color: banner.text, marginBottom: 2 }}>
                {result.extracted.monthlyWage !== null ? "계약 월급" : "예상 월급"}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: banner.text }}>
                {result.estimatedMonthlyPay > 0
                  ? `약 ${Math.round(result.estimatedMonthlyPay / 10000)}만원`
                  : "산정불가"}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 11, color: banner.text, marginBottom: 2 }}>
                기준 최저시급
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: banner.text }}>
                {result.minimumWage.toLocaleString()}원
              </Text>
            </View>
          </View>
        </View>

        {/* 탭 */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          {(
            [
              {
                key: "issues",
                label: `발견 이슈 (${result.issues.length})`,
                isActive: activeTab === "issues",
                activeBg: "#EF4444",
                activeText: "#fff",
              },
              {
                key: "content",
                label: "계약 내용",
                isActive: activeTab === "content",
                activeBg: "#374151",
                activeText: "#fff",
              },
              {
                key: "guide",
                label: "법률 가이드",
                isActive: activeTab === "guide",
                activeBg: "#374151",
                activeText: "#fff",
              },
            ] as {
              key: TabKey;
              label: string;
              isActive: boolean;
              activeBg: string;
              activeText: string;
            }[]
          ).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 8,
                alignItems: "center",
                backgroundColor: tab.isActive ? tab.activeBg : "#fff",
                borderWidth: 0.5,
                borderColor: tab.isActive ? tab.activeBg : "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: tab.isActive ? tab.activeText : "#6B7280",
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 이슈 탭 */}
        {activeTab === "issues" && (
          <View style={{ gap: 8 }}>
            {result.issues.length === 0 ? (
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 0.5,
                  borderColor: "#E5E7EB",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 13, color: "#6B7280" }}>
                  발견된 위법 사항이 없습니다.
                </Text>
              </View>
            ) : (
              result.issues.map((issue, idx) => {
                const s = ISSUE_STYLES[issue.level];
                return (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: s.bg,
                      borderLeftWidth: 3,
                      borderLeftColor: s.border,
                      paddingVertical: 10,
                      paddingRight: 12,
                      paddingLeft: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: s.titleColor,
                        marginBottom: 3,
                      }}
                    >
                      {issue.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: s.descColor, marginBottom: 3, lineHeight: 17 }}>
                      {issue.description}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#6B7280" }}>
                      관련 법률: {issue.legalBasis}
                    </Text>
                    {issue.legalBasisExcerpt !== null && issue.legalBasisExcerpt !== "" && (
                      <View
                        style={{
                          marginTop: 8,
                          paddingTop: 6,
                          paddingHorizontal: 8,
                          paddingBottom: 8,
                          borderLeftWidth: 2,
                          borderLeftColor: "#94A3B8",
                          backgroundColor: "#F8FAFC",
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ fontSize: 10, color: "#475569", fontWeight: "700", marginBottom: 2 }}>
                          법제처 조문 인용
                        </Text>
                        <Text style={{ fontSize: 11, color: "#334155", lineHeight: 16 }}>
                          {issue.legalBasisExcerpt}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* 계약 내용 탭 */}
        {activeTab === "content" && (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 14,
              borderWidth: 0.5,
              borderColor: "#E5E7EB",
              gap: 8,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 4,
              }}
            >
              계약서에서 추출된 정보
            </Text>
            <ContentRow
              label="시급"
              value={
                result.extracted.hourlyWage !== null
                  ? `${result.extracted.hourlyWage.toLocaleString()}원`
                  : "미확인 (월급제)"
              }
            />
            {result.extracted.monthlyWage !== null && (
              <ContentRow
                label="월급"
                value={`${result.extracted.monthlyWage.toLocaleString()}원`}
              />
            )}
            {result.extracted.dailyWage !== null && (
              <ContentRow
                label="일급"
                value={`${result.extracted.dailyWage.toLocaleString()}원`}
              />
            )}
            <ContentRow
              label="1일 근로시간"
              value={
                result.extracted.workingHoursPerDay !== null
                  ? `${result.extracted.workingHoursPerDay}시간`
                  : "미확인"
              }
            />
            <ContentRow
              label="주 근무일수"
              value={
                result.extracted.workingDaysPerWeek !== null
                  ? `주 ${result.extracted.workingDaysPerWeek}일`
                  : "미확인"
              }
            />
            <ContentRow label="근무 시작일" value={result.extracted.startDate ?? "미확인"} />
            <ContentRow label="근무 장소" value={result.extracted.workPlace ?? "미확인"} />
            <ContentRow
              label="업무 내용"
              value={result.extracted.jobDescription ?? "미확인"}
            />
            <ContentRow
              label="고용주(상호)"
              value={result.extracted.employerName ?? "미확인"}
            />
            <ContentRow
              label="사업자등록번호"
              value={result.extracted.businessRegistrationNumber ?? "미확인"}
            />

            <View
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTopWidth: 0.5,
                borderTopColor: "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#0F172A",
                  marginBottom: 6,
                }}
              >
                계약서 기재 여부
              </Text>
              <CheckRow
                label="휴게시간 명시"
                value={result.extracted.breakTimeMentioned}
              />
              <CheckRow
                label="주휴수당 명시"
                value={result.extracted.weeklyHolidayAllowanceMentioned}
              />
              <CheckRow
                label="연장·야간수당 명시"
                value={result.extracted.overtimeAllowanceMentioned}
              />
              <CheckRow
                label="연차유급휴가 명시"
                value={result.extracted.annualLeaveMentioned}
              />
            </View>
          </View>
        )}

        {/* 법률 가이드 탭 */}
        {activeTab === "guide" && (
          <View style={{ gap: 8 }}>
            <GuideCard
              title="최저임금"
              law="최저임금법 제6조"
              body={`2026년 적용 최저시급은 ${result.minimumWage.toLocaleString()}원입니다. 수습기간, 포괄임금, 주휴수당 포함 여부와 무관하게 시간당 실지급액이 이보다 낮으면 위법입니다.`}
            />
            <GuideCard
              title="주휴수당"
              law="근로기준법 제55조"
              body="1주 소정근로시간이 15시간 이상이고 그 주의 소정근로일을 모두 개근한 근로자에게는 1일분의 유급휴일(주휴일) 임금을 추가로 지급해야 합니다."
            />
            <GuideCard
              title="연장·야간·휴일 가산수당"
              law="근로기준법 제56조"
              body="1일 8시간 또는 1주 40시간을 초과한 근로(연장), 22:00~06:00의 야간근로, 휴일근로에 대해서는 통상임금의 50% 이상을 가산하여 지급해야 합니다."
            />
            <GuideCard
              title="연차유급휴가"
              law="근로기준법 제60조"
              body="1년간 80% 이상 출근한 근로자에게는 15일의 유급휴가를 줘야 합니다. 1년 미만 또는 80% 미만 출근자는 1개월 개근 시마다 1일의 유급휴가가 발생합니다."
            />
            <GuideCard
              title="근로계약서 필수 기재사항"
              law="근로기준법 제17조"
              body="임금, 소정근로시간, 휴일, 연차유급휴가, 취업장소, 업무내용은 반드시 서면으로 작성해 근로자에게 교부해야 합니다. 어길 시 500만원 이하의 벌금."
            />
            <GuideCard
              title="휴게시간"
              law="근로기준법 제54조"
              body="근로시간이 4시간이면 30분 이상, 8시간이면 1시간 이상의 휴게시간을 근로시간 도중에 줘야 합니다."
            />
          </View>
        )}
      </ScrollView>

      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#fff",
          borderTopWidth: 0.5,
          borderTopColor: "#E5E7EB",
          padding: 16,
        }}
      >
        <TouchableOpacity
          onPress={onRegister}
          style={{
            paddingVertical: 14,
            backgroundColor: "#111827",
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
            사업장 등록하기 →
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ContentRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Text style={{ fontSize: 12, color: "#64748B", width: 110 }}>{label}</Text>
      <Text style={{ fontSize: 12, color: "#0F172A", flex: 1, fontWeight: "600" }}>
        {value}
      </Text>
    </View>
  );
}

function CheckRow({ label, value }: { label: string; value: boolean | null }) {
  const status =
    value === true ? { color: "#16A34A", text: "✓ 명시됨" } :
    value === false ? { color: "#DC2626", text: "✗ 누락" } :
    { color: "#9CA3AF", text: "확인불가" };
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
      <Text style={{ fontSize: 12, color: "#475569" }}>{label}</Text>
      <Text style={{ fontSize: 12, color: status.color, fontWeight: "700" }}>
        {status.text}
      </Text>
    </View>
  );
}

function GuideCard({
  title,
  law,
  body,
}: {
  title: string;
  law: string;
  body: string;
}) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 12,
        borderWidth: 0.5,
        borderColor: "#E5E7EB",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#0F172A" }}>{title}</Text>
        <View
          style={{
            backgroundColor: "#EFF6FF",
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
          }}
        >
          <Text style={{ fontSize: 10, color: "#1D4ED8", fontWeight: "600" }}>{law}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, color: "#475569", lineHeight: 18 }}>{body}</Text>
    </View>
  );
}

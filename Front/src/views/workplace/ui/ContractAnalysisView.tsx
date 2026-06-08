import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import type { ContractAnalysisResult } from "@/entities/job-post";
import { ScreenHeader } from "@/shared/ui";

interface Props {
  result: ContractAnalysisResult;
  onBack: () => void;
  /** 하단 CTA 진입 — detail view에서는 생략 시 하단 버튼 미노출. */
  onRegister?: () => void;
  /**
   * 하단 CTA 라벨 — 미지정 시 "사업장 등록하기 →".
   * 이미 등록된 업장에서 계약서만 추가하는 경우 "계약서 업로드 완료" 등으로 override.
   */
  submitLabel?: string;
}

type TabKey = "issues" | "content" | "guide";

const RISK_BANNER: Record<
  "high" | "medium" | "low",
  {
    label: string;
    bg: string;
    color: string;
    icon: string;
    text: string;
    desc: string;
    border: string;
  }
> = {
  high: {
    label: "위험",
    bg: "#FEE2E2",
    color: "#B91C1C",
    icon: "❗",
    text: "위험 항목 다수 발견",
    desc: "이 계약서는 즉시 수정이 필요한 항목이 여러 개 있습니다.",
    border: "#B91C1C",
  },
  medium: {
    label: "주의",
    bg: "#FEF3C7",
    color: "#92400E",
    icon: "⚠️",
    text: "확인이 필요한 부분",
    desc: "조건 일부가 명시되지 않았거나 검토가 필요합니다.",
    border: "#92400E",
  },
  low: {
    label: "양호",
    bg: "#DCFCE7",
    color: "#15803D",
    icon: "✓",
    text: "주요 위험 없음",
    desc: "현재 계약서에서 위험 신호가 발견되지 않았습니다.",
    border: "#15803D",
  },
};

const ISSUE_STYLES: Record<
  "danger" | "warning" | "info",
  {
    bg: string;
    color: string;
    label: string;
    border: string;
    titleColor: string;
    descColor: string;
  }
> = {
  danger: {
    bg: "#FEE2E2",
    color: "#B91C1C",
    label: "위험",
    border: "#FCA5A5",
    titleColor: "#B91C1C",
    descColor: "#7F1D1D",
  },
  warning: {
    bg: "#FEF3C7",
    color: "#92400E",
    label: "주의",
    border: "#FDE68A",
    titleColor: "#92400E",
    descColor: "#78350F",
  },
  info: {
    bg: "#EBF3FF",
    color: "#1B64DA",
    label: "정보",
    border: "#BFDBFE",
    titleColor: "#1B64DA",
    descColor: "#1E3A8A",
  },
};

export function ContractAnalysisView({
  result,
  onBack,
  onRegister,
  submitLabel,
}: Props): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>("issues");
  const banner = RISK_BANNER[result.overallRisk];
  const isBelowMinWage =
    result.hourlyWage > 0 && result.hourlyWage < result.minimumWage;

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
    >
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
          {banner.desc !== "" && (
            <Text style={{ fontSize: 11, color: banner.text, marginTop: 8, opacity: 0.85 }}>
              {banner.desc}
            </Text>
          )}
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
                      관련 법률:{" "}
                      {typeof issue.legalBasis === "string"
                        ? issue.legalBasis
                        : (issue.legalBasis?.law ?? "")}
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
                    {issue.relatedCases !== undefined && issue.relatedCases.length > 0 && (
                      <View
                        style={{
                          marginTop: 8,
                          paddingTop: 6,
                          paddingHorizontal: 8,
                          paddingBottom: 8,
                          borderLeftWidth: 2,
                          borderLeftColor: "#7C3AED",
                          backgroundColor: "#F5F3FF",
                          borderRadius: 4,
                          gap: 6,
                        }}
                      >
                        <Text style={{ fontSize: 10, color: "#5B21B6", fontWeight: "700" }}>
                          ⚖️ 관련 판례·해석례 ({issue.relatedCases.length}건)
                        </Text>
                        {issue.relatedCases.map((c, ci) => (
                          <View key={ci} style={{ gap: 2 }}>
                            <Text style={{ fontSize: 10, color: "#5B21B6", fontWeight: "600" }}>
                              {c.header}
                            </Text>
                            <Text style={{ fontSize: 11, color: "#4C1D95", lineHeight: 16 }}>
                              {c.excerpt}
                            </Text>
                          </View>
                        ))}
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
            <ContentRow
              label="계약 종료일"
              value={result.extracted.contractEndDate ?? "미확인"}
            />
            <ContentRow
              label="고용주(상호)"
              value={result.extracted.employerName ?? "미확인"}
            />
            <ContentRow
              label="대표자명"
              value={result.extracted.employerRepresentative ?? "미확인"}
            />
            <ContentRow
              label="고용주 주소"
              value={result.extracted.employerAddress ?? "미확인"}
            />
            <ContentRow
              label="고용주 전화"
              value={result.extracted.employerPhone ?? "미확인"}
            />
          </View>
        )}

        {/* 법률 가이드 탭 */}
        {activeTab === "guide" && (
          <View style={{ gap: 8 }}>
            <GuideCard
              title="위반을 발견했다면 이렇게 하세요"
              law="노동청 진정"
              body="고용노동부 고객상담센터(☎1350) 또는 관할 지방고용노동청에 '진정'을 넣을 수 있어요. 온라인은 고용노동부 노동포털(민원마당)에서 신청합니다. 근로계약서·급여명세·근무기록을 함께 제출하면 처리가 빨라져요."
            />
            {result.issues.length > 0 ? (
              result.issues.map((issue, idx) => {
                const law =
                  typeof issue.legalBasis === "string"
                    ? issue.legalBasis
                    : (issue.legalBasis?.law ?? "관련 법령");
                const body =
                  issue.legalBasisExcerpt !== null &&
                  issue.legalBasisExcerpt !== undefined &&
                  issue.legalBasisExcerpt !== ""
                    ? issue.legalBasisExcerpt
                    : issue.description;
                return (
                  <GuideCard
                    key={idx}
                    title={issue.title}
                    law={law.length > 0 ? law : "관련 법령"}
                    body={body}
                  />
                );
              })
            ) : (
              <GuideCard
                title="계약서상 뚜렷한 위반은 없었어요"
                law="참고"
                body="다만 실제 근무 중 임금체불·주휴수당 미지급이 생기면 근무기록(출퇴근·급여명세)을 모아 신고할 수 있어요."
              />
            )}
            <Text
              style={{
                fontSize: 10,
                color: "#94A3B8",
                lineHeight: 15,
                marginTop: 4,
                paddingHorizontal: 2,
              }}
            >
              ※ 본 가이드는 AI 분석 기반 일반 정보이며 법률 자문이 아닙니다. 구체적
              사안은 공인노무사·변호사와 상담하세요.
            </Text>
          </View>
        )}
      </ScrollView>

      {onRegister !== undefined ? (
        <View
          style={{
            padding: 16,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E2E8F0",
          }}
        >
          <TouchableOpacity
            onPress={onRegister}
            style={{
              backgroundColor: "#3182F6",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
            >
              {submitLabel ?? "사업장 등록하기 →"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
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

// 향후 "계약 내용" 탭 등에서 재사용될 helper — 현재 미사용 상태 보존.
export function CheckRow({ label, value }: { label: string; value: boolean | null }) {
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

export function GuideCard({
  title,
  law,
  body,
}: {
  title: string;
  law: string;
  body: string;
}): JSX.Element {
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

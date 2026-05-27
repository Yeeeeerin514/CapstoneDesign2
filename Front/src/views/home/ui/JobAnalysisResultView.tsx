import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScreenHeader } from "@/shared/ui";
import { useFavoriteWorkplaceStore } from "@/features/favorite-workplace";
import type {
  ExternalCheck,
  JobPostAnalysisResult,
  JobPostIssue,
} from "@/entities/job-post";

interface Props {
  result: JobPostAnalysisResult;
  onBack: () => void;
  onFavoriteAdded: () => void;
}

const LEVEL_COLOR: Record<
  JobPostIssue["level"],
  { bg: string; border: string; title: string; desc: string }
> = {
  danger: {
    bg: "#FEF2F2",
    border: "#EF4444",
    title: "#B91C1C",
    desc: "#DC2626",
  },
  warning: {
    bg: "#FEF9F0",
    border: "#F59E0B",
    title: "#92400E",
    desc: "#B45309",
  },
  info: {
    bg: "#EFF6FF",
    border: "#60A5FA",
    title: "#1D4ED8",
    desc: "#2563EB",
  },
};

const CHECK_STATUS_COLOR: Record<
  ExternalCheck["status"],
  { bg: string; text: string; label: string }
> = {
  RISK: { bg: "#FEE2E2", text: "#B91C1C", label: "위험" },
  CLEAR: { bg: "#DCFCE7", text: "#15803D", label: "이상없음" },
  SKIPPED: { bg: "#F3F4F6", text: "#6B7280", label: "조회생략" },
  NOT_CONFIGURED: { bg: "#F3F4F6", text: "#6B7280", label: "미연동" },
  UNAVAILABLE: { bg: "#FEF3C7", text: "#92400E", label: "조회실패" },
};

const SOURCE_LABEL: Record<string, string> = {
  WAGE_ARREARS_DB: "체불사업주 명단공개 DB",
  NTS_BUSINESS_STATUS: "국세청 사업자등록 상태",
};

export function JobAnalysisResultView({
  result,
  onBack,
  onFavoriteAdded: _onFavoriteAdded,
}: Props) {
  const router = useRouter();
  const addWorkplace = useFavoriteWorkplaceStore((s) => s.addWorkplace);
  const [isFavoriteAdded, setIsFavoriteAdded] = useState(false);

  const dangerCount = result.issues.filter((i) => i.level === "danger").length;
  const warningCount = result.issues.filter((i) => i.level === "warning").length;
  const hasDanger = dangerCount > 0;
  const isBelowMinWage =
    result.hourlyWage > 0 && result.hourlyWage < result.minimumWage2026;

  function handleAddFavorite() {
    if (isFavoriteAdded) {
      onBack();
      router.push("/(tabs)/workplace");
    } else {
      addWorkplace(result.workplaceName);
      setIsFavoriteAdded(true);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScreenHeader showLogo />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E2E8F0",
        }}
      >
        <Pressable onPress={onBack} style={{ padding: 4, marginRight: 8 }} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
          공고 분석 결과
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
      >
        {/* 위험도 배너 */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: hasDanger ? "#FEF2F2" : warningCount > 0 ? "#FEF9F0" : "#F0FDF4",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: hasDanger ? "#B91C1C" : warningCount > 0 ? "#92400E" : "#15803D",
              }}
            >
              {hasDanger
                ? `위험 ${dangerCount}건${warningCount > 0 ? ` · 주의 ${warningCount}건` : ""}`
                : warningCount > 0
                  ? `주의 ${warningCount}건`
                  : "이상 없음"}
            </Text>
            <Text
              style={{
                fontSize: 13,
                marginTop: 4,
                color: hasDanger ? "#DC2626" : warningCount > 0 ? "#B45309" : "#16A34A",
              }}
            >
              {hasDanger
                ? "즉시 확인이 필요합니다"
                : warningCount > 0
                  ? "지원 전 확인이 필요한 항목이 있어요"
                  : "위험 요소가 발견되지 않았어요"}
            </Text>
          </View>
          <Ionicons
            name={hasDanger ? "warning" : warningCount > 0 ? "alert-circle" : "checkmark-circle"}
            size={28}
            color={hasDanger ? "#EF4444" : warningCount > 0 ? "#F59E0B" : "#22C55E"}
          />
        </View>

        {/* 업장 정보 카드 */}
        <View
          style={{
            backgroundColor: "#DBEAFE",
            borderRadius: 12,
            padding: 16,
            gap: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1E3A8A", flex: 1 }}>
              {result.workplaceName}
            </Text>
            <Pressable onPress={handleAddFavorite} hitSlop={8} style={{ padding: 4 }}>
              <Ionicons
                name={isFavoriteAdded ? "star" : "star-outline"}
                size={22}
                color="#2563EB"
              />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <InfoCell
              label="시급"
              value={
                result.hourlyWage > 0
                  ? `${result.hourlyWage.toLocaleString()}원`
                  : result.extracted.hourlyWageText ?? "확인불가"
              }
              valueColor={isBelowMinWage ? "#DC2626" : "#0F172A"}
            />
            <InfoCell label="근무 시간" value={result.workHours} />
            <InfoCell
              label="주휴수당"
              value={result.hasWeeklyHolidayPay ? "있음" : "미언급"}
              valueColor={result.hasWeeklyHolidayPay ? "#0F172A" : "#B45309"}
            />
            <InfoCell label="사업자 상태" value={result.businessStatus} />
          </View>
        </View>

        {/* AI 종합 평가 */}
        {result.overallAssessment !== null && result.overallAssessment !== "" && (
          <View
            style={{
              backgroundColor: "#F0F9FF",
              borderRadius: 12,
              padding: 14,
              borderWidth: 0.5,
              borderColor: "#7DD3FC",
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#0369A1" }}>
              🤖 AI 종합 평가
            </Text>
            <Text style={{ fontSize: 14, lineHeight: 20, color: "#0C4A6E", fontWeight: "600" }}>
              {result.overallAssessment}
            </Text>
          </View>
        )}

        {/* 종합 요약 */}
        {result.summary !== "" && (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 14,
              borderWidth: 0.5,
              borderColor: "#E5E7EB",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#0F172A", marginBottom: 6 }}>
              종합 요약
            </Text>
            <Text style={{ fontSize: 13, lineHeight: 19, color: "#334155" }}>
              {result.summary}
            </Text>
          </View>
        )}

        {/* 문제 목록 */}
        {result.issues.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#0F172A",
                marginTop: 4,
              }}
            >
              우려 사항 ({result.issues.length})
            </Text>
            {result.issues.map((issue, idx) => {
              const c = LEVEL_COLOR[issue.level];
              return (
                <View
                  key={`${issue.title}-${idx}`}
                  style={{
                    backgroundColor: c.bg,
                    borderLeftWidth: 4,
                    borderLeftColor: c.border,
                    borderRadius: 8,
                    padding: 14,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "700", color: c.title }}>
                    {issue.title}
                  </Text>
                  <Text style={{ fontSize: 13, color: c.desc, marginTop: 4, lineHeight: 18 }}>
                    {issue.description}
                  </Text>
                  {issue.evidence !== null && issue.evidence !== "" && (
                    <Text style={{ fontSize: 11, color: c.desc, marginTop: 4, opacity: 0.8 }}>
                      근거: {issue.evidence}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* 외부 공공데이터 조회 결과 */}
        {result.externalChecks.length > 0 && (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 14,
              borderWidth: 0.5,
              borderColor: "#E5E7EB",
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#0F172A" }}>
              공공데이터 조회 결과
            </Text>
            {result.externalChecks.map((c, i) => {
              const style = CHECK_STATUS_COLOR[c.status];
              return (
                <View key={`${c.source}-${i}`} style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View
                      style={{
                        backgroundColor: style.bg,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: style.text, fontWeight: "700" }}>
                        {style.label}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: "#475569", flex: 1 }}>
                      {SOURCE_LABEL[c.source] ?? c.source}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: "#334155", lineHeight: 17, paddingLeft: 4 }}>
                    {c.description}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* 매칭된 업장 후보 */}
        {result.candidates.length > 0 && (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 14,
              borderWidth: 0.5,
              borderColor: "#E5E7EB",
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#0F172A" }}>
              매칭된 사업장 후보 (인허가 DB)
            </Text>
            {result.candidates.map((c, i) => (
              <View
                key={`${c.businessName}-${i}`}
                style={{
                  borderTopWidth: i === 0 ? 0 : 0.5,
                  borderTopColor: "#E5E7EB",
                  paddingTop: i === 0 ? 0 : 8,
                  gap: 2,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#0F172A", flex: 1 }}>
                    {c.businessName}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#64748B" }}>
                    매칭 {c.matchScore}점
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: "#64748B" }}>
                  {c.industry} · {c.businessStatus}
                </Text>
                <Text style={{ fontSize: 11, color: "#64748B" }}>{c.address}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 추출된 공고 정보 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 14,
            borderWidth: 0.5,
            borderColor: "#E5E7EB",
            gap: 6,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: "#0F172A",
              marginBottom: 2,
            }}
          >
            공고에서 추출된 정보
          </Text>
          <ExtractedRow label="업장명" value={result.extracted.businessName} />
          <ExtractedRow label="브랜드" value={result.extracted.brandName} />
          <ExtractedRow
            label="사업자등록번호"
            value={result.extracted.businessRegistrationNumber}
          />
          <ExtractedRow label="전화번호" value={result.extracted.phone} />
          <ExtractedRow label="주소" value={result.extracted.address} />
          <ExtractedRow label="직무" value={result.extracted.jobTitle} />
          <ExtractedRow label="고용형태" value={result.extracted.employmentType} />
          {result.extracted.benefits.length > 0 && (
            <ExtractedRow label="복리후생" value={result.extracted.benefits.join(", ")} />
          )}
        </View>

        {/* 의심 문구 / 누락 정보 */}
        {(result.extracted.suspiciousPhrases.length > 0 ||
          result.extracted.missingInformation.length > 0) && (
          <View
            style={{
              backgroundColor: "#FFFBEB",
              borderRadius: 12,
              padding: 14,
              borderWidth: 0.5,
              borderColor: "#FCD34D",
              gap: 8,
            }}
          >
            {result.extracted.suspiciousPhrases.length > 0 && (
              <View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#92400E",
                    marginBottom: 4,
                  }}
                >
                  ⚠ 의심 문구
                </Text>
                {result.extracted.suspiciousPhrases.map((p, i) => (
                  <Text
                    key={`susp-${i}`}
                    style={{ fontSize: 12, color: "#92400E", lineHeight: 18 }}
                  >
                    · {p}
                  </Text>
                ))}
              </View>
            )}
            {result.extracted.missingInformation.length > 0 && (
              <View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#92400E",
                    marginBottom: 4,
                  }}
                >
                  ? 공고에 없는 정보
                </Text>
                {result.extracted.missingInformation.map((m, i) => (
                  <Text
                    key={`miss-${i}`}
                    style={{ fontSize: 12, color: "#92400E", lineHeight: 18 }}
                  >
                    · {m}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 체불 이력 카드 */}
        {result.wageDelinquencyCount > 0 ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: "#FFF7ED",
              borderRadius: 10,
              padding: 14,
            }}
          >
            <Ionicons name="alert-circle" size={20} color="#EA580C" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#9A3412" }}>
              체불사업주 명단 후보 {result.wageDelinquencyCount}건
            </Text>
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: "#F0FDF4",
              borderRadius: 10,
              padding: 14,
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#15803D" }}>
              체불사업주 명단에 없음
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <View style={{ position: "absolute", left: 16, right: 16, bottom: 24 }}>
        <TouchableOpacity
          onPress={handleAddFavorite}
          activeOpacity={0.85}
          style={{
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isFavoriteAdded ? "#10B981" : "#2563EB",
            paddingVertical: 16,
            borderRadius: 14,
            shadowColor: isFavoriteAdded ? "#10B981" : "#2563EB",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>
            {isFavoriteAdded ? "관심업장 보러가기 →" : "☆ 관심업장으로 등록"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface InfoCellProps {
  label: string;
  value: string;
  valueColor?: string;
}

function InfoCell({ label, value, valueColor = "#0F172A" }: InfoCellProps) {
  return (
    <View
      style={{
        flexBasis: "48%",
        flexGrow: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        padding: 12,
      }}
    >
      <Text style={{ fontSize: 12, color: "#64748B" }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: "700", color: valueColor, marginTop: 4 }}>
        {value}
      </Text>
    </View>
  );
}

function ExtractedRow({ label, value }: { label: string; value: string | null }) {
  if (value === null || value === "") return null;
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Text style={{ fontSize: 12, color: "#64748B", width: 100 }}>{label}</Text>
      <Text style={{ fontSize: 12, color: "#0F172A", flex: 1 }}>{value}</Text>
    </View>
  );
}

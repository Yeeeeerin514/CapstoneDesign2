import { ActivityIndicator, Text, View } from "react-native";
import type { ReportCase } from "@/entities/report";

interface CaseAmountHeaderProps {
  reportCase: ReportCase;
}

/**
 * 사건 헤더 금액 카드 — 규칙:
 *   1단계(evidence_collection): 절대 금액 표시 안 함 ("계산 전" placeholder).
 *   2단계(amount_calculation) + amountCalcState 분기:
 *     - idle:        "계산 전" placeholder ("금액 계산 시작" 버튼 누르라는 안내)
 *     - calculating: 로딩 스피너
 *     - done/confirmed: 계산된 값 분기로 진행
 *   3단계 이후 (또는 2단계 done/confirmed):
 *     - calculatedUnpaid !== null → 미지급 임금 (빨강) + 분해식
 *     - calculatedWageOwed !== null → 받아야 할 금액 (추정) + 통장 요청 배너
 *     - calculatedPaidAmount !== null → 확인된 수령액 + 시급 요청 배너
 *     - 모두 null → 빈 영역 (null 반환)
 */
export function CaseAmountHeader({
  reportCase,
}: CaseAmountHeaderProps): JSX.Element | null {
  // ── 1단계: 금액 절대 노출 금지
  if (reportCase.currentStep === "evidence_collection") {
    return (
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: "#F5F5F0",
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: "#888888",
            fontWeight: "500",
            marginBottom: 4,
          }}
        >
          미지급금 계산 전
        </Text>
        <Text style={{ fontSize: 13, color: "#AAAAAA", lineHeight: 18 }}>
          {"증거 수집이 완료되면\n다음 단계에서 미지급금을 계산합니다"}
        </Text>
      </View>
    );
  }

  // ── 2단계 + 사용자 아직 계산 시작 안 함
  if (
    reportCase.currentStep === "amount_calculation" &&
    reportCase.amountCalcState === "idle"
  ) {
    return (
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: "#F5F5F0",
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: "#888888",
            fontWeight: "500",
            marginBottom: 4,
          }}
        >
          미지급금 계산 전
        </Text>
        <Text style={{ fontSize: 13, color: "#AAAAAA", lineHeight: 18 }}>
          {
            "아래 \"금액 계산 시작\" 버튼을 누르면\n수집된 증거를 바탕으로 계산해드려요"
          }
        </Text>
      </View>
    );
  }

  // ── 2단계 + 계산 중
  if (
    reportCase.currentStep === "amount_calculation" &&
    reportCase.amountCalcState === "calculating"
  ) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          paddingVertical: 20,
          backgroundColor: "#F8FAFC",
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        <ActivityIndicator size="small" color="#1A5FAF" />
        <Text style={{ fontSize: 14, color: "#1A5FAF", fontWeight: "600" }}>
          미지급금 계산 중...
        </Text>
      </View>
    );
  }

  // ── 2단계 done/confirmed 또는 3단계 이후 — 실제 계산값 기반 표시
  if (reportCase.calculatedUnpaid !== null) {
    return (
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 12, color: "#888888", marginBottom: 4 }}>
          미지급 임금 추정액
        </Text>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: "#E24B4A",
            marginBottom: 4,
          }}
        >
          {`₩${reportCase.calculatedUnpaid.toLocaleString()}`}
        </Text>
        <View
          style={{
            backgroundColor: "#FFF0F0",
            borderRadius: 8,
            padding: 8,
            borderWidth: 0.5,
            borderColor: "#F7C1C1",
          }}
        >
          <Text style={{ fontSize: 12, color: "#A32D2D" }}>
            {`받아야 할 금액 ₩${(reportCase.calculatedWageOwed ?? 0).toLocaleString()} − 실제 수령액 ₩${(reportCase.calculatedPaidAmount ?? 0).toLocaleString()}`}
          </Text>
        </View>
      </View>
    );
  }

  if (reportCase.calculatedWageOwed !== null) {
    return (
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 12, color: "#888888", marginBottom: 4 }}>
          받아야 할 금액 (추정)
        </Text>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: "#BA7517",
            marginBottom: 8,
          }}
        >
          {`₩${reportCase.calculatedWageOwed.toLocaleString()}`}
        </Text>
        <View
          style={{
            backgroundColor: "#FAEEDA",
            borderRadius: 10,
            padding: 10,
            borderWidth: 0.5,
            borderColor: "#FAC775",
          }}
        >
          <Text style={{ fontSize: 12, color: "#633806", lineHeight: 18 }}>
            {
              "⚠️ 실제 수령액을 모릅니다\n통장 내역이나 급여명세서를 추가하면\n정확한 미지급금이 계산됩니다"
            }
          </Text>
        </View>
      </View>
    );
  }

  if (reportCase.calculatedPaidAmount !== null) {
    return (
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 12, color: "#888888", marginBottom: 4 }}>
          확인된 수령액
        </Text>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: "#444444",
            marginBottom: 8,
          }}
        >
          {`₩${reportCase.calculatedPaidAmount.toLocaleString()}`}
        </Text>
        <View
          style={{
            backgroundColor: "#FAEEDA",
            borderRadius: 10,
            padding: 10,
            borderWidth: 0.5,
            borderColor: "#FAC775",
          }}
        >
          <Text style={{ fontSize: 12, color: "#633806", lineHeight: 18 }}>
            {
              "⚠️ 받아야 할 금액을 모릅니다\n근로계약서나 시급을 입력하면\n미지급금이 계산됩니다"
            }
          </Text>
        </View>
      </View>
    );
  }

  // 계산값이 전혀 없으면 빈 영역
  return null;
}

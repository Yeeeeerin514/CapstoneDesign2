import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getAmountCalcReadiness,
  type FileEvidenceKey,
  type ReportCase,
} from "@/entities/report";

interface EvidenceTodoBoxProps {
  reportCase: ReportCase;
  /**
   * 특정 증거 종류를 안내. 상위(ReportDetailView)가 EvidenceSection 해당 행으로 스크롤 + 강조.
   * 파일 추가 자체는 EvidenceSection의 [+ 추가] 버튼이 ActionSheet로 진행.
   */
  onScrollToEvidence: (key: FileEvidenceKey) => void;
  /** 시급·근무시간 직접 입력 모달 진입. */
  onManualInputWage: () => void;
  /** 증거 충분 → 다음 단계로 진행. */
  onEvidenceComplete: () => void;
}

/**
 * Step 1 (evidence_collection) "지금 해야 할 일" 박스.
 * readiness 4-way 분기 — 사용자 다음 행동을 가장 적합한 형태로 안내.
 */
export function EvidenceTodoBox({
  reportCase,
  onScrollToEvidence,
  onManualInputWage,
  onEvidenceComplete,
}: EvidenceTodoBoxProps): JSX.Element {
  const readiness = getAmountCalcReadiness(reportCase.evidence);

  if (readiness === "none") {
    return (
      <TodoCard>
        <TodoHeader title="증거 수집을 시작해볼까요?" />
        <Text style={todoDescStyle}>
          미지급금을 계산하려면 두 가지가 필요해요
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            marginBottom: 8,
          }}
        >
          <GuideColumn
            tone="blue"
            title="① 받아야 할 금액"
            desc={"근로계약서\n또는 출퇴근 기록"}
            hint="💡 앱에서 자동 수집 중"
          />
          <Text
            style={{ fontSize: 20, fontWeight: "300", color: "#888888" }}
          >
            −
          </Text>
          <GuideColumn
            tone="amber"
            title="② 실제 받은 금액"
            desc={"통장 내역\n또는 급여명세서"}
            hint="← 직접 추가 필요"
          />
        </View>

        <Text
          style={{
            textAlign: "center",
            fontSize: 13,
            fontWeight: "600",
            color: "#0F6E56",
            marginBottom: 12,
          }}
        >
          = 미지급금 계산 완료
        </Text>

        <Text
          style={{
            fontSize: 12,
            color: "#64748B",
            lineHeight: 18,
          }}
        >
          {
            "근무기록과 계약서는 앱에서 자동으로 수집하고 있어요.\n통장 내역 또는 급여명세서를 직접 추가해주세요."
          }
        </Text>
      </TodoCard>
    );
  }

  if (readiness === "partial_wage") {
    return (
      <TodoCard>
        <TodoHeader title="통장 내역만 추가하면 돼요!" />
        <Text style={todoDescStyle}>
          {
            "받아야 할 금액은 계산됐어요.\n이제 실제로 얼마를 받았는지만 확인하면 미지급금이 나와요."
          }
        </Text>

        <ProgressRow
          left={{ label: "① 받아야 할 금액", state: "done" }}
          right={{ label: "② 실제 받은 금액", state: "highlight" }}
        />

        <PrimaryBtn
          label="🏦 통장 내역 추가하기"
          onPress={() => onScrollToEvidence("bankRecords")}
        />
        <SecondaryBtn
          label="급여명세서로 대체하기"
          onPress={() => onScrollToEvidence("paystubs")}
        />
      </TodoCard>
    );
  }

  if (readiness === "partial_paid") {
    return (
      <TodoCard>
        <TodoHeader title="시급이나 근무시간을 알려주세요" />
        <Text style={todoDescStyle}>
          {
            "받으신 금액은 확인됐어요.\n받아야 할 금액을 계산하려면 시급과 근무시간이 필요해요."
          }
        </Text>

        <ProgressRow
          left={{ label: "① 받아야 할 금액", state: "highlight" }}
          right={{ label: "② 실제 받은 금액", state: "done" }}
        />

        <PrimaryBtn
          label="📋 근로계약서 추가하기"
          onPress={() => onScrollToEvidence("contracts")}
        />
        <SecondaryBtn
          label="시급·근무시간 직접 입력"
          onPress={onManualInputWage}
        />
      </TodoCard>
    );
  }

  // ready — Step 1은 증거 수집 단계. 실제 금액 계산은 Step 2에서 진행되므로
  // "미지급금 계산 완료" 표현 금지 — 증거가 충분히 모였다는 의미만 전달.
  return (
    <TodoCard>
      <TodoHeader title="증거 수집 완료! 다음 단계로 가요" />
      <Text style={todoDescStyle}>
        {
          "두 종류 증거가 모두 모였어요.\n다음 단계에서 미지급 금액을 계산할게요."
        }
      </Text>

      <PrimaryBtn
        label="증거 충분해요, 다음 단계로 →"
        onPress={onEvidenceComplete}
      />
    </TodoCard>
  );
}

// ──────────────────────────────────────
// 내부 서브 컴포넌트
// ──────────────────────────────────────

const todoDescStyle = {
  fontSize: 13,
  color: "#475569",
  lineHeight: 20,
  marginBottom: 4,
};

function TodoCard({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <View
      style={{
        backgroundColor: "#FEF3C7",
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#FCD34D",
      }}
    >
      {children}
    </View>
  );
}

function TodoHeader({ title }: { title: string }): JSX.Element {
  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <Ionicons name="flag" size={16} color="#92400E" />
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#92400E" }}>
          지금 해야 할 일
        </Text>
      </View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: "#78350F",
          marginBottom: 4,
        }}
      >
        {title}
      </Text>
    </>
  );
}

type ColumnTone = "blue" | "amber";

interface GuideColumnProps {
  tone: ColumnTone;
  title: string;
  desc: string;
  hint: string;
}

function GuideColumn({
  tone,
  title,
  desc,
  hint,
}: GuideColumnProps): JSX.Element {
  const palette =
    tone === "blue"
      ? { bg: "#EBF3FF", border: "#B5D4F4" }
      : { bg: "#FAEEDA", border: "#FAC775" };
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 10,
        padding: 12,
        gap: 4,
        backgroundColor: palette.bg,
        borderWidth: 0.5,
        borderColor: palette.border,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "600", color: "#333333" }}>
        {title}
      </Text>
      <Text style={{ fontSize: 12, color: "#555555", lineHeight: 18 }}>
        {desc}
      </Text>
      <Text style={{ fontSize: 11, color: "#888888", marginTop: 4 }}>
        {hint}
      </Text>
    </View>
  );
}

type ChipState = "done" | "highlight" | "pending";

interface ProgressRowProps {
  left: { label: string; state: ChipState };
  right: { label: string; state: ChipState };
}

function ProgressRow({ left, right }: ProgressRowProps): JSX.Element {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginVertical: 12,
      }}
    >
      <ProgressChip {...left} />
      <Text style={{ fontSize: 16, color: "#888888" }}>→</Text>
      <ProgressChip {...right} />
    </View>
  );
}

function ProgressChip({
  label,
  state,
}: {
  label: string;
  state: ChipState;
}): JSX.Element {
  const palette =
    state === "done"
      ? {
          bg: "#EAF3DE",
          border: "#C0DD97",
          textColor: "#3B6D11",
          textWeight: "400" as const,
          borderWidth: 0.5,
        }
      : state === "highlight"
        ? {
            bg: "#EBF3FF",
            border: "#1A5FAF",
            textColor: "#185FA5",
            textWeight: "600" as const,
            borderWidth: 1.5,
          }
        : {
            bg: "#F0EFE8",
            border: "#D3D1C7",
            textColor: "#888888",
            textWeight: "400" as const,
            borderWidth: 0.5,
          };
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 8,
        padding: 8,
        backgroundColor: palette.bg,
        borderWidth: palette.borderWidth,
        borderColor: palette.border,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontSize: 11,
          color: palette.textColor,
          fontWeight: palette.textWeight,
        }}
      >
        {`${state === "done" ? "✓ " : ""}${label}`}
      </Text>
    </View>
  );
}

function PrimaryBtn({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}): JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: "#3182F6",
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 8,
      }}
    >
      <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SecondaryBtn({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}): JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: "#FFFFFF",
        paddingVertical: 11,
        borderRadius: 10,
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#3182F6",
        marginTop: 8,
      }}
    >
      <Text style={{ color: "#3182F6", fontSize: 14, fontWeight: "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}

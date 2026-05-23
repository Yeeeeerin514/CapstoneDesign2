import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ReportCase } from "@/entities/report";

interface AmountCalcTodoBoxProps {
  reportCase: ReportCase;
  /** "금액 계산 시작" — store.startAmountCalc + (mock delay 후) finishAmountCalc 트리거. */
  onStartCalc: () => void;
  /** "금액 확인 완료, 다음 단계로" — store.confirmAmountCalc → step 3 진행. */
  onConfirm: () => void;
  /** "금액이 다른 것 같아요 (수정하기)" — 증거 추가/시급 수동 입력 등으로 분기. */
  onEdit: () => void;
}

/**
 * Step 2 (amount_calculation) 전용 "지금 해야 할 일" 박스.
 * reportCase.amountCalcState에 따라 4-way:
 *   idle      → "금액 계산 시작" 버튼만
 *   calculating → 로딩 스피너
 *   done      → 금액 확인 요청 (primary "확인 완료" / secondary "다른 것 같아요")
 *   confirmed → 보통 단계가 이미 3으로 넘어갔으므로 노출되지 않음. fallback으로 안내만.
 */
export function AmountCalcTodoBox({
  reportCase,
  onStartCalc,
  onConfirm,
  onEdit,
}: AmountCalcTodoBoxProps): JSX.Element {
  const state = reportCase.amountCalcState;

  if (state === "idle") {
    return (
      <TodoCard>
        <TodoHeader title="미지급 금액을 계산할게요" />
        <Text style={todoDescStyle}>
          {"근무시간과 계약 시급을 기반으로\n미지급금을 산정합니다"}
        </Text>
        <PrimaryBtn label="금액 계산 시작" onPress={onStartCalc} />
      </TodoCard>
    );
  }

  if (state === "calculating") {
    return (
      <TodoCard>
        <TodoHeader title="계산 중..." />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 8,
          }}
        >
          <ActivityIndicator size="small" color="#1A5FAF" />
          <Text style={{ fontSize: 13, color: "#475569" }}>
            증거 데이터를 분석하고 있어요
          </Text>
        </View>
      </TodoCard>
    );
  }

  if (state === "done") {
    return (
      <TodoCard>
        {/* "미지급금 계산 완료" 표현은 Step 2 done에서만 사용 — Step 1 ready와 의도적으로 구분 */}
        <TodoHeader title="미지급금 계산 완료! 금액을 확인해주세요" />
        <Text style={todoDescStyle}>
          {
            "위의 추정액이 맞나요?\n금액이 다르다면 증거를 추가하거나 직접 수정할 수 있어요."
          }
        </Text>
        <PrimaryBtn
          label="금액 확인 완료, 다음 단계로 →"
          onPress={onConfirm}
        />
        <SecondaryBtn
          label="금액이 다른 것 같아요 (수정하기)"
          onPress={onEdit}
        />
      </TodoCard>
    );
  }

  // confirmed — 보통 currentStep이 group_decision으로 바뀌므로 안 보이지만 fallback.
  return (
    <TodoCard>
      <TodoHeader title="금액 확인 완료" />
      <Text style={todoDescStyle}>다음 단계로 진행 중입니다.</Text>
    </TodoCard>
  );
}

// ──────────────────────────────────────
// 내부 서브 컴포넌트 — EvidenceTodoBox와 비주얼 통일
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

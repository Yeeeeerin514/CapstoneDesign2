import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

interface ManualWageInputModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (hourlyWage: number, workHours: number) => void;
}

const MIN_WAGE_2026 = 10_030;

/**
 * 계약서가 없는 경우 사용자가 시급·근무시간을 직접 입력하는 바텀시트.
 * Phase A: 단순 입력 → onConfirm으로 상위에 전달, 상위가 store.setManualWageInput 호출.
 */
export function ManualWageInputModal({
  visible,
  onClose,
  onConfirm,
}: ManualWageInputModalProps): JSX.Element {
  const [hourlyWage, setHourlyWage] = useState("");
  const [workHours, setWorkHours] = useState("");

  useEffect(() => {
    if (!visible) {
      setHourlyWage("");
      setWorkHours("");
    }
  }, [visible]);

  const wageNum = parseInt(hourlyWage.replace(/,/g, ""), 10);
  const hoursNum = parseFloat(workHours);
  const wageValid = Number.isFinite(wageNum) && wageNum > 0;
  const hoursValid = Number.isFinite(hoursNum) && hoursNum > 0;
  const isBelowMinWage = wageValid && wageNum < MIN_WAGE_2026;
  const canConfirm = wageValid && hoursValid;
  const previewAmount = canConfirm ? wageNum * hoursNum : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.55)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={onClose}
          accessibilityLabel="모달 닫기"
        />
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            padding: 20,
            paddingBottom: 28,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: "#0F172A",
              marginBottom: 6,
            }}
          >
            시급·근무시간 직접 입력
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#64748B",
              lineHeight: 19,
              marginBottom: 18,
            }}
          >
            {"계약서가 없어도 괜찮아요.\n기억하는 시급과 근무시간을 입력해주세요."}
          </Text>

          {/* 시급 */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#0F172A",
                marginBottom: 6,
              }}
            >
              시급
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#F8FAFC",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isBelowMinWage ? "#F87171" : "#E2E8F0",
                paddingHorizontal: 12,
              }}
            >
              <TextInput
                value={hourlyWage}
                onChangeText={(v) => setHourlyWage(v.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                placeholder="예: 10030"
                placeholderTextColor="#94A3B8"
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: "#0F172A",
                  paddingVertical: 12,
                }}
              />
              <Text style={{ fontSize: 14, color: "#64748B", marginLeft: 4 }}>
                원
              </Text>
            </View>
            {isBelowMinWage ? (
              <Text
                style={{
                  fontSize: 12,
                  color: "#B91C1C",
                  marginTop: 6,
                  lineHeight: 17,
                }}
              >
                {`⚠️ 2026년 최저임금(₩${MIN_WAGE_2026.toLocaleString()})보다 낮아요. 최저임금 위반으로 추가 청구 가능해요.`}
              </Text>
            ) : null}
            <Pressable
              onPress={() => setHourlyWage(String(MIN_WAGE_2026))}
              hitSlop={6}
              style={{ marginTop: 8, alignSelf: "flex-start" }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: "#3182F6",
                  fontWeight: "600",
                }}
              >
                {`최저임금 ${MIN_WAGE_2026.toLocaleString()}원으로 입력`}
              </Text>
            </Pressable>
          </View>

          {/* 총 근무시간 */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#0F172A",
                marginBottom: 6,
              }}
            >
              총 미지급 근무시간
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#F8FAFC",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                paddingHorizontal: 12,
              }}
            >
              <TextInput
                value={workHours}
                onChangeText={setWorkHours}
                keyboardType="decimal-pad"
                placeholder="예: 80"
                placeholderTextColor="#94A3B8"
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: "#0F172A",
                  paddingVertical: 12,
                }}
              />
              <Text style={{ fontSize: 14, color: "#64748B", marginLeft: 4 }}>
                시간
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: "#94A3B8",
                marginTop: 6,
              }}
            >
              💡 하루 8시간 × 10일 = 80시간
            </Text>
          </View>

          {/* 계산 미리보기 */}
          {canConfirm ? (
            <View
              style={{
                backgroundColor: "#EBF3FF",
                borderRadius: 10,
                padding: 12,
                marginBottom: 16,
                borderWidth: 0.5,
                borderColor: "#B5D4F4",
              }}
            >
              <Text
                style={{ fontSize: 12, color: "#1B64DA", marginBottom: 2 }}
              >
                받아야 할 금액 (기본급)
              </Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: "#0F172A",
                  marginBottom: 4,
                }}
              >
                {`₩${previewAmount.toLocaleString()}`}
              </Text>
              <Text style={{ fontSize: 11, color: "#64748B" }}>
                주휴수당·연장수당은 다음 단계에서 계산됩니다
              </Text>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={onClose}
              style={{
                flex: 1,
                paddingVertical: 13,
                backgroundColor: "#F8FAFC",
                borderRadius: 10,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#E2E8F0",
              }}
            >
              <Text
                style={{
                  color: "#475569",
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                취소
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (canConfirm) onConfirm(wageNum, hoursNum);
              }}
              disabled={!canConfirm}
              style={{
                flex: 2,
                paddingVertical: 13,
                backgroundColor: canConfirm ? "#3182F6" : "#CBD5E1",
                borderRadius: 10,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                입력 완료
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

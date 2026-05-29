import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { WageBreakdown } from "@/entities/report";

interface WageBreakdownCardProps {
  breakdown: WageBreakdown;
  actualReceivedAmount: number | null;
  manualUnpaidAmount: number | null;
  /** 실제 수령액 입력 변경 콜백. */
  onChangeReceived: (value: number | null) => void;
  /**
   * 편집 모드 저장 콜백 — 편집된 totalShouldReceive를 받아
   * (편집된 total - actualReceivedAmount)를 manualUnpaidAmount로 저장하도록 상위에서 처리.
   */
  onSaveManualTotal: (manualUnpaidAmount: number | null) => void;
}

/**
 * Step 2 done 상태에서 표시되는 임금 분해 카드.
 * - Display 모드: 5항목 + 최저시급 + 미지급 추정액 + 실제수령액 입력
 * - Edit 모드: 5항목 TextInput + 자동 합계 + 저장
 */
export function WageBreakdownCard({
  breakdown,
  actualReceivedAmount,
  manualUnpaidAmount,
  onChangeReceived,
  onSaveManualTotal,
}: WageBreakdownCardProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  // 편집용 로컬 state — 시작 시 breakdown 값으로 초기화
  const [editBase, setEditBase] = useState(String(breakdown.basePay));
  const [editHoliday, setEditHoliday] = useState(
    String(breakdown.weeklyHolidayPay),
  );
  const [editOvertime, setEditOvertime] = useState(String(breakdown.overtimePay));
  const [editNight, setEditNight] = useState(String(breakdown.nightPay));

  const enterEdit = (): void => {
    setEditBase(String(breakdown.basePay));
    setEditHoliday(String(breakdown.weeklyHolidayPay));
    setEditOvertime(String(breakdown.overtimePay));
    setEditNight(String(breakdown.nightPay));
    setIsEditing(true);
  };

  const handleSave = (): void => {
    const base = parseInt(editBase.replace(/,/g, ""), 10) || 0;
    const holiday = parseInt(editHoliday.replace(/,/g, ""), 10) || 0;
    const overtime = parseInt(editOvertime.replace(/,/g, ""), 10) || 0;
    const night = parseInt(editNight.replace(/,/g, ""), 10) || 0;
    const total = base + holiday + overtime + night;
    const received = actualReceivedAmount ?? 0;
    onSaveManualTotal(Math.max(0, total - received));
    setIsEditing(false);
  };

  const handleCancel = (): void => {
    setIsEditing(false);
  };

  // Display 모드: manualUnpaidAmount > totalShouldReceive - actualReceived
  const received = actualReceivedAmount ?? 0;
  const unpaidDisplay =
    manualUnpaidAmount !== null
      ? manualUnpaidAmount
      : Math.max(0, breakdown.totalShouldReceive - received);

  // Edit 모드 미리보기 합계
  const editTotal = isEditing
    ? (parseInt(editBase.replace(/,/g, ""), 10) || 0) +
      (parseInt(editHoliday.replace(/,/g, ""), 10) || 0) +
      (parseInt(editOvertime.replace(/,/g, ""), 10) || 0) +
      (parseInt(editNight.replace(/,/g, ""), 10) || 0)
    : 0;

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
      }}
    >
      {!isEditing ? (
        <>
          {/* 미지급 추정액 헤더 */}
          <Text style={{ fontSize: 12, color: "#888888", marginBottom: 4 }}>
            미지급 추정액
          </Text>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#E24B4A",
              marginBottom: 6,
            }}
          >
            {`₩${unpaidDisplay.toLocaleString()}원`}
          </Text>
          <Text style={{ fontSize: 12, color: "#475569", marginBottom: 14 }}>
            {manualUnpaidAmount !== null
              ? "사용자가 수정한 금액입니다"
              : `받아야 할 금액 ₩${breakdown.totalShouldReceive.toLocaleString()} − 실제 수령액 ₩${received.toLocaleString()}`}
          </Text>

          {/* 5개 항목 */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: "#F1F5F9",
              paddingTop: 10,
              gap: 6,
            }}
          >
            <Row label="기본급" value={breakdown.basePay} />
            <Row label="주휴수당" value={breakdown.weeklyHolidayPay} />
            <Row label="연장수당" value={breakdown.overtimePay} />
            <Row label="야간수당" value={breakdown.nightPay} />
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: "#F1F5F9",
                paddingTop: 6,
                marginTop: 4,
              }}
            >
              <Row
                label="받아야 할 금액 합계"
                value={breakdown.totalShouldReceive}
                emphasis
              />
            </View>
          </View>

          {/* 실제 수령액 입력 */}
          <View style={{ marginTop: 12 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#0F172A",
                marginBottom: 6,
              }}
            >
              실제 수령액
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
                value={
                  actualReceivedAmount !== null
                    ? actualReceivedAmount.toLocaleString()
                    : ""
                }
                onChangeText={(v) => {
                  const num = parseInt(v.replace(/[^0-9]/g, ""), 10);
                  onChangeReceived(Number.isFinite(num) ? num : null);
                }}
                keyboardType="numeric"
                placeholder="실제 받은 금액"
                placeholderTextColor="#94A3B8"
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: "#0F172A",
                  paddingVertical: 10,
                }}
              />
              <Text style={{ fontSize: 14, color: "#64748B" }}>원</Text>
            </View>
          </View>

          {/* 기준 최저시급 */}
          <View
            style={{
              marginTop: 10,
              flexDirection: "row",
              justifyContent: "space-between",
              backgroundColor: "#EFF6FF",
              borderRadius: 8,
              padding: 8,
            }}
          >
            <Text style={{ fontSize: 12, color: "#1D4ED8" }}>
              기준 최저시급
            </Text>
            <Text style={{ fontSize: 12, color: "#1D4ED8", fontWeight: "600" }}>
              {`₩${breakdown.minimumWage.toLocaleString()}원`}
            </Text>
          </View>

          {/* 수정하기 버튼 */}
          <Pressable
            onPress={enterEdit}
            style={{
              marginTop: 12,
              paddingVertical: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#3182F6",
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Ionicons name="create-outline" size={14} color="#3182F6" />
            <Text style={{ fontSize: 13, color: "#3182F6", fontWeight: "600" }}>
              금액이 다른 것 같아요 (수정하기)
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          {/* Edit 모드 */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#0F172A",
              marginBottom: 4,
            }}
          >
            금액 직접 수정
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>
            각 항목을 직접 수정하면 합계가 자동 갱신됩니다.
          </Text>

          <EditRow label="기본급" value={editBase} onChange={setEditBase} />
          <EditRow
            label="주휴수당"
            value={editHoliday}
            onChange={setEditHoliday}
          />
          <EditRow
            label="연장수당"
            value={editOvertime}
            onChange={setEditOvertime}
          />
          <EditRow label="야간수당" value={editNight} onChange={setEditNight} />

          {/* 합계 미리보기 */}
          <View
            style={{
              marginTop: 10,
              padding: 10,
              backgroundColor: "#EBF3FF",
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 12, color: "#1B64DA", marginBottom: 2 }}>
              받아야 할 금액 합계 (편집)
            </Text>
            <Text
              style={{ fontSize: 20, fontWeight: "700", color: "#0F172A" }}
            >
              {`₩${editTotal.toLocaleString()}원`}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Pressable
              onPress={handleCancel}
              style={{
                flex: 1,
                paddingVertical: 12,
                backgroundColor: "#F8FAFC",
                borderRadius: 10,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#E2E8F0",
              }}
            >
              <Text style={{ color: "#475569", fontSize: 14, fontWeight: "500" }}>
                취소
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={{
                flex: 2,
                paddingVertical: 12,
                backgroundColor: "#3182F6",
                borderRadius: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
                저장
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}): JSX.Element {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 2,
      }}
    >
      <Text
        style={{
          fontSize: emphasis === true ? 14 : 13,
          color: emphasis === true ? "#0F172A" : "#475569",
          fontWeight: emphasis === true ? "700" : "400",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: emphasis === true ? 14 : 13,
          color: emphasis === true ? "#0F172A" : "#0F172A",
          fontWeight: emphasis === true ? "700" : "500",
        }}
      >
        {`₩${value.toLocaleString()}원`}
      </Text>
    </View>
  );
}

function EditRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        gap: 8,
      }}
    >
      <Text style={{ flex: 1, fontSize: 13, color: "#0F172A" }}>{label}</Text>
      <View
        style={{
          flex: 1.4,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#F8FAFC",
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          paddingHorizontal: 10,
        }}
      >
        <TextInput
          value={value}
          onChangeText={(v) => onChange(v.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#94A3B8"
          style={{ flex: 1, fontSize: 14, color: "#0F172A", paddingVertical: 8 }}
        />
        <Text style={{ fontSize: 12, color: "#64748B" }}>원</Text>
      </View>
    </View>
  );
}

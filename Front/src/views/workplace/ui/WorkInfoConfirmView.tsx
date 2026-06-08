import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenHeader } from "@/shared/ui";
import { useMinimumWageStore } from "@/shared/lib/minimum-wage-store";
import type { WorkInfoInput } from "@/features/favorite-workplace";
import type { ContractAnalysisResult } from "@/entities/job-post";

interface WorkInfoConfirmViewProps {
  workplaceName: string;
  workInfo: WorkInfoInput;
  /** "AI 자동입력" / "직접 입력" 배지 분기. */
  isFromContract: boolean;
  /** 계약서 path에서 "이슈 N건 보기" 링크 노출용. */
  contractAnalysis?: ContractAnalysisResult;
  onBack: () => void;
  /** "확인 · Wi-Fi 등록 →" — 인라인 편집된 최종 값을 인자로 전달. */
  onConfirm: (updated: WorkInfoInput) => void;
  onViewIssues?: () => void;
}

const ALL_DAYS = [
  { key: "MONDAY", label: "월" },
  { key: "TUESDAY", label: "화" },
  { key: "WEDNESDAY", label: "수" },
  { key: "THURSDAY", label: "목" },
  { key: "FRIDAY", label: "금" },
  { key: "SATURDAY", label: "토" },
  { key: "SUNDAY", label: "일" },
] as const;

const DAY_LABEL: Record<string, string> = Object.fromEntries(
  ALL_DAYS.map((d) => [d.key, d.label]),
);

function formatDays(days: string[]): string {
  if (days.length === 0) return "-";
  return days.map((d) => DAY_LABEL[d] ?? d).join("·");
}

function parseHHMM(value: string): Date {
  const [h, m] = value.split(":").map((s) => parseInt(s, 10));
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

function formatHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function parseDateIso(value: string): Date {
  const [y, m, d] = value.split("-").map((s) => parseInt(s, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return new Date();
  }
  return new Date(y, m - 1, d);
}

function formatDateIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

/** 입력 문자열 → HH:mm 정규화 (숫자만 추출 후 자동 콜론). 웹 수동 입력용. */
function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + ":" + digits.slice(2, 4);
}

/** 입력 문자열 → YYYY-MM-DD 정규화. 웹 수동 입력용. */
function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let out = digits.slice(0, 4);
  if (digits.length > 4) out += "-" + digits.slice(4, 6);
  if (digits.length > 6) out += "-" + digits.slice(6, 8);
  return out;
}

/** 시간/날짜 수동 입력 행 (웹용) — TextInput + 완료 버튼. 시급 편집 UI와 동일 톤. */
function InlineEditField({
  value,
  onChangeText,
  placeholder,
  maxLength,
  onDone,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  maxLength: number;
  onDone: () => void;
}): JSX.Element {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingBottom: 12,
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType="number-pad"
        maxLength={maxLength}
        autoFocus
        style={{
          flex: 1,
          fontSize: 15,
          color: "#0F172A",
          backgroundColor: "#F8FAFC",
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#3182F6",
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      />
      <Pressable
        onPress={onDone}
        style={{
          backgroundColor: "#3182F6",
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>
          완료
        </Text>
      </Pressable>
    </View>
  );
}

type EditField =
  | "workDays"
  | "workStartTime"
  | "workEndTime"
  | "startDay"
  | "hourlyWage"
  | null;

export function WorkInfoConfirmView({
  workplaceName,
  workInfo,
  isFromContract,
  contractAnalysis,
  onBack,
  onConfirm,
  onViewIssues,
}: WorkInfoConfirmViewProps): JSX.Element {
  const minimumWage = useMinimumWageStore((s) => s.minimumWage) ?? 10_030;

  // 로컬 편집 가능한 사본. onConfirm 시 propagate.
  const [info, setInfo] = useState<WorkInfoInput>(workInfo);
  const [editing, setEditing] = useState<EditField>(null);
  // 시급 편집용 임시 텍스트 (TextInput 입력 중 빈 문자열 허용)
  const [wageText, setWageText] = useState<string>(
    info.hourlyWage !== undefined ? String(info.hourlyWage) : "",
  );
  // iOS의 spinner picker는 picker show 토글 필요 — Android는 모달이라 자동.
  const [showTimePicker, setShowTimePicker] = useState<
    "workStartTime" | "workEndTime" | null
  >(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const wageBelowMin =
    info.hourlyWage !== undefined &&
    info.hourlyWage > 0 &&
    info.hourlyWage < minimumWage;
  const issueCount = contractAnalysis?.issues?.length ?? 0;

  const toggleDay = (key: string): void => {
    setInfo((prev) => ({
      ...prev,
      workDays: prev.workDays.includes(key)
        ? prev.workDays.filter((d) => d !== key)
        : [...prev.workDays, key],
    }));
  };

  const saveWage = (): void => {
    const n = parseInt(wageText.replace(/,/g, ""), 10);
    setInfo((prev) => ({
      ...prev,
      hourlyWage: Number.isFinite(n) && n > 0 ? n : undefined,
    }));
    setEditing(null);
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
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
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
            근무 정보 확인
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            {workplaceName}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: isFromContract ? "#DBEAFE" : "#F1F5F9",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: isFromContract ? "#1B64DA" : "#64748B",
            }}
          >
            {isFromContract ? "AI 자동입력" : "직접 입력"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingTop: 0,
          paddingBottom: 32,
        }}
      >
        <View
          style={{
            backgroundColor: "#EBF3FF",
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
            flexDirection: "row",
            gap: 6,
            alignItems: "flex-start",
          }}
        >
          <Ionicons
            name="document-text"
            size={14}
            color="#1B64DA"
            style={{ marginTop: 1 }}
          />
          <Text
            style={{ flex: 1, fontSize: 12, color: "#185FA5", lineHeight: 18 }}
          >
            {isFromContract
              ? "계약서에서 자동으로 채웠어요. 맞는지만 확인하고 넘어가세요."
              : "입력하신 근무 정보를 마지막으로 확인해주세요."}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 4,
            marginBottom: 12,
          }}
        >
          {/* 근무 요일 — 펼치면 7개 chip toggle */}
          <Row
            label="근무 요일"
            value={formatDays(info.workDays)}
            isEditing={editing === "workDays"}
            onToggleEdit={() =>
              setEditing(editing === "workDays" ? null : "workDays")
            }
          >
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
                paddingHorizontal: 12,
                paddingBottom: 12,
              }}
            >
              {ALL_DAYS.map((d) => {
                const active = info.workDays.includes(d.key);
                return (
                  <Pressable
                    key={d.key}
                    onPress={() => toggleDay(d.key)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? "#3182F6" : "#F1F5F9",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: active ? "#FFFFFF" : "#475569",
                      }}
                    >
                      {d.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Row>
          <RowDivider />

          {/* 출근 시각 */}
          <Row
            label="출근 시각"
            value={info.workStartTime}
            isEditing={editing === "workStartTime"}
            onToggleEdit={() => {
              setEditing(
                editing === "workStartTime" ? null : "workStartTime",
              );
              setShowTimePicker(
                editing === "workStartTime" ? null : "workStartTime",
              );
            }}
          >
            {showTimePicker === "workStartTime" ? (
              Platform.OS === "web" ? (
                <InlineEditField
                  value={info.workStartTime}
                  onChangeText={(v) =>
                    setInfo((prev) => ({
                      ...prev,
                      workStartTime: formatTimeInput(v),
                    }))
                  }
                  placeholder="09:00"
                  maxLength={5}
                  onDone={() => {
                    setShowTimePicker(null);
                    setEditing(null);
                  }}
                />
              ) : (
                <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                  <DateTimePicker
                    value={parseHHMM(info.workStartTime)}
                    mode="time"
                    is24Hour
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(_, selected) => {
                      if (Platform.OS === "android") {
                        setShowTimePicker(null);
                        setEditing(null);
                      }
                      if (selected !== undefined) {
                        setInfo((prev) => ({
                          ...prev,
                          workStartTime: formatHHMM(selected),
                        }));
                      }
                    }}
                  />
                </View>
              )
            ) : null}
          </Row>
          <RowDivider />

          {/* 퇴근 시각 */}
          <Row
            label="퇴근 시각"
            value={info.workEndTime}
            isEditing={editing === "workEndTime"}
            onToggleEdit={() => {
              setEditing(editing === "workEndTime" ? null : "workEndTime");
              setShowTimePicker(
                editing === "workEndTime" ? null : "workEndTime",
              );
            }}
          >
            {showTimePicker === "workEndTime" ? (
              Platform.OS === "web" ? (
                <InlineEditField
                  value={info.workEndTime}
                  onChangeText={(v) =>
                    setInfo((prev) => ({
                      ...prev,
                      workEndTime: formatTimeInput(v),
                    }))
                  }
                  placeholder="18:00"
                  maxLength={5}
                  onDone={() => {
                    setShowTimePicker(null);
                    setEditing(null);
                  }}
                />
              ) : (
                <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                  <DateTimePicker
                    value={parseHHMM(info.workEndTime)}
                    mode="time"
                    is24Hour
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(_, selected) => {
                      if (Platform.OS === "android") {
                        setShowTimePicker(null);
                        setEditing(null);
                      }
                      if (selected !== undefined) {
                        setInfo((prev) => ({
                          ...prev,
                          workEndTime: formatHHMM(selected),
                        }));
                      }
                    }}
                  />
                </View>
              )
            ) : null}
          </Row>
          <RowDivider />

          {/* 근무 시작일 */}
          <Row
            label="근무 시작일"
            value={info.startDay}
            isEditing={editing === "startDay"}
            onToggleEdit={() => {
              setEditing(editing === "startDay" ? null : "startDay");
              setShowDatePicker(editing === "startDay" ? false : true);
            }}
          >
            {showDatePicker ? (
              Platform.OS === "web" ? (
                <InlineEditField
                  value={info.startDay}
                  onChangeText={(v) =>
                    setInfo((prev) => ({ ...prev, startDay: formatDateInput(v) }))
                  }
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                  onDone={() => {
                    setShowDatePicker(false);
                    setEditing(null);
                  }}
                />
              ) : (
                <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                  <DateTimePicker
                    value={parseDateIso(info.startDay)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(_, selected) => {
                      if (Platform.OS === "android") {
                        setShowDatePicker(false);
                        setEditing(null);
                      }
                      if (selected !== undefined) {
                        setInfo((prev) => ({
                          ...prev,
                          startDay: formatDateIso(selected),
                        }));
                      }
                    }}
                  />
                </View>
              )
            ) : null}
          </Row>
          <RowDivider />

          {/* 시급 */}
          <Row
            label="시급"
            value={
              info.hourlyWage !== undefined && info.hourlyWage > 0
                ? `${info.hourlyWage.toLocaleString()}원`
                : "-"
            }
            isEditing={editing === "hourlyWage"}
            onToggleEdit={() => {
              if (editing === "hourlyWage") {
                saveWage();
              } else {
                setWageText(
                  info.hourlyWage !== undefined
                    ? String(info.hourlyWage)
                    : "",
                );
                setEditing("hourlyWage");
              }
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 12,
                paddingBottom: 12,
              }}
            >
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#F8FAFC",
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#3182F6",
                  paddingHorizontal: 12,
                }}
              >
                <TextInput
                  value={wageText}
                  onChangeText={(v) => setWageText(v.replace(/[^0-9]/g, ""))}
                  keyboardType="numeric"
                  placeholder={String(minimumWage)}
                  placeholderTextColor="#94A3B8"
                  autoFocus
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: "#0F172A",
                    paddingVertical: 10,
                  }}
                />
                <Text style={{ fontSize: 14, color: "#64748B" }}>원</Text>
              </View>
              <Pressable
                onPress={saveWage}
                style={{
                  backgroundColor: "#3182F6",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}
                >
                  완료
                </Text>
              </Pressable>
            </View>
          </Row>
        </View>

        {info.hourlyWage !== undefined && info.hourlyWage > 0 ? (
          wageBelowMin ? (
            <View
              style={{
                backgroundColor: "#FEE2E2",
                borderRadius: 8,
                padding: 10,
                marginBottom: 16,
              }}
            >
              <Text
                style={{ fontSize: 12, color: "#B91C1C", fontWeight: "600" }}
              >
                {`⚠️ 최저임금 미달 · 2026년 최저시급 ${minimumWage.toLocaleString()}원`}
              </Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: "#DCFCE7",
                borderRadius: 8,
                padding: 10,
                marginBottom: 16,
              }}
            >
              <Text
                style={{ fontSize: 12, color: "#15803D", fontWeight: "600" }}
              >
                {`✓ 최저임금 충족 · 2026년 최저시급 ${minimumWage.toLocaleString()}원`}
              </Text>
            </View>
          )
        ) : null}

        {isFromContract && issueCount > 0 && onViewIssues !== undefined ? (
          <Pressable
            onPress={onViewIssues}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#FFFFFF",
              borderRadius: 10,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 13, color: "#0F172A", fontWeight: "500" }}>
              {`이 계약서에서 발견된 이슈 ${issueCount}건 보기`}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
          </Pressable>
        ) : null}
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 16,
          backgroundColor: "#F8FAFC",
        }}
      >
        <Pressable
          onPress={onBack}
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
            backgroundColor: "#F1F5F9",
            borderWidth: 1,
            borderColor: "#E2E8F0",
          }}
        >
          <Text style={{ fontSize: 14, color: "#475569", fontWeight: "600" }}>
            이전
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onConfirm(info)}
          style={{
            flex: 2,
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
            backgroundColor: "#3182F6",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
            확인 · Wi-Fi 등록 →
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────
// 공통 Row — 항상 라벨/값/연필 보여주고, isEditing=true면 children(에디터) 펼침.
// ──────────────────────────────────────

interface RowProps {
  label: string;
  value: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  children: React.ReactNode;
}

function Row({
  label,
  value,
  isEditing,
  onToggleEdit,
  children,
}: RowProps): JSX.Element {
  return (
    <View>
      <Pressable
        onPress={onToggleEdit}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 12,
          paddingHorizontal: 12,
        }}
      >
        <Text style={{ fontSize: 13, color: "#64748B" }}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{ fontSize: 15, fontWeight: "600", color: "#0F172A" }}
          >
            {value}
          </Text>
          <Ionicons
            name={isEditing ? "checkmark" : "pencil"}
            size={14}
            color={isEditing ? "#3182F6" : "#94A3B8"}
          />
        </View>
      </Pressable>
      {isEditing ? children : null}
    </View>
  );
}

function RowDivider(): JSX.Element {
  return (
    <View
      style={{ height: 0.5, backgroundColor: "#F1F5F9", marginHorizontal: 12 }}
    />
  );
}

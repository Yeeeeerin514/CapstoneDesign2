import { useEffect, useState } from "react";
import {
  Alert,
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
import {
  loadContractPending,
  type ContractAnalysisResult,
} from "@/entities/job-post";
import type { WorkInfoInput } from "@/features/favorite-workplace";
import { useMinimumWageStore } from "@/shared/lib/minimum-wage-store";

interface Props {
  workplaceName: string;
  /** 계약서 분석 결과가 있으면 pre-fill (extractedInfo 기준). 없으면 빈칸. */
  prefillFromContract?: ContractAnalysisResult;
  onBack: () => void;
  onNext: (info: WorkInfoInput) => void;
  /** "계약서를 업로드하면..." 안내 카드 탭 시 계약서 업로드 화면으로 이동. */
  onGoToContractUpload?: () => void;
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

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseHHMM(value: string): Date {
  const [h, m] = value.split(":").map((s) => parseInt(s, 10));
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

function formatHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function parseDateIso(value: string): Date {
  const [y, m, d] = value.split("-").map((s) => parseInt(s, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return new Date();
  }
  return new Date(y, m - 1, d);
}

function formatDateIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** "09:00" → 분(0~1440). 비교용. */
function minutesFromHHMM(value: string): number {
  const [h, m] = value.split(":").map((s) => parseInt(s, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export function WorkInfoInputView({
  workplaceName,
  prefillFromContract,
  onBack,
  onNext,
  onGoToContractUpload,
}: Props): JSX.Element {
  const extracted = prefillFromContract?.extracted;
  const minimumWage = useMinimumWageStore((s) => s.minimumWage);
  const minimumWageYear = useMinimumWageStore((s) => s.minimumWageYear);

  const [selectedDays, setSelectedDays] = useState<string[]>(
    extracted?.workDays ?? [],
  );
  const [startTime, setStartTime] = useState<string>(
    extracted?.workStartTime ?? "09:00",
  );
  const [endTime, setEndTime] = useState<string>(
    extracted?.workEndTime ?? "18:00",
  );
  const [startDay, setStartDay] = useState<string>(
    extracted?.employmentStartDate ?? todayIso(),
  );
  const [hourlyWageStr, setHourlyWageStr] = useState<string>(
    extracted?.hourlyWage !== null && extracted?.hourlyWage !== undefined
      ? String(extracted.hourlyWage)
      : "",
  );
  /** AsyncStorage 캐시에서 로드 성공 여부 — 상단 안내 카드 분기에 사용. */
  const [loadedFromCache, setLoadedFromCache] = useState(false);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // mount 시 AsyncStorage 캐시 로드 — 발견되면 prop pre-fill보다 우선 덮어씀
  useEffect(() => {
    let cancelled = false;
    void loadContractPending(workplaceName).then((entry) => {
      if (cancelled || entry === null) return;
      const info = entry.extractedInfo;
      setSelectedDays(info.workDays ?? []);
      setStartTime(info.workStartTime ?? "09:00");
      setEndTime(info.workEndTime ?? "18:00");
      setStartDay(info.employmentStartDate ?? todayIso());
      setHourlyWageStr(
        info.hourlyWage !== null && info.hourlyWage !== undefined
          ? String(info.hourlyWage)
          : "",
      );
      setLoadedFromCache(true);
    });
    return () => {
      cancelled = true;
    };
  }, [workplaceName]);

  const toggleDay = (key: string): void => {
    setSelectedDays((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key],
    );
  };

  const handleNext = (): void => {
    // 유효성 검사
    if (selectedDays.length === 0) {
      Alert.alert("입력 필요", "근무 요일을 1개 이상 선택해주세요.");
      return;
    }
    if (minutesFromHHMM(endTime) <= minutesFromHHMM(startTime)) {
      Alert.alert(
        "시간 오류",
        "퇴근 시각은 출근 시각보다 늦어야 합니다.",
      );
      return;
    }
    const wage = hourlyWageStr.trim();
    const hourlyWage =
      wage === "" ? undefined : parseInt(wage.replace(/[^0-9]/g, ""), 10);
    if (hourlyWage !== undefined && (!Number.isFinite(hourlyWage) || hourlyWage <= 0)) {
      Alert.alert("입력 오류", "시급은 양수로 입력하거나 비워주세요.");
      return;
    }

    onNext({
      workDays: selectedDays,
      workStartTime: startTime,
      workEndTime: endTime,
      startDay,
      hourlyWage,
    });
  };

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
        <View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
            근무 정보 입력
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            {workplaceName}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        {/* 상단 안내 — 데이터 출처에 따라 2-way 분기 */}
        {loadedFromCache || extracted !== undefined ? (
          <View
            style={{
              backgroundColor: "#EFF6FF",
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text
              style={{ fontSize: 13, fontWeight: "600", color: "#1D4ED8", marginBottom: 4 }}
            >
              💡 이 정보가 맞나요? 틀리면 수정해주세요
            </Text>
            <Text style={{ fontSize: 12, color: "#1E40AF", lineHeight: 17 }}>
              계약서 분석 결과를 자동으로 채웠습니다. 확인 후 다음으로 진행하세요.
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => onGoToContractUpload?.()}
            disabled={onGoToContractUpload === undefined}
            style={{
              backgroundColor: "#FEF3C7",
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "#FCD34D",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: "#92400E", marginBottom: 4 }}
              >
                💡 계약서를 업로드하면 정보가 자동으로 채워집니다
              </Text>
              <Text style={{ fontSize: 12, color: "#78350F", lineHeight: 17 }}>
                직접 입력해서 등록할 수도 있어요.
              </Text>
            </View>
            {onGoToContractUpload !== undefined ? (
              <Ionicons name="chevron-forward" size={18} color="#92400E" />
            ) : null}
          </Pressable>
        )}

        {/* 근무 요일 */}
        <SectionLabel label="근무 요일" required />
        <View
          style={{
            flexDirection: "row",
            gap: 6,
            marginBottom: 16,
          }}
        >
          {ALL_DAYS.map((d) => {
            const selected = selectedDays.includes(d.key);
            return (
              <Pressable
                key={d.key}
                onPress={() => toggleDay(d.key)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                  backgroundColor: selected ? "#3182F6" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: selected ? "#3182F6" : "#E2E8F0",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: selected ? "#FFFFFF" : "#475569",
                  }}
                >
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 출근 시각 */}
        <SectionLabel label="출근 시각" required />
        <Pressable
          onPress={() => setShowStartPicker(true)}
          style={inputBoxStyle}
        >
          <Text style={inputValueStyle}>{startTime}</Text>
          <Ionicons name="time-outline" size={18} color="#64748B" />
        </Pressable>
        {showStartPicker ? (
          <DateTimePicker
            value={parseHHMM(startTime)}
            mode="time"
            is24Hour
            onChange={(_e, date) => {
              if (Platform.OS !== "ios") setShowStartPicker(false);
              if (date !== undefined) setStartTime(formatHHMM(date));
            }}
          />
        ) : null}

        {/* 퇴근 시각 */}
        <SectionLabel label="퇴근 시각" required />
        <Pressable
          onPress={() => setShowEndPicker(true)}
          style={inputBoxStyle}
        >
          <Text style={inputValueStyle}>{endTime}</Text>
          <Ionicons name="time-outline" size={18} color="#64748B" />
        </Pressable>
        {showEndPicker ? (
          <DateTimePicker
            value={parseHHMM(endTime)}
            mode="time"
            is24Hour
            onChange={(_e, date) => {
              if (Platform.OS !== "ios") setShowEndPicker(false);
              if (date !== undefined) setEndTime(formatHHMM(date));
            }}
          />
        ) : null}

        {/* 근무 시작일 */}
        <SectionLabel label="근무 시작일" required />
        <Pressable
          onPress={() => setShowDatePicker(true)}
          style={inputBoxStyle}
        >
          <Text style={inputValueStyle}>{startDay}</Text>
          <Ionicons name="calendar-outline" size={18} color="#64748B" />
        </Pressable>
        {showDatePicker ? (
          <DateTimePicker
            value={parseDateIso(startDay)}
            mode="date"
            onChange={(_e, date) => {
              if (Platform.OS !== "ios") setShowDatePicker(false);
              if (date !== undefined) setStartDay(formatDateIso(date));
            }}
          />
        ) : null}

        {/* 시급 */}
        <SectionLabel label="시급 (선택)" />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#E2E8F0",
            paddingHorizontal: 12,
            marginBottom: 6,
          }}
        >
          <TextInput
            value={hourlyWageStr}
            onChangeText={(v) => setHourlyWageStr(v.replace(/[^0-9]/g, ""))}
            keyboardType="numeric"
            placeholder={`예: ${minimumWage}`}
            placeholderTextColor="#94A3B8"
            style={{
              flex: 1,
              fontSize: 15,
              color: "#0F172A",
              paddingVertical: 12,
            }}
          />
          <Text style={{ fontSize: 14, color: "#64748B" }}>원</Text>
        </View>
        <Text style={{ fontSize: 11, color: "#94A3B8", marginBottom: 16 }}>
          {`미입력 시 최저시급(${minimumWageYear}년 기준 ${minimumWage.toLocaleString()}원)이 적용됩니다.`}
        </Text>
      </ScrollView>

      {/* 하단 고정 다음 버튼 */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
          padding: 16,
        }}
      >
        <Pressable
          onPress={handleNext}
          style={{
            paddingVertical: 14,
            backgroundColor: "#3182F6",
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>
            다음 →
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function SectionLabel({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}): JSX.Element {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "600",
        color: "#0F172A",
        marginBottom: 8,
      }}
    >
      {label}
      {required === true ? (
        <Text style={{ color: "#DC2626" }}> *</Text>
      ) : null}
    </Text>
  );
}

const inputBoxStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
  backgroundColor: "#FFFFFF",
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#E2E8F0",
  paddingHorizontal: 14,
  paddingVertical: 14,
  marginBottom: 16,
};

const inputValueStyle = {
  fontSize: 15,
  color: "#0F172A",
  fontWeight: "500" as const,
};

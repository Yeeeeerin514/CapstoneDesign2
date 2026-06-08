import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import { searchBusinesses } from "@/entities/business";

interface Props {
  /** 미리 알고 있는 사업장명. 있으면 초기값으로 사용. */
  defaultWorkplaceName?: string;
  onBack: () => void;
  /**
   * 사용자가 사업장 정보 입력을 마치고 "신고 계속하기" 누름.
   * @param brn  "123-45-67890" 포맷 또는 null. 사용자가 입력 안 했으면 null.
   */
  onSubmit: (info: {
    workplaceName: string;
    region: string;
    businessRegistrationNumber: string | null;
  }) => void;
}

/** 시/도 → 구/군 목록. 주요 광역시·도 정도만 PoC. */
const REGION_MAP: Record<string, string[]> = {
  서울특별시: ["강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"],
  경기도: ["수원시", "성남시", "고양시", "용인시", "부천시", "안양시", "안산시", "남양주시", "화성시", "평택시"],
  인천광역시: ["중구", "동구", "미추홀구", "연수구", "남동구", "부평구", "계양구", "서구"],
  부산광역시: ["중구", "서구", "동구", "영도구", "부산진구", "동래구", "남구", "북구", "해운대구", "사하구", "금정구", "강서구", "연제구", "수영구", "사상구"],
  대구광역시: ["중구", "동구", "서구", "남구", "북구", "수성구", "달서구", "달성군"],
  광주광역시: ["동구", "서구", "남구", "북구", "광산구"],
  대전광역시: ["동구", "중구", "서구", "유성구", "대덕구"],
  울산광역시: ["중구", "남구", "동구", "북구", "울주군"],
};

const SIDO_LIST = Object.keys(REGION_MAP);

/** "12345678901" → "123-45-67890" (10자리까지). */
function formatBrn(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/** "123-45-67890" 10자리 숫자 검증. */
function isValidBrn(formatted: string): boolean {
  return formatted.replace(/\D/g, "").length === 10;
}

export function ManualBusinessInputView({
  defaultWorkplaceName,
  onBack,
  onSubmit,
}: Props): JSX.Element {
  const [name, setName] = useState<string>(defaultWorkplaceName ?? "");
  const [sido, setSido] = useState<string>("");
  const [gugun, setGugun] = useState<string>("");
  const [brnInput, setBrnInput] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSidoPicker, setShowSidoPicker] = useState<boolean>(false);
  const [showGugunPicker, setShowGugunPicker] = useState<boolean>(false);

  const gugunOptions = useMemo(
    () => (sido !== "" ? REGION_MAP[sido] : []),
    [sido],
  );

  const canContinue = name.trim().length >= 2 && sido !== "" && gugun !== "";
  const brnFormatted = brnInput;
  const brnValid = brnFormatted === "" || isValidBrn(brnFormatted);

  const handleSearch = (): void => {
    if (name.trim().length < 2) {
      Alert.alert("입력 필요", "사업장 이름을 2자 이상 입력해주세요.");
      return;
    }
    setIsSearching(true);
    void (async () => {
      try {
        const res = await searchBusinesses({
          q: name.trim(),
          region: [sido, gugun].filter((s) => s.length > 0).join(" "),
        });
        const first = res.results[0];
        if (first !== undefined && first.businessRegistrationNumber.length > 0) {
          setBrnInput(first.businessRegistrationNumber);
          Alert.alert(
            "사업장을 찾았어요",
            `${first.name}\n사업자등록번호 ${first.businessRegistrationNumber} 를 자동 입력했어요.`,
          );
        } else {
          Alert.alert(
            "검색 결과",
            "해당 사업장 정보를 찾지 못했습니다. 사업자등록번호를 직접 입력해주세요.",
          );
        }
      } catch {
        Alert.alert(
          "검색 실패",
          "잠시 후 다시 시도하거나, 사업자등록번호를 직접 입력해주세요.",
        );
      } finally {
        setIsSearching(false);
      }
    })();
  };

  const handleContinue = (): void => {
    if (!canContinue) return;
    if (!brnValid) {
      Alert.alert(
        "사업자번호 오류",
        "사업자등록번호는 10자리 숫자로 입력하거나 비워주세요.",
      );
      return;
    }
    onSubmit({
      workplaceName: name.trim(),
      region: `${sido} ${gugun}`,
      businessRegistrationNumber: brnFormatted === "" ? null : brnFormatted,
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
        <Pressable onPress={onBack} hitSlop={6}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
            사업장 정보 입력
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            신고 진행에 필요한 기본 정보예요
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
      >
        {/* 안내 */}
        <View
          style={{
            backgroundColor: "#EFF6FF",
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#1D4ED8",
              marginBottom: 4,
            }}
          >
            💡 사업자등록번호를 몰라도 신고할 수 있어요
          </Text>
          <Text style={{ fontSize: 12, color: "#1E40AF", lineHeight: 17 }}>
            사업장 이름과 지역만 입력해도 다음 단계로 넘어갈 수 있습니다.
          </Text>
        </View>

        {/* 사업장 이름 */}
        <SectionLabel label="사업장 이름" required />
        <View style={inputBoxStyle}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="예: OO카페 강남점"
            placeholderTextColor="#94A3B8"
            style={{
              flex: 1,
              fontSize: 15,
              color: "#0F172A",
              paddingVertical: 12,
            }}
          />
        </View>
        <Text style={{ fontSize: 11, color: "#94A3B8", marginBottom: 14 }}>
          2자 이상 입력해주세요.
        </Text>

        {/* 지역 */}
        <SectionLabel label="지역" required />
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
          <Pressable
            onPress={() => setShowSidoPicker(true)}
            style={[pickerBoxStyle, { flex: 1 }]}
          >
            <Text
              style={{
                fontSize: 14,
                color: sido !== "" ? "#0F172A" : "#94A3B8",
                fontWeight: sido !== "" ? "600" : "400",
              }}
            >
              {sido !== "" ? sido : "시/도 선택"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#64748B" />
          </Pressable>
          <Pressable
            onPress={() => {
              if (sido === "") {
                Alert.alert("순서 안내", "시/도를 먼저 선택해주세요.");
                return;
              }
              setShowGugunPicker(true);
            }}
            style={[
              pickerBoxStyle,
              { flex: 1, opacity: sido === "" ? 0.5 : 1 },
            ]}
          >
            <Text
              style={{
                fontSize: 14,
                color: gugun !== "" ? "#0F172A" : "#94A3B8",
                fontWeight: gugun !== "" ? "600" : "400",
              }}
            >
              {gugun !== "" ? gugun : "구/군 선택"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#64748B" />
          </Pressable>
        </View>

        {/* 사업장 검색 */}
        <Pressable
          onPress={handleSearch}
          disabled={isSearching}
          style={{
            backgroundColor: "#F1F5F9",
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            marginTop: 8,
            marginBottom: 18,
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            opacity: isSearching ? 0.6 : 1,
          }}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color="#475569" />
          ) : (
            <Ionicons name="search-outline" size={16} color="#475569" />
          )}
          <Text style={{ fontSize: 13, color: "#475569", fontWeight: "600" }}>
            {isSearching ? "검색 중..." : "이 사업장 찾기"}
          </Text>
        </Pressable>

        {/* 사업자등록번호 */}
        <SectionLabel label="사업자등록번호 (선택)" />
        <View style={inputBoxStyle}>
          <TextInput
            value={brnFormatted}
            onChangeText={(v) => setBrnInput(formatBrn(v))}
            keyboardType="numeric"
            placeholder="123-45-67890 (선택)"
            placeholderTextColor="#94A3B8"
            maxLength={12}
            style={{
              flex: 1,
              fontSize: 15,
              color: "#0F172A",
              paddingVertical: 12,
            }}
          />
        </View>
        {!brnValid ? (
          <Text style={{ fontSize: 11, color: "#DC2626", marginBottom: 6 }}>
            10자리 숫자로 입력해주세요.
          </Text>
        ) : (
          <Text style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6 }}>
            몰라도 신고할 수 있어요.
          </Text>
        )}
      </ScrollView>

      {/* 하단 고정 버튼 */}
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
          onPress={handleContinue}
          disabled={!canContinue}
          style={{
            paddingVertical: 14,
            backgroundColor: canContinue ? "#3182F6" : "#CBD5E1",
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>
            신고 계속하기 →
          </Text>
        </Pressable>
      </View>

      {/* 시/도 Picker 모달 */}
      <PickerModal
        visible={showSidoPicker}
        title="시/도 선택"
        options={SIDO_LIST}
        selected={sido}
        onSelect={(v) => {
          setSido(v);
          setGugun("");
          setShowSidoPicker(false);
        }}
        onClose={() => setShowSidoPicker(false)}
      />
      {/* 구/군 Picker 모달 */}
      <PickerModal
        visible={showGugunPicker}
        title="구/군 선택"
        options={gugunOptions}
        selected={gugun}
        onSelect={(v) => {
          setGugun(v);
          setShowGugunPicker(false);
        }}
        onClose={() => setShowGugunPicker(false)}
      />
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
      {required === true ? <Text style={{ color: "#DC2626" }}> *</Text> : null}
    </Text>
  );
}

interface PickerModalProps {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

function PickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: PickerModalProps): JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.4)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: "70%",
            paddingBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#F1F5F9",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}>
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#64748B" />
            </Pressable>
          </View>
          <ScrollView>
            {options.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => onSelect(opt)}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 18,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: opt === selected ? "#EFF6FF" : "#FFFFFF",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: opt === selected ? "#1D4ED8" : "#0F172A",
                    fontWeight: opt === selected ? "600" : "400",
                  }}
                >
                  {opt}
                </Text>
                {opt === selected ? (
                  <Ionicons name="checkmark" size={18} color="#1D4ED8" />
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const inputBoxStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  backgroundColor: "#FFFFFF",
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#E2E8F0",
  paddingHorizontal: 12,
  marginBottom: 6,
};

const pickerBoxStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
  backgroundColor: "#FFFFFF",
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#E2E8F0",
  paddingHorizontal: 12,
  paddingVertical: 13,
};

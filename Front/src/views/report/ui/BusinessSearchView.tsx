import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import {
  searchBusinesses,
  type BusinessSearchResult,
} from "@/entities/business";

interface BusinessSearchViewProps {
  onBack: () => void;
  /** 검색 결과 카드 탭 → 사업장 확인 화면으로. */
  onSelectResult: (result: BusinessSearchResult) => void;
  /** "찾는 사업장이 없나요? 직접 입력하기" 진입. */
  onManualInput: (defaultName: string, defaultRegion: string) => void;
}

/**
 * 사업장 검색 화면 — `GET /api/businesses/search` 호출.
 * 결과 0건이면 "직접 입력하기" fallback 안내.
 */
export function BusinessSearchView({
  onBack,
  onSelectResult,
  onManualInput,
}: BusinessSearchViewProps): JSX.Element {
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<BusinessSearchResult[] | null>(null);

  const canSearch = name.trim().length > 0 && region.trim().length > 0;

  const handleSearch = async (): Promise<void> => {
    if (!canSearch) return;
    setIsSearching(true);
    try {
      const res = await searchBusinesses({ q: name.trim(), region: region.trim() });
      setResults(res.results);
    } catch (err) {
      Alert.alert(
        "검색 실패",
        err instanceof Error ? err.message : "다시 시도해주세요.",
      );
    } finally {
      setIsSearching(false);
    }
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
            신고할 사업장 찾기
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            가게 이름·지역으로 찾으면 사업자번호를 자동으로 연결해드려요
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 검색 폼 */}
        <LabeledInput
          label="가게 이름"
          required
          value={name}
          onChange={setName}
          placeholder="예: 스타벅스 강남역점"
          icon="search"
        />
        <LabeledInput
          label="지역 (시·군·구)"
          required
          value={region}
          onChange={setRegion}
          placeholder="예: 서울 강남구"
          icon="location"
        />

        <Pressable
          onPress={() => void handleSearch()}
          disabled={!canSearch || isSearching}
          style={{
            backgroundColor: canSearch ? "#3182F6" : "#CBD5E1",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 8,
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : null}
          <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>
            {isSearching ? "검색 중..." : "검색하기"}
          </Text>
        </Pressable>

        {/* 결과 */}
        {results !== null ? (
          <>
            <Text
              style={{
                fontSize: 13,
                color: "#475569",
                fontWeight: "600",
                marginTop: 20,
                marginBottom: 10,
              }}
            >
              {`검색 결과 ${results.length}곳`}
            </Text>

            {results.length === 0 ? null : (
              results.map((r) => (
                <Pressable
                  key={r.businessRegistrationNumber}
                  onPress={() => onSelectResult(r)}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 8,
                    borderWidth: 0.5,
                    borderColor: "#E2E8F0",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: "#0F172A",
                      }}
                    >
                      {r.name}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color="#94A3B8"
                    />
                  </View>
                  {r.address !== null ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#64748B",
                        marginTop: 4,
                      }}
                    >
                      {r.address}
                    </Text>
                  ) : null}
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#94A3B8",
                      marginTop: 4,
                    }}
                  >
                    {`사업자번호 ${r.businessRegistrationNumber}${
                      r.category !== null ? ` · ${r.category}` : ""
                    }`}
                  </Text>
                </Pressable>
              ))
            )}

            {/* 직접 입력 fallback — 항상 노출 */}
            <Pressable
              onPress={() => onManualInput(name.trim(), region.trim())}
              style={{
                marginTop: 8,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor: "#F1F5F9",
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Ionicons name="create-outline" size={14} color="#475569" />
              <Text
                style={{ color: "#475569", fontSize: 13, fontWeight: "600" }}
              >
                찾는 사업장이 없나요? 직접 입력하기
              </Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function LabeledInput({
  label,
  required,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: "search" | "location";
}): JSX.Element {
  return (
    <View style={{ marginBottom: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          marginBottom: 6,
        }}
      >
        <Text style={{ fontSize: 13, color: "#475569", fontWeight: "600" }}>
          {label}
        </Text>
        {required === true ? (
          <Text style={{ fontSize: 11, color: "#DC2626", fontWeight: "600" }}>
            *
          </Text>
        ) : null}
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          paddingHorizontal: 12,
        }}
      >
        <Ionicons name={icon} size={14} color="#94A3B8" />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          style={{
            flex: 1,
            fontSize: 14,
            color: "#0F172A",
            paddingVertical: 12,
            paddingHorizontal: 8,
          }}
        />
      </View>
    </View>
  );
}

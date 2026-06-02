import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import type { BusinessSearchResult } from "@/entities/business";
import { createReportDraft } from "@/entities/report";
import { useReportStore } from "@/features/report-submit";

interface BusinessConfirmViewProps {
  business: BusinessSearchResult;
  onBack: () => void;
  /** 사건 생성 성공 → caseId 전달. 상위가 ReportDetail로 진입. */
  onConfirmed: (caseId: string) => void;
}

/**
 * "이 사업장이 맞나요?" 화면 — 검색 결과 카드 탭 직후.
 * [이 사업장으로 신고 작성하기 →] 누르면 백엔드 draft 생성 + store에 추가.
 */
export function BusinessConfirmView({
  business,
  onBack,
  onConfirmed,
}: BusinessConfirmViewProps): JSX.Element {
  const [isCreating, setIsCreating] = useState(false);
  const createDraft = useReportStore((s) => s.createReportDraft);

  const handleConfirm = async (): Promise<void> => {
    setIsCreating(true);
    try {
      const res = await createReportDraft({
        source: "search",
        businessRegistrationNumber: business.businessRegistrationNumber,
        businessName: business.name,
        businessCategory: business.category,
        businessAddress: business.address,
        businessPhone: business.phone,
        representativeName: business.representative,
        laborOffice: business.laborOffice,
      });
      const caseId = String(res.caseId);
      createDraft({
        caseId,
        source: "search",
        business: res.business,
      });
      onConfirmed(caseId);
    } catch (err) {
      Alert.alert(
        "신고 생성 실패",
        err instanceof Error ? err.message : "다시 시도해주세요.",
      );
    } finally {
      setIsCreating(false);
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
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
          사업장 확인
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 32 }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#0F172A",
            marginBottom: 6,
          }}
        >
          이 사업장이 맞나요?
        </Text>
        <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
          신고하기 전에 대상 사업주를 확인해주세요
        </Text>

        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 16,
            borderWidth: 0.5,
            borderColor: "#E2E8F0",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#F1F5F9",
            }}
          >
            <Text
              style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}
            >
              {business.name}
            </Text>
            {business.category !== null ? (
              <Text style={{ fontSize: 12, color: "#64748B" }}>
                {business.category}
              </Text>
            ) : null}
          </View>

          <InfoRow label="사업자등록번호" value={business.businessRegistrationNumber} />
          {business.address !== null ? (
            <InfoRow label="주소" value={business.address} />
          ) : null}
          {business.representative !== null ? (
            <InfoRow label="사업주 (대표자)" value={business.representative} />
          ) : null}
        </View>

        {business.laborOffice !== null ? (
          <View
            style={{
              backgroundColor: "#EBF3FF",
              borderRadius: 10,
              padding: 12,
              marginTop: 12,
              flexDirection: "row",
              gap: 6,
              alignItems: "flex-start",
            }}
          >
            <Ionicons
              name="business"
              size={14}
              color="#185FA5"
              style={{ marginTop: 1 }}
            />
            <Text
              style={{ flex: 1, fontSize: 12, color: "#185FA5", lineHeight: 18 }}
            >
              {`접수 관할: ${business.laborOffice}\n사업장 주소를 기준으로 자동 안내했어요. 신고는 이곳으로 접수돼요.`}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => void handleConfirm()}
          disabled={isCreating}
          style={{
            marginTop: 20,
            backgroundColor: "#3182F6",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            opacity: isCreating ? 0.6 : 1,
          }}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : null}
          <Text
            style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
          >
            이 사업장으로 신고 작성하기 →
          </Text>
        </Pressable>

        <Pressable
          onPress={onBack}
          style={{
            marginTop: 8,
            paddingVertical: 12,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <Ionicons name="refresh" size={13} color="#64748B" />
          <Text style={{ fontSize: 13, color: "#64748B" }}>
            다른 사업장이에요, 다시 찾기
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
      }}
    >
      <Text style={{ fontSize: 13, color: "#64748B" }}>{label}</Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: "#0F172A",
          flexShrink: 1,
          textAlign: "right",
          marginLeft: 8,
        }}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

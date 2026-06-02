import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { isAxiosError } from "axios";
import {
  fetchContractDetail,
  mapContractApiResponse,
  type ContractAnalysisResponse,
  type ContractAnalysisResult,
} from "@/entities/job-post";
import { ScreenHeader } from "@/shared/ui";
import { ContractAnalysisView } from "@/views/workplace/ui/ContractAnalysisView";

type LoadState =
  | { kind: "loading" }
  | { kind: "ok"; result: ContractAnalysisResult }
  | { kind: "error"; title: string; message: string };

/**
 * 계약서 단건 상세 — /contract-detail/{contractId}
 * GET /api/contracts/{contractId} 응답을 받아 기존 ContractAnalysisView로 표시.
 * onRegister 미전달 → 하단 "사업장 등록하기" 버튼 숨김 (read-only).
 */
export default function ContractDetailScreen(): JSX.Element {
  const { contractId } = useLocalSearchParams<{ contractId: string }>();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    const id = Number(contractId);
    if (!Number.isFinite(id) || id <= 0) {
      setState({
        kind: "error",
        title: "잘못된 요청",
        message: "유효하지 않은 계약서 ID입니다.",
      });
      return;
    }
    let cancelled = false;
    fetchContractDetail(id)
      .then((api: ContractAnalysisResponse) => {
        if (cancelled) return;
        const result = mapContractApiResponse(api);
        if (result.workplaceName.length === 0) result.workplaceName = "확인불가";
        setState({ kind: "ok", result });
      })
      .catch((err) => {
        if (cancelled) return;
        if (isAxiosError(err)) {
          const status = err.response?.status;
          if (status === 400) {
            setState({
              kind: "error",
              title: "권한 없음",
              message: "접근 권한이 없습니다.",
            });
            return;
          }
          if (status === 404) {
            setState({
              kind: "error",
              title: "찾을 수 없음",
              message: "계약서를 찾을 수 없습니다.",
            });
            return;
          }
        }
        setState({
          kind: "error",
          title: "불러오기 실패",
          message: "계약서를 불러오지 못했습니다.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [contractId]);

  if (state.kind === "ok") {
    return (
      <ContractAnalysisView
        result={state.result}
        onBack={() => router.back()}
        // onRegister 미전달 → 하단 등록 버튼 숨김
      />
    );
  }

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
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
          계약서 상세
        </Text>
      </View>

      {state.kind === "loading" ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}
        >
          <ActivityIndicator size="large" color="#3182F6" />
          {/* 단순 스켈레톤 표시 */}
          <View
            style={{
              width: 220,
              height: 18,
              borderRadius: 4,
              backgroundColor: "#E2E8F0",
            }}
          />
          <View
            style={{
              width: 160,
              height: 14,
              borderRadius: 4,
              backgroundColor: "#E2E8F0",
            }}
          />
          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>
            계약서를 불러오는 중...
          </Text>
        </View>
      ) : (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}
        >
          <Ionicons name="alert-circle" size={40} color="#94A3B8" />
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#0F172A",
              marginTop: 12,
            }}
          >
            {state.title}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#64748B",
              marginTop: 4,
              textAlign: "center",
            }}
          >
            {state.message}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{
              marginTop: 20,
              paddingHorizontal: 24,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: "#3182F6",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
              뒤로가기
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

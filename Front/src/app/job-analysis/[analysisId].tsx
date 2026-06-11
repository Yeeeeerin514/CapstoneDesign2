import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { isAxiosError } from "axios";
import {
  fetchJobPostingAnalysis,
  type JobPostAnalysisResult,
} from "@/entities/job-post";
import { ScreenHeader } from "@/shared/ui";
import { JobAnalysisResultView } from "@/views/home/ui/JobAnalysisResultView";

type LoadState =
  | { kind: "loading" }
  | { kind: "ok"; result: JobPostAnalysisResult }
  | { kind: "error"; title: string; message: string };

/**
 * 공고문 분석 단건 상세 — /job-analysis/{analysisId}
 * GET /api/job-postings/analyses/{analysisId} 응답을 받아
 * 기존 JobAnalysisResultView(홈 분석 결과 화면)로 그대로 표시.
 * 관심업장 카드의 "공고 분석 보기"에서 진입한다 (contract-detail 패턴과 동일).
 */
export default function JobAnalysisDetailScreen(): JSX.Element {
  const { analysisId } = useLocalSearchParams<{ analysisId: string }>();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    const id = Number(analysisId);
    if (!Number.isFinite(id) || id <= 0) {
      setState({
        kind: "error",
        title: "잘못된 요청",
        message: "유효하지 않은 분석 ID입니다.",
      });
      return;
    }
    let cancelled = false;
    fetchJobPostingAnalysis(id)
      .then((result) => {
        if (cancelled) return;
        setState({ kind: "ok", result });
      })
      .catch((err) => {
        if (cancelled) return;
        if (isAxiosError(err) && err.response?.status === 404) {
          setState({
            kind: "error",
            title: "찾을 수 없음",
            message: "분석 결과를 찾을 수 없습니다.",
          });
          return;
        }
        setState({
          kind: "error",
          title: "불러오기 실패",
          message: "분석 결과를 불러오지 못했습니다.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  if (state.kind === "ok") {
    return (
      <JobAnalysisResultView
        result={state.result}
        onBack={() => router.back()}
        onFavoriteAdded={() => {
          /* 재조회 화면 — 이미 관심업장으로 등록된 상태 */
        }}
        onNavigateToWorkplace={() => router.back()}
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
          공고 분석 결과
        </Text>
      </View>

      {state.kind === "loading" ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
          }}
        >
          <ActivityIndicator size="large" color="#3182F6" />
          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>
            분석 결과를 불러오는 중...
          </Text>
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
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

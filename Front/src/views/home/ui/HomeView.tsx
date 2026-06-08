import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import {
  analyzeJobPost,
  type JobPostAnalysisResult,
} from "@/entities/job-post";
import { useFavoriteWorkplaceStore } from "@/features/favorite-workplace";
import { useReviewStore } from "@/entities/review";
import { ScreenHeader } from "@/shared/ui";
import { ReviewListView } from "@/views/report/ui/ReviewListView";
import { ReviewDetailView } from "@/views/report/ui/ReviewDetailView";
import { ResolveReviewCard } from "@/views/report/ui/ResolveReviewCard";
import { JobAnalysisResultView } from "./JobAnalysisResultView";

/** 후기 목록 필터용 업종 (ReviewListView.initialIndustry와 동일). */
type ReviewIndustry = "전체" | "카페·음식점" | "편의점" | "배달";

export function HomeView() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] =
    useState<JobPostAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [showResult, setShowResult] = useState(false);
  /** ReviewListView 진입 시 초기 industry 필터 ("전체"면 필터 없음). */
  const [reviewListIndustry, setReviewListIndustry] =
    useState<ReviewIndustry | null>(null);
  /** 후기 카드의 "해결 후기 보기" → 해당 후기 상세 페이지 진입. */
  const [viewingReviewId, setViewingReviewId] = useState<string | null>(null);
  const addWorkplace = useFavoriteWorkplaceStore((s) => s.addWorkplace);
  const reviews = useReviewStore((s) => s.reviews);

  // 홈 진입 시 후기 목록을 백엔드에서 로드 (홈에서 바로 후기 목록을 열어도 보이도록)
  useEffect(() => {
    void useReviewStore.getState().load();
  }, []);

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "카메라 권한을 허용해주세요");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0] !== undefined) {
      setSelectedImage(result.assets[0].uri);
    }
  }

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "사진 접근 권한을 허용해주세요");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0] !== undefined) {
      setSelectedImage(result.assets[0].uri);
    }
  }

  async function handleAnalyze() {
    if (selectedImage === null) return;
    setIsAnalyzing(true);
    setAnalyzeProgress(3);
    // 서버가 진행률을 주지 않으므로, 예상 소요(~40초)에 맞춰 95%까지 부드럽게 증가시키고
    // 실제 응답이 오면 100%로 마무리한다(체감 대기시간 완화).
    const timer = setInterval(() => {
      setAnalyzeProgress((p) =>
        p >= 95 ? 95 : Math.min(95, p + Math.max(1, Math.round((95 - p) * 0.06))),
      );
    }, 600);
    try {
      const result = await analyzeJobPost(selectedImage);
      setAnalyzeProgress(100);
      setAnalysisResult(result);
      setShowResult(true);
    } catch {
      Alert.alert("분석 실패", "다시 시도해주세요");
    } finally {
      clearInterval(timer);
      setIsAnalyzing(false);
      setAnalyzeProgress(0);
    }
  }

  function handleBack() {
    setShowResult(false);
  }

  function handleFavoriteAdded() {
    if (analysisResult === null) return;
    addWorkplace(analysisResult.workplaceName);
  }

  function handleNavigateToWorkplace() {
    router.push("/(tabs)/workplace");
    setShowResult(false);
    setAnalysisResult(null);
    setSelectedImage(null);
  }

  const canSubmit = selectedImage !== null && !isAnalyzing;

  // ReviewListView 오버레이 — 후기 전체 보기 진입
  if (reviewListIndustry !== null) {
    return (
      <ReviewListView
        initialIndustry={reviewListIndustry}
        onBack={() => setReviewListIndustry(null)}
      />
    );
  }

  // 후기 카드 "해결 후기 보기" → 그 후기의 상세
  if (viewingReviewId !== null) {
    return (
      <ReviewDetailView
        reviewId={viewingReviewId}
        onBack={() => setViewingReviewId(null)}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScreenHeader showLogo />
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="px-4 pt-6 pb-10 gap-4"
      >
        <View className="gap-1">
          <Text className="text-2xl font-bold text-text-primary">
            알바 공고 검증
          </Text>
          <Text className="text-sm text-text-secondary">
            공고 캡쳐 이미지를 업로드해 위법 사항을 확인하세요.
          </Text>
        </View>

        <View className="bg-card rounded-2xl border border-border p-4 gap-3">
          <Text className="text-base font-semibold text-text-primary">
            공고 검증
          </Text>

          {selectedImage !== null ? (
            <View className="gap-2">
              <Image
                source={{ uri: selectedImage }}
                className="w-full h-56 rounded-2xl"
                resizeMode="cover"
              />
              <Pressable
                onPress={() => setSelectedImage(null)}
                className="self-end"
              >
                <Text className="text-xs text-danger">이미지 제거</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pickFromLibrary}
              disabled={isAnalyzing}
              className="border-2 border-dashed border-border rounded-2xl bg-surface py-10 px-6 items-center justify-center"
            >
              <Ionicons
                name="cloud-upload-outline"
                size={40}
                color="#94A3B8"
              />
              <Text className="mt-2 text-sm font-medium text-text-primary">
                공고 캡쳐 이미지를 업로드하세요
              </Text>
              <Text className="mt-1 text-xs text-text-disabled">
                JPG, PNG 지원 · 최대 10MB
              </Text>
            </Pressable>
          )}

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={pickFromCamera}
              disabled={isAnalyzing}
              activeOpacity={0.8}
              className="flex-1 flex-row items-center justify-center gap-2 bg-gray-100 rounded-2xl py-3"
            >
              <Ionicons name="camera-outline" size={18} color="#334155" />
              <Text className="text-sm font-semibold text-gray-700">
                카메라
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickFromLibrary}
              disabled={isAnalyzing}
              activeOpacity={0.8}
              className="flex-1 flex-row items-center justify-center gap-2 bg-gray-100 rounded-2xl py-3"
            >
              <Ionicons name="image-outline" size={18} color="#334155" />
              <Text className="text-sm font-semibold text-gray-700">
                갤러리
              </Text>
            </TouchableOpacity>
          </View>

          {isAnalyzing ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: "#93C5FD",
              }}
            >
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: "700",
                }}
              >
                {`분석 중 ${analyzeProgress}%`}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleAnalyze}
              disabled={!canSubmit}
              activeOpacity={0.85}
              style={{
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: canSubmit ? "#2563EB" : "#93C5FD",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: "700",
                }}
              >
                분석시작
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─────── 임금체불 해결 후기 섹션 ─────── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
            임금체불 해결 후기
          </Text>
          <Pressable
            onPress={() => setReviewListIndustry("전체")}
            hitSlop={6}
            style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
          >
            <Text style={{ fontSize: 13, color: "#64748B" }}>전체</Text>
            <Ionicons name="chevron-forward" size={14} color="#64748B" />
          </Pressable>
        </View>

        {/* Top 2 후기 카드 — ResolveReviewCard 공용 컴포넌트 */}
        {reviews.slice(0, 2).map((r) => (
          <ResolveReviewCard
            key={r.id}
            review={r}
            onPressDetail={() => setViewingReviewId(r.id)}
          />
        ))}
      </ScrollView>

      {showResult && analysisResult !== null && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <JobAnalysisResultView
            result={analysisResult}
            uploadedImageUri={selectedImage}
            onBack={handleBack}
            onFavoriteAdded={handleFavoriteAdded}
            onNavigateToWorkplace={handleNavigateToWorkplace}
          />
        </View>
      )}
    </View>
  );
}

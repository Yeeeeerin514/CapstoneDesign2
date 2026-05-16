import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  analyzeJobPost,
  type JobPostAnalysisResult,
} from "@/entities/job-post";
import { useFavoriteWorkplaceStore } from "@/features/favorite-workplace";
import { ScreenHeader } from "@/shared/ui";
import { JobAnalysisResultView } from "./JobAnalysisResultView";

export function HomeView() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] =
    useState<JobPostAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const addWorkplace = useFavoriteWorkplaceStore((s) => s.addWorkplace);

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
    try {
      const result = await analyzeJobPost(selectedImage);
      setAnalysisResult(result);
      setShowResult(true);
    } catch {
      Alert.alert("분석 실패", "다시 시도해주세요");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleBack() {
    setShowResult(false);
  }

  function handleFavoriteAdded() {
    if (analysisResult === null) return;
    addWorkplace(analysisResult.workplaceName);
    Alert.alert(
      "등록 완료",
      `${analysisResult.workplaceName}이(가) 관심업장에 등록되었습니다.`,
    );
    setShowResult(false);
  }

  const canSubmit = selectedImage !== null && !isAnalyzing;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#F8FAFC",
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
      }}
    >
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
                분석 중...
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
            onBack={handleBack}
            onFavoriteAdded={handleFavoriteAdded}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

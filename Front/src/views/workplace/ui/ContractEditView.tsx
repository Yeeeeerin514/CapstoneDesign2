import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ScreenHeader } from "@/shared/ui";
import {
  analyzeContract,
  type ContractAnalysisResult,
} from "@/entities/job-post";
import { useFavoriteWorkplaceStore } from "@/features/favorite-workplace";

interface ContractEditViewProps {
  workplaceId: string;
  workplaceName: string;
  imageUri?: string;
  analysis?: ContractAnalysisResult;
  /** 로컬 분석 캐시가 없어도 서버에서 최신 분석을 가져올 수 있는지 (partTimeJobId 보유). */
  canFetchFromServer?: boolean;
  onBack: () => void;
  onViewAnalysisResult: () => void;
}

export function ContractEditView({
  workplaceId,
  workplaceName,
  imageUri,
  analysis,
  canFetchFromServer = false,
  onBack,
  onViewAnalysisResult,
}: ContractEditViewProps): JSX.Element {
  const markContractUploaded = useFavoriteWorkplaceStore(
    (s) => s.markContractUploaded,
  );

  const [isProcessing, setIsProcessing] = useState(false);

  const handleRetakePhoto = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || result.assets[0] === undefined) return;
    const newUri = result.assets[0].uri;
    setIsProcessing(true);
    try {
      const newAnalysis = await analyzeContract(newUri, workplaceName);
      markContractUploaded(workplaceId, newUri, newAnalysis);
      Alert.alert("분석 완료", "새로운 계약서로 분석이 완료되었습니다.", [
        { text: "확인", onPress: onBack },
      ]);
    } catch {
      Alert.alert("분석 실패", "다시 시도해주세요.");
    } finally {
      setIsProcessing(false);
    }
  };

  const dangerCount =
    analysis?.issues.filter((i) => i.level === "danger").length ?? 0;
  const totalIssues = analysis?.issues.length ?? 0;

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
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#0F172A" }}>
            계약서 수정
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            {workplaceName}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* 이전 사진 + 요약 카드 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#64748B",
              marginBottom: 12,
            }}
          >
            이전에 업로드한 계약서
          </Text>

          {imageUri !== undefined ? (
            <Image
              source={{ uri: imageUri }}
              style={{
                width: "100%",
                height: 200,
                borderRadius: 10,
                backgroundColor: "#F1F5F9",
              }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: "100%",
                height: 200,
                borderRadius: 10,
                backgroundColor: "#F1F5F9",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="document-text-outline"
                size={40}
                color="#94A3B8"
              />
              <Text
                style={{ fontSize: 12, color: "#94A3B8", marginTop: 8 }}
              >
                저장된 이미지가 없습니다
              </Text>
            </View>
          )}

          {analysis !== undefined ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 12,
                padding: 10,
                backgroundColor: "#FFF7ED",
                borderRadius: 8,
              }}
            >
              <Ionicons name="warning" size={16} color="#F97316" />
              <Text style={{ fontSize: 13, color: "#92400E" }}>
                {`발견된 이슈 ${totalIssues}건 (위험 ${dangerCount}건)`}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: "#64748B",
            marginBottom: 8,
          }}
        >
          어떻게 수정하시겠어요?
        </Text>

        {/* 옵션 1: 사진 다시 찍기 */}
        <Pressable
          onPress={() => void handleRetakePhoto()}
          disabled={isProcessing}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 16,
            marginBottom: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            opacity: isProcessing ? 0.5 : 1,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: "#E8F2FF",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="camera" size={20} color="#3182F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 15, fontWeight: "600", color: "#0F172A" }}
            >
              {isProcessing ? "분석 중..." : "사진 다시 찍기"}
            </Text>
            <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
              새 사진을 업로드하면 다시 분석합니다
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </Pressable>

        {/* 옵션 2: 분석 결과 다시 보기 — 로컬 캐시가 없어도 서버 폴백이 가능하면 활성화 */}
        <Pressable
          onPress={onViewAnalysisResult}
          disabled={analysis === undefined && !canFetchFromServer}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            opacity: analysis !== undefined || canFetchFromServer ? 1 : 0.5,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: "#E8F2FF",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="eye" size={20} color="#3182F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 15, fontWeight: "600", color: "#0F172A" }}
            >
              분석 결과 다시 보기
            </Text>
            <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
              이슈 상세를 다시 확인합니다
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

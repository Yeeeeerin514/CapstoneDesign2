import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  Camera,
  CheckCircle,
  FileText,
  Image as ImageIcon,
  Upload,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import {
  analyzeContract,
  type ContractAnalysisResult,
} from "@/entities/job-post";
import { ScreenHeader } from "@/shared/ui";

interface Props {
  workplaceName: string;
  onBack: () => void;
  onAnalysisComplete: (result: ContractAnalysisResult) => void;
}

export function ContractUploadView({
  workplaceName,
  onBack,
  onAnalysisComplete,
}: Props): JSX.Element {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
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
      const result = await analyzeContract(selectedImage, workplaceName);
      onAnalysisComplete(result);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "분석에 실패했어요. 잠시 후 다시 시도해주세요.";
      Alert.alert("분석 실패", message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScreenHeader showLogo />
      <View
        style={{
          backgroundColor: "#fff",
          borderBottomWidth: 0.5,
          borderBottomColor: "#E5E7EB",
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={onBack}>
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>
            계약서 업로드
          </Text>
          <Text style={{ fontSize: 12, color: "#6B7280" }}>
            근로계약서를 업로드하면 AI가 자동으로 분석합니다
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, padding: 16 }}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            borderWidth: 0.5,
            borderColor: "#E5E7EB",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#111827",
              marginBottom: 4,
            }}
          >
            근로계약서 촬영/업로드
          </Text>
          <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>
            계약서를 촬영하거나 파일을 업로드해주세요
          </Text>

          {selectedImage !== null ? (
            <View style={{ marginBottom: 12, gap: 8 }}>
              <Image
                source={{ uri: selectedImage }}
                style={{ width: "100%", height: 240, borderRadius: 8 }}
                resizeMode="cover"
              />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  padding: 12,
                  borderWidth: 0.5,
                  borderColor: "#E5E7EB",
                  borderRadius: 8,
                }}
              >
                <FileText size={16} color="#6B7280" />
                <Text style={{ fontSize: 13, color: "#374151", flex: 1 }}>
                  근로계약서 이미지 선택됨
                </Text>
                <CheckCircle size={16} color="#10B981" />
              </View>
              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                style={{ alignSelf: "flex-end" }}
              >
                <Text style={{ fontSize: 12, color: "#EF4444" }}>
                  이미지 제거
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={{
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: "#D1D5DB",
                borderRadius: 8,
                padding: 32,
                alignItems: "center",
                marginBottom: 12,
                backgroundColor: "#F9FAFB",
              }}
              onPress={pickFromLibrary}
            >
              <Upload size={28} color="#9CA3AF" />
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 8 }}>
                파일을 선택하여 업로드
              </Text>
              <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                JPG, PNG 파일 지원 (최대 10MB)
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                backgroundColor: "#F9FAFB",
                borderRadius: 8,
                borderWidth: 0.5,
                borderColor: "#E5E7EB",
              }}
              onPress={pickFromCamera}
              disabled={isAnalyzing}
            >
              <Camera size={15} color="#6B7280" />
              <Text style={{ fontSize: 13, color: "#374151" }}>
                카메라로 촬영
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                backgroundColor: "#F9FAFB",
                borderRadius: 8,
                borderWidth: 0.5,
                borderColor: "#E5E7EB",
              }}
              onPress={pickFromLibrary}
              disabled={isAnalyzing}
            >
              <ImageIcon size={15} color="#6B7280" />
              <Text style={{ fontSize: 13, color: "#374151" }}>
                파일 선택
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{
            backgroundColor: "#EFF6FF",
            borderRadius: 12,
            padding: 12,
            borderWidth: 0.5,
            borderColor: "#BFDBFE",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#1D4ED8",
              marginBottom: 4,
            }}
          >
            개인정보 보호
          </Text>
          <Text style={{ fontSize: 11, color: "#3B82F6", lineHeight: 17 }}>
            업로드된 계약서는 암호화되어 안전하게 저장되며, AI 분석 후 본인 조회
            검토에만 사용됩니다. 제3자에 공유되지 않습니다.
          </Text>
        </View>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#fff",
          borderTopWidth: 0.5,
          borderTopColor: "#E5E7EB",
          padding: 16,
          flexDirection: "row",
          gap: 12,
          alignItems: "center",
        }}
      >
        {isAnalyzing ? (
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 14,
              backgroundColor: "#2563EB",
              borderRadius: 12,
            }}
          >
            <ActivityIndicator color="#fff" size="small" />
            <Text style={{ color: "#fff", fontWeight: "600" }}>분석 중...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 14,
                backgroundColor: selectedImage !== null ? "#2563EB" : "#93C5FD",
                borderRadius: 12,
                alignItems: "center",
              }}
              onPress={handleAnalyze}
              disabled={selectedImage === null}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                {selectedImage !== null
                  ? "분석 결과 보기 →"
                  : "파일을 업로드해주세요"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onBack}>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>이전으로</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

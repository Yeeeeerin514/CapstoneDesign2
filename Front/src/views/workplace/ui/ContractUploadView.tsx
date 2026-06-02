import {
  ActivityIndicator,
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
import { useContractUploadStore } from "@/features/contract-upload";

interface Props {
  workplaceId: string;
  workplaceName: string;
  onBack: () => void;
  onAnalysisComplete: (
    imageUri: string,
    result: ContractAnalysisResult,
  ) => void;
}

export function ContractUploadView({
  workplaceId: _workplaceId,
  workplaceName,
  onBack,
  onAnalysisComplete,
}: Props): JSX.Element {
  const files = useContractUploadStore((s) => s.files);
  const isAnalyzing = useContractUploadStore((s) => s.isAnalyzing);
  const addFile = useContractUploadStore((s) => s.addFile);
  const removeFile = useContractUploadStore((s) => s.removeFile);
  const clearFiles = useContractUploadStore((s) => s.clearFiles);
  const setAnalyzing = useContractUploadStore((s) => s.setAnalyzing);

  const handleCameraPress = async (): Promise<void> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "카메라 권한이 필요합니다.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || result.assets[0] === undefined) return;
    addFile({
      uri: result.assets[0].uri,
      fileName: result.assets[0].fileName,
    });
  };

  const handleGalleryPress = async (): Promise<void> => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "갤러리 권한 필요",
        "파일 선택을 위해 갤러리 접근 권한이 필요합니다.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (result.canceled) return;
    result.assets.forEach((asset) =>
      addFile({ uri: asset.uri, fileName: asset.fileName }),
    );
  };

  const handleAnalyze = async (): Promise<void> => {
    if (files.length === 0) return;
    const firstFile = files[0];
    setAnalyzing(true);
    try {
      const result = await analyzeContract(firstFile.uri, workplaceName);
      onAnalysisComplete(firstFile.uri, result);
      clearFiles();
    } catch {
      Alert.alert(
        "분석 실패",
        "사진이 흐리거나 글자가 잘 보이지 않을 수 있습니다.\n더 선명한 사진으로 다시 시도해주세요.",
      );
    } finally {
      setAnalyzing(false);
    }
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
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#0F172A" }}>
            계약서 업로드
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            근로계약서를 업로드하면 AI가 자동으로 분석합니다
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        {/* dropzone */}
        <View
          style={{
            borderWidth: 2,
            borderColor: "#CBD5E1",
            borderStyle: "dashed",
            borderRadius: 14,
            padding: 24,
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            marginBottom: 12,
          }}
        >
          <Ionicons name="cloud-upload-outline" size={32} color="#94A3B8" />
          <Text
            style={{
              fontSize: 13,
              color: "#64748B",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            카메라로 촬영하거나{"\n"}파일을 선택해 업로드해주세요
          </Text>
          <Text style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>
            JPG, PNG, PDF · 여러 장 업로드 가능 · 최대 10MB
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <Pressable
            onPress={() => void handleCameraPress()}
            style={{
              flex: 1,
              backgroundColor: "#FFFFFF",
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <Ionicons name="camera" size={16} color="#475569" />
            <Text
              style={{ fontSize: 13, color: "#475569", fontWeight: "500" }}
            >
              카메라로 촬영
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void handleGalleryPress()}
            style={{
              flex: 1,
              backgroundColor: "#FFFFFF",
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <Ionicons name="image" size={16} color="#475569" />
            <Text
              style={{ fontSize: 13, color: "#475569", fontWeight: "500" }}
            >
              파일 선택
            </Text>
          </Pressable>
        </View>

        {/* 업로드된 파일 리스트 */}
        {files.length > 0 ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#0F172A",
                marginBottom: 10,
              }}
            >
              {`업로드된 파일 (${files.length}개)`}
            </Text>
            {files.map((file, idx) => (
              <View
                key={file.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                  gap: 10,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: "#F1F5F9",
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 6,
                    backgroundColor: "#F1F5F9",
                    overflow: "hidden",
                  }}
                >
                  <Image
                    source={{ uri: file.uri }}
                    style={{ width: "100%", height: "100%" }}
                  />
                </View>
                <Text
                  style={{ flex: 1, fontSize: 13, color: "#0F172A" }}
                  numberOfLines={1}
                >
                  {file.name}
                </Text>
                <Pressable
                  onPress={() => removeFile(file.id)}
                  hitSlop={8}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: "#FEF2F2",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="close" size={14} color="#DC2626" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {/* 개인정보 보호 안내 */}
        <View
          style={{
            backgroundColor: "#EFF6FF",
            borderRadius: 10,
            padding: 12,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#1E40AF",
              marginBottom: 4,
            }}
          >
            🔒 개인정보 보호
          </Text>
          <Text style={{ fontSize: 11, color: "#1E40AF", lineHeight: 17 }}>
            업로드된 계약서는 암호화되어 안전하게 저장되며, AI 분석 후 즉시 조회
            검토에만 사용됩니다. 제3자와 공유되지 않습니다.
          </Text>
        </View>
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <View
        style={{
          padding: 16,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
        }}
      >
        <Pressable
          onPress={() => void handleAnalyze()}
          disabled={files.length === 0 || isAnalyzing}
          style={{
            backgroundColor:
              files.length === 0 || isAnalyzing ? "#CBD5E1" : "#3182F6",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text
            style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
          >
            {files.length === 0
              ? "계약서 파일을 추가하세요"
              : `분석 시작하기 (${files.length}장)`}
          </Text>
        </Pressable>
      </View>

      {/* 분석 중 오버레이 */}
      {isAnalyzing ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 28,
              alignItems: "center",
              minWidth: 200,
            }}
          >
            <ActivityIndicator size="large" color="#3182F6" />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#0F172A",
                marginTop: 16,
              }}
            >
              AI가 계약서를 분석하고 있어요
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: "#64748B",
                marginTop: 4,
                textAlign: "center",
              }}
            >
              약 10~20초 소요됩니다
            </Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

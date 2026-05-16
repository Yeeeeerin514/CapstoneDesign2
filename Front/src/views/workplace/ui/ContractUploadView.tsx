import { useState } from "react";
import {
  SafeAreaView, ScrollView, Text, TouchableOpacity,
  View, Alert, ActivityIndicator
} from "react-native";
import {
  ArrowLeft, Upload, Camera, ImageIcon, CheckCircle, FileText
} from "lucide-react-native";
import type { ContractAnalysisResult } from "@/entities/job-post";
import { ScreenHeader } from "@/shared/ui";

interface Props {
  workplaceName: string;
  onBack: () => void;
  onAnalysisComplete: (result: ContractAnalysisResult) => void;
}

export function ContractUploadView({ workplaceName, onBack, onAnalysisComplete }: Props): JSX.Element {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function handleAnalyze() {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    try {
      await new Promise<void>((r) => setTimeout(() => r(), 2000));
      onAnalysisComplete({
        workplaceName,
        contractPeriod: "2026.04",
        hourlyWage: 10000,
        estimatedMonthlyPay: 2080000,
        overallRisk: "high",
        issues: [
          {
            level: "warning",
            title: "주휴수당 명시 누락",
            description: "주 15시간 이상 근무 시 주휴수당 지급이 의무이나 계약서에 명시 없음",
            legalBasis: "근로기준법 제55조",
          },
          {
            level: "danger",
            title: "연장수당 규정 불명",
            description: "주 40시간 초과 근무 시 1.5배 가산수당 조항이 계약서에 없음",
            legalBasis: "근로기준법 제56조",
          },
          {
            level: "info",
            title: "퇴직금 안내 누락",
            description: "1년 이상 근무 시 퇴직금이 발생하나 계약서에 미기재",
            legalBasis: "근로자퇴직급여보장법 제8조",
          },
        ],
      });
    } catch {
      Alert.alert("오류", "분석에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScreenHeader showLogo />
      <View style={{ backgroundColor: "#fff", borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB", padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={onBack}>
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>계약서 업로드</Text>
          <Text style={{ fontSize: 12, color: "#6B7280" }}>근로계약서를 업로드하면 AI가 자동으로 분석합니다</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: "#E5E7EB", marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 4 }}>근로계약서 촬영/업로드</Text>
          <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>계약서를 촬영하거나 파일을 업로드해주세요</Text>

          {selectedImage ? (
            <View style={{ borderRadius: 8, overflow: "hidden", marginBottom: 12, borderWidth: 0.5, borderColor: "#E5E7EB" }}>
              <View style={{ backgroundColor: "#F0FDF4", padding: 16, alignItems: "center" }}>
                <CheckCircle size={40} color="#10B981" />
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#047857", marginTop: 8 }}>업로드 완료!</Text>
                <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>AI가 계약서를 분석하고 있습니다...</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderTopWidth: 0.5, borderTopColor: "#E5E7EB" }}>
                <FileText size={16} color="#6B7280" />
                <Text style={{ fontSize: 13, color: "#374151", flex: 1 }}>근로계약서.jpg</Text>
                <CheckCircle size={16} color="#10B981" />
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={{ borderWidth: 1.5, borderStyle: "dashed", borderColor: "#D1D5DB", borderRadius: 8, padding: 32, alignItems: "center", marginBottom: 12, backgroundColor: "#F9FAFB" }}
              onPress={() => Alert.alert("갤러리", "갤러리 연동 준비 중입니다.")}
            >
              <Upload size={28} color="#9CA3AF" />
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 8 }}>파일을 드래그하거나 클릭하여 업로드</Text>
              <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>JPG, PNG, PDF 파일 지원 (최대 10MB)</Text>
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, backgroundColor: "#F9FAFB", borderRadius: 8, borderWidth: 0.5, borderColor: "#E5E7EB" }}
              onPress={() => {
                setSelectedImage("camera_mock");
                Alert.alert("카메라", "카메라 연동 준비 중입니다.\n(목업: 이미지 선택됨으로 처리)");
              }}
            >
              <Camera size={15} color="#6B7280" />
              <Text style={{ fontSize: 13, color: "#374151" }}>카메라로 촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, backgroundColor: "#F9FAFB", borderRadius: 8, borderWidth: 0.5, borderColor: "#E5E7EB" }}
              onPress={() => {
                setSelectedImage("gallery_mock");
                Alert.alert("갤러리", "갤러리 연동 준비 중입니다.\n(목업: 이미지 선택됨으로 처리)");
              }}
            >
              <ImageIcon size={15} color="#6B7280" />
              <Text style={{ fontSize: 13, color: "#374151" }}>파일 선택</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: "#E5E7EB" }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 8 }}>필수 확인 사항</Text>
            {["근로계약서 전체 페이지", "서명 및 날인이 선명한 사진", "근무 시간, 임금, 휴일 등 조항 포함"].map((item) => (
              <View key={item} style={{ flexDirection: "row", alignItems: "flex-start", gap: 4, marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: "#10B981" }}>✓</Text>
                <Text style={{ fontSize: 11, color: "#6B7280", flex: 1 }}>{item}</Text>
              </View>
            ))}
          </View>
          <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: "#E5E7EB" }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 8 }}>촬영 팁</Text>
            {["자연광에서 촬영하면 더 선명합니다", "문서를 평평하게 펼쳐주세요", "그림자가 생기지 않도록 주의"].map((item) => (
              <View key={item} style={{ flexDirection: "row", alignItems: "flex-start", gap: 4, marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: "#3B82F6" }}>✓</Text>
                <Text style={{ fontSize: 11, color: "#6B7280", flex: 1 }}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: "#EFF6FF", borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: "#BFDBFE" }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#1D4ED8", marginBottom: 4 }}>개인정보 보호</Text>
          <Text style={{ fontSize: 11, color: "#3B82F6", lineHeight: 17 }}>
            업로드된 계약서는 암호화되어 안전하게 저장되며, AI 분석 후 즉시 조회 검토에만 사용됩니다. 제3자에 공유되지 않습니다.
          </Text>
        </View>
      </ScrollView>

      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopWidth: 0.5, borderTopColor: "#E5E7EB", padding: 16, flexDirection: "row", gap: 12, alignItems: "center" }}>
        {isAnalyzing ? (
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, backgroundColor: "#2563EB", borderRadius: 12 }}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={{ color: "#fff", fontWeight: "600" }}>분석 중...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 14, backgroundColor: selectedImage ? "#2563EB" : "#93C5FD", borderRadius: 12, alignItems: "center" }}
              onPress={handleAnalyze}
              disabled={!selectedImage}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                {selectedImage ? "분석 결과 보기 →" : "파일을 업로드해주세요"}
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

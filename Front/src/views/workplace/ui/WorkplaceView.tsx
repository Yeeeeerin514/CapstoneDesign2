import { useState } from "react";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View, Alert, Platform, StatusBar } from "react-native";
import { Star } from "lucide-react-native";
import type { ContractAnalysisResult } from "@/entities/job-post";
import { useFavoriteWorkplaceStore } from "@/features/favorite-workplace";
import { ScreenHeader } from "@/shared/ui";
import { ContractUploadView } from "./ContractUploadView";
import { ContractAnalysisView } from "./ContractAnalysisView";

type Screen = "list" | "upload" | "analysis";

export function WorkplaceView(): JSX.Element {
  const { workplaces, removeWorkplace, updateContractStatus } = useFavoriteWorkplaceStore();
  const [currentScreen, setCurrentScreen] = useState<Screen>("list");
  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ContractAnalysisResult | null>(null);

  const selectedWorkplace = workplaces.find((w) => w.id === selectedWorkplaceId);

  if (currentScreen === "upload" && selectedWorkplace) {
    return (
      <ContractUploadView
        workplaceName={selectedWorkplace.name}
        onBack={() => setCurrentScreen("list")}
        onAnalysisComplete={(result) => {
          setAnalysisResult(result);
          updateContractStatus(selectedWorkplace.id, "analyzed");
          setCurrentScreen("analysis");
        }}
      />
    );
  }

  if (currentScreen === "analysis" && analysisResult) {
    return (
      <ContractAnalysisView
        result={analysisResult}
        onBack={() => setCurrentScreen("upload")}
        onRegister={() => {
          Alert.alert("사업장 등록", "BSSID 등록 화면으로 이동합니다.\n(준비 중)");
          setCurrentScreen("list");
        }}
      />
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#F8FAFC",
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
      }}
    >
      <ScreenHeader showLogo />
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 }}>
          관심업장
        </Text>

        {workplaces.length === 0 ? (
          <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 24, alignItems: "center", borderWidth: 0.5, borderColor: "#E5E7EB" }}>
            <Star size={32} color="#D1D5DB" />
            <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8, textAlign: "center" }}>
              등록된 관심업장이 없어요.{"\n"}홈에서 공고를 분석하고 별 아이콘을 눌러 등록하세요.
            </Text>
          </View>
        ) : (
          <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 0.5, borderColor: "#E5E7EB", overflow: "hidden" }}>
            {workplaces.map((wp, idx) => (
              <View
                key={wp.id}
                style={{
                  padding: 16,
                  borderBottomWidth: idx < workplaces.length - 1 ? 0.5 : 0,
                  borderBottomColor: "#E5E7EB",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
                    {wp.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert("관심업장 삭제", `${wp.name}을(를) 삭제하시겠어요?`, [
                        { text: "취소", style: "cancel" },
                        { text: "삭제", style: "destructive", onPress: () => removeWorkplace(wp.id) },
                      ])
                    }
                  >
                    <Star size={18} color="#2563EB" fill="#2563EB" />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedWorkplaceId(wp.id);
                      setCurrentScreen("upload");
                    }}
                    style={{ flex: 1, paddingVertical: 8, backgroundColor: "#EFF6FF", borderRadius: 8, borderWidth: 0.5, borderColor: "#93C5FD", alignItems: "center" }}
                  >
                    <Text style={{ fontSize: 13, color: "#1D4ED8", fontWeight: "600" }}>계약서 업로드</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Alert.alert("업장 등록", "BSSID 등록 화면으로 이동합니다.\n(준비 중)")}
                    style={{ flex: 1, paddingVertical: 8, backgroundColor: "#F9FAFB", borderRadius: 8, borderWidth: 0.5, borderColor: "#D1D5DB", alignItems: "center" }}
                  >
                    <Text style={{ fontSize: 13, color: "#374151", fontWeight: "600" }}>업장 등록</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

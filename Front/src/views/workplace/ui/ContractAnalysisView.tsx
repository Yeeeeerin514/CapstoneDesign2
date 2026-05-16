import { useState } from "react";
import {
  SafeAreaView, ScrollView, Text, TouchableOpacity, View
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import type { ContractAnalysisResult } from "@/entities/job-post";
import { ScreenHeader } from "@/shared/ui";

type TabKey = "issues" | "content" | "guide";

interface Props {
  result: ContractAnalysisResult;
  onBack: () => void;
  onRegister: () => void;
}

const ISSUE_STYLES = {
  danger:  { bg: "#FEF2F2", border: "#EF4444", titleColor: "#991B1B", descColor: "#B91C1C" },
  warning: { bg: "#FEF9F0", border: "#F59E0B", titleColor: "#92400E", descColor: "#B45309" },
  info:    { bg: "#EFF6FF", border: "#60A5FA", titleColor: "#1E40AF", descColor: "#1D4ED8" },
};

export function ContractAnalysisView({ result, onBack, onRegister }: Props): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>("issues");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScreenHeader showLogo />
      <View style={{ backgroundColor: "#fff", borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB", padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={onBack}>
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>AI 계약서 분석</Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ backgroundColor: "#F0FDF4", borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 0.5, borderColor: "#86EFAC" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#166534" }}>{result.workplaceName}</Text>
            <View style={{ backgroundColor: "#DCFCE7", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, color: "#15803D", fontWeight: "600" }}>계약 기간 {result.contractPeriod}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <View>
              <Text style={{ fontSize: 11, color: "#15803D", marginBottom: 2 }}>시급</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#166534" }}>{result.hourlyWage.toLocaleString()}원</Text>
            </View>
            <View>
              <Text style={{ fontSize: 11, color: "#15803D", marginBottom: 2 }}>예상 월급</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#166534" }}>약 {Math.round(result.estimatedMonthlyPay / 10000)}만원</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {([
            { key: "issues", label: `발견 이슈 (${result.issues.length})`, isActive: activeTab === "issues", activeBg: "#EF4444", activeText: "#fff" },
            { key: "content", label: "계약 내용", isActive: activeTab === "content", activeBg: "#374151", activeText: "#fff" },
            { key: "guide", label: "법률 가이드", isActive: activeTab === "guide", activeBg: "#374151", activeText: "#fff" },
          ] as { key: TabKey; label: string; isActive: boolean; activeBg: string; activeText: string }[]).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center",
                backgroundColor: tab.isActive ? tab.activeBg : "#fff",
                borderWidth: 0.5, borderColor: tab.isActive ? tab.activeBg : "#E5E7EB",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: tab.isActive ? tab.activeText : "#6B7280" }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "issues" && (
          <View style={{ gap: 8 }}>
            {result.issues.map((issue, idx) => {
              const s = ISSUE_STYLES[issue.level];
              return (
                <View key={idx} style={{ backgroundColor: s.bg, borderLeftWidth: 3, borderLeftColor: s.border, borderRadius: 0, paddingVertical: 10, paddingRight: 12, paddingLeft: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: s.titleColor, marginBottom: 3 }}>{issue.title}</Text>
                  <Text style={{ fontSize: 12, color: s.descColor, marginBottom: 3 }}>{issue.description}</Text>
                  <Text style={{ fontSize: 11, color: "#6B7280" }}>관련 법률: {issue.legalBasis}</Text>
                </View>
              );
            })}
          </View>
        )}

        {activeTab === "content" && (
          <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: "#E5E7EB", alignItems: "center" }}>
            <Text style={{ fontSize: 13, color: "#6B7280" }}>계약 내용 탭 — 준비 중</Text>
          </View>
        )}

        {activeTab === "guide" && (
          <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: "#E5E7EB", alignItems: "center" }}>
            <Text style={{ fontSize: 13, color: "#6B7280" }}>법률 가이드 탭 — 준비 중</Text>
          </View>
        )}
      </ScrollView>

      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopWidth: 0.5, borderTopColor: "#E5E7EB", padding: 16 }}>
        <TouchableOpacity
          onPress={onRegister}
          style={{ paddingVertical: 14, backgroundColor: "#111827", borderRadius: 12, alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>사업장 등록하기 →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

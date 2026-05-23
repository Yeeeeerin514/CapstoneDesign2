import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import {
  scanWifiNetworks,
  useBssidScanStore,
} from "@/features/bssid-scan";

interface BssidRegisterViewProps {
  workplaceName: string;
  onBack: () => void;
  onRegisterComplete: (bssid: string, ssid: string) => void;
}

function levelToBars(level: number): string {
  if (level >= -50) return "●●●●";
  if (level >= -60) return "●●●○";
  if (level >= -70) return "●●○○";
  return "●○○○";
}

function levelToStatus(level: number): { label: string; color: string } {
  if (level >= -55) return { label: "양호", color: "#1D4ED8" };
  if (level >= -70) return { label: "중간", color: "#F97316" };
  return { label: "약함", color: "#94A3B8" };
}

export function BssidRegisterView({
  workplaceName,
  onBack,
  onRegisterComplete,
}: BssidRegisterViewProps): JSX.Element {
  const isScanning = useBssidScanStore((s) => s.isScanning);
  const networks = useBssidScanStore((s) => s.networks);
  const selectedBssid = useBssidScanStore((s) => s.selectedBssid);
  const error = useBssidScanStore((s) => s.error);
  const selectNetwork = useBssidScanStore((s) => s.selectNetwork);
  const reset = useBssidScanStore((s) => s.reset);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    void scanWifiNetworks();
    return () => {
      reset();
    };
  }, [reset]);

  const handleConfirm = (): void => {
    if (selectedBssid === null) return;
    const network = networks.find((n) => n.bssid === selectedBssid);
    if (network === undefined) return;
    onRegisterComplete(network.bssid, network.ssid);
  };

  const hasSelection = selectedBssid !== null;

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
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#0F172A" }}>
            Wi-Fi BSSID 등록
          </Text>
          <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
            {`${workplaceName} Wi-Fi를 등록하여 정확한 근무 시간을 기록합니다`}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        {/* 헤더 + 다시 스캔 */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <View>
            <Text
              style={{ fontSize: 14, fontWeight: "500", color: "#0F172A" }}
            >
              주변 Wi-Fi 네트워크
            </Text>
            <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
              사업장 Wi-Fi를 선택하여 등록하세요
            </Text>
          </View>
          <Pressable
            onPress={() => void scanWifiNetworks()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: "#FFFFFF",
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <Ionicons name="refresh" size={14} color="#475569" />
            <Text style={{ fontSize: 12, color: "#475569" }}>다시 스캔</Text>
          </Pressable>
        </View>

        {/* 접힌 안내 토글 */}
        <Pressable
          onPress={() => setShowInfo(!showInfo)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginBottom: 8,
            alignSelf: "flex-start",
          }}
          hitSlop={6}
        >
          <Ionicons
            name="information-circle-outline"
            size={14}
            color="#7E22CE"
          />
          <Text
            style={{ fontSize: 12, color: "#7E22CE", fontWeight: "500" }}
          >
            Wi-Fi BSSID란?
          </Text>
          <Ionicons
            name={showInfo ? "chevron-up" : "chevron-down"}
            size={14}
            color="#7E22CE"
          />
        </Pressable>

        {showInfo ? (
          <View
            style={{
              backgroundColor: "#FAF5FF",
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#E9D5FF",
            }}
          >
            <Text style={{ fontSize: 12, color: "#581C87", lineHeight: 20 }}>
              • 고유 식별자: BSSID는 각 Wi-Fi 라우터의 MAC 주소로, 변경이
              불가능합니다{"\n"}• 정확한 위치 인증: 등록한 BSSID에 연결될 때만
              출퇴근이 인정됩니다{"\n"}• 위치 위조 방지: GPS는 조작 가능하지만,
              BSSID는 물리적으로 그 장소에 있어야만 감지됩니다{"\n"}• 법적 효력:
              노동청 진정 시 가장 강력한 근무 증거로 인정됩니다
            </Text>
          </View>
        ) : null}

        {/* 네트워크 리스트 */}
        {isScanning ? (
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ fontSize: 13, color: "#64748B" }}>
              Wi-Fi 스캔 중...
            </Text>
          </View>
        ) : error !== null ? (
          <View
            style={{
              padding: 16,
              backgroundColor: "#FEF2F2",
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 13, color: "#B91C1C" }}>{error}</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {networks.map((network) => {
              const isSelected = selectedBssid === network.bssid;
              const status = levelToStatus(network.level);
              return (
                <Pressable
                  key={network.bssid}
                  onPress={() => selectNetwork(network.bssid)}
                  style={{
                    backgroundColor: isSelected ? "#EFF6FF" : "#FFFFFF",
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? "#2563EB" : "#E2E8F0",
                    borderRadius: 10,
                    padding: 14,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: "#0F172A",
                        }}
                      >
                        {network.ssid}
                      </Text>
                      {network.isRecommended === true ? (
                        <View
                          style={{
                            backgroundColor: "#DBEAFE",
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              color: "#1E40AF",
                              fontWeight: "500",
                            }}
                          >
                            추천
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#94A3B8",
                        marginTop: 2,
                      }}
                    >
                      {network.bssid}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: status.color,
                        fontWeight: "500",
                      }}
                    >
                      {status.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: "#94A3B8",
                        marginTop: 2,
                      }}
                    >
                      {levelToBars(network.level)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
          flexDirection: "row",
          gap: 8,
        }}
      >
        <Pressable
          onPress={onBack}
          style={{
            flex: 1,
            paddingVertical: 14,
            backgroundColor: "#F8FAFC",
            borderRadius: 10,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#E2E8F0",
          }}
        >
          <Text style={{ color: "#475569", fontSize: 14, fontWeight: "500" }}>
            이전으로
          </Text>
        </Pressable>
        <Pressable
          onPress={handleConfirm}
          disabled={!hasSelection}
          style={{
            flex: 2,
            paddingVertical: 14,
            backgroundColor: hasSelection ? "#2563EB" : "#94A3B8",
            borderRadius: 10,
            alignItems: "center",
            opacity: hasSelection ? 1 : 0.6,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "500" }}>
            {hasSelection ? "이 Wi-Fi로 등록" : "Wi-Fi를 선택해주세요"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

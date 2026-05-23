import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";

interface BssidRegisterCompleteViewProps {
  workplaceName: string;
  ssid: string;
  bssid: string;
  onGoToDashboard: () => void;
  onGoHome: () => void;
}

const STEPS: Array<{ num: string; title: string; desc: string }> = [
  {
    num: "1",
    title: "출근 감지",
    desc: "등록된 Wi-Fi 연결 시 자동 출근 처리",
  },
  {
    num: "2",
    title: "근무 시간 기록",
    desc: "출근 시각부터 퇴근 시각까지 자동으로 근무 시간을 계산합니다",
  },
  {
    num: "3",
    title: "퇴근 감지",
    desc: "자동 퇴근 기록 및 타임스탬프 저장",
  },
];

export function BssidRegisterCompleteView({
  workplaceName: _workplaceName,
  ssid,
  bssid,
  onGoToDashboard,
  onGoHome,
}: BssidRegisterCompleteViewProps): JSX.Element {
  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
    >
      <ScreenHeader showLogo />

      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: "#0F172A" }}>
          사업장 등록 완료
        </Text>
        <Text style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
          이제 자동 근무 기록이 시작됩니다
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        {/* 성공 카드 */}
        <View
          style={{
            backgroundColor: "#EFF6FF",
            borderRadius: 14,
            padding: 20,
            borderWidth: 1,
            borderColor: "#BFDBFE",
            marginBottom: 16,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: "#2563EB",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons name="checkmark" size={32} color="#FFFFFF" />
          </View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#1E40AF",
              marginBottom: 4,
            }}
          >
            사업장 등록이 완료되었습니다!
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#1E40AF",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            이제 자동으로 근무 시간이 기록됩니다. 앱을 열 필요가 없습니다.
          </Text>
          <View
            style={{
              backgroundColor: "#2563EB",
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 16,
            }}
          >
            <Text
              style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "500" }}
            >
              ✓ 자동 근무 기록 활성화됨
            </Text>
          </View>
        </View>

        {/* BSSID 정보 카드 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: "#E2E8F0",
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: "#FAF5FF",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="wifi" size={20} color="#7E22CE" />
            </View>
            <View>
              <Text
                style={{ fontSize: 14, fontWeight: "500", color: "#0F172A" }}
              >
                Wi-Fi BSSID
              </Text>
              <Text style={{ fontSize: 11, color: "#64748B" }}>
                근무 시간 실시간 기록
              </Text>
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ fontSize: 12, color: "#64748B" }}>네트워크</Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "#0F172A",
                  fontWeight: "500",
                }}
              >
                {ssid}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ fontSize: 12, color: "#64748B" }}>BSSID</Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "#0F172A",
                  fontWeight: "500",
                }}
              >
                {bssid}
              </Text>
            </View>
          </View>

          <View
            style={{
              marginTop: 12,
              backgroundColor: "#2563EB",
              paddingVertical: 8,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "500" }}
            >
              ✓ 활성화됨
            </Text>
          </View>
        </View>

        {/* 작동 방식 안내 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: "#E2E8F0",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: "#0F172A",
              marginBottom: 4,
            }}
          >
            근무 기록 작동 방식
          </Text>
          <Text style={{ fontSize: 11, color: "#64748B", marginBottom: 12 }}>
            이렇게 근무가 자동으로 기록됩니다
          </Text>
          {STEPS.map((item) => (
            <View
              key={item.num}
              style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "#FAF5FF",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: "#7E22CE",
                    fontWeight: "700",
                  }}
                >
                  {item.num}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color: "#0F172A",
                  }}
                >
                  {item.title}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: "#64748B",
                    marginTop: 2,
                    lineHeight: 16,
                  }}
                >
                  {item.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* 주의사항 */}
        <View
          style={{
            backgroundColor: "#FFFBEB",
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: "#FED7AA",
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: "#92400E",
              marginBottom: 8,
            }}
          >
            ⚠️ 주의사항
          </Text>
          <Text style={{ fontSize: 11, color: "#92400E", lineHeight: 18 }}>
            • 출근/퇴근 시 사업장 Wi-Fi에 연결되어 있어야 정확하게 기록됩니다
            {"\n"}• Wi-Fi 스캔 권한을 허용으로 설정해주세요{"\n"}• 출퇴근 시점에
            앱을 한 번 열어주시면 더 안정적입니다
          </Text>
        </View>
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
          onPress={onGoToDashboard}
          style={{
            flex: 2,
            paddingVertical: 14,
            backgroundColor: "#0F172A",
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "500" }}>
            근무 대시보드로 이동 →
          </Text>
        </Pressable>
        <Pressable
          onPress={onGoHome}
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
            홈으로
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

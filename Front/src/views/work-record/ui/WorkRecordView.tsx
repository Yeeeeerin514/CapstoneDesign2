import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { ScreenHeader, colors, radius, spacing, typography } from "@/shared/ui";
import { useFavoriteWorkplaceStore } from "@/features/favorite-workplace";
import {
  fetchFavoriteWorkplaces,
  fetchRegisteredWorkplaces,
} from "@/entities/workplace";
import { WorkDashboardView } from "./WorkDashboardView";

type Screen = "list" | "dashboard";

export function WorkRecordView(): JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<Screen>("list");
  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<string | null>(
    null,
  );

  const hydrateFromServer = useFavoriteWorkplaceStore(
    (s) => s.hydrateFromServer,
  );

  useFocusEffect(
    useCallback(() => {
      setCurrentScreen("list");
      setSelectedWorkplaceId(null);
      // 백엔드 PartTimeJob으로 store 재구축 (근무업장은 status=REGISTERED).
      // 실패(비로그인/네트워크) 시 무시 → 로컬 store 유지.
      void Promise.all([
        fetchFavoriteWorkplaces(),
        fetchRegisteredWorkplaces(),
      ])
        .then(([favorites, registered]) =>
          hydrateFromServer([...favorites, ...registered]),
        )
        .catch(() => {
          /* 로컬 store 유지 */
        });
    }, [hydrateFromServer]),
  );

  const workplaces = useFavoriteWorkplaceStore((s) =>
    s.workplaces.filter((w) => w.registrationStatus === "registered"),
  );

  if (currentScreen === "dashboard" && selectedWorkplaceId !== null) {
    return (
      <WorkDashboardView
        workplaceId={selectedWorkplaceId}
        onBack={() => {
          setCurrentScreen("list");
          setSelectedWorkplaceId(null);
        }}
      />
    );
  }

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScreenHeader showLogo />

      <View style={{ padding: spacing.lg }}>
        <Text style={typography.title1}>근무 대시보드</Text>
        <Text style={[typography.label, { marginTop: 4 }]}>
          자동으로 기록된 근무 시간과 수당을 확인하세요
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
      >
        {workplaces.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: spacing.xxxl,
              alignItems: "center",
            }}
          >
            <Ionicons
              name="briefcase-outline"
              size={48}
              color={colors.textDisabled}
            />
            <Text
              style={[
                typography.label,
                { marginTop: 12, textAlign: "center" },
              ]}
            >
              아직 등록된 근무 업장이 없습니다.{"\n"}
              관심업장에서 계약서 분석과 BSSID 등록을 마쳐주세요.
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            <Text style={typography.label}>근무하는 업장</Text>
            {workplaces.map((w) => (
              <Pressable
                key={w.id}
                onPress={() => {
                  setSelectedWorkplaceId(w.id);
                  setCurrentScreen("dashboard");
                }}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.lg,
                  padding: spacing.xl,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={typography.title3}>{w.name}</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 4,
                    }}
                  >
                    <Ionicons name="wifi" size={12} color={colors.primary} />
                    <Text style={typography.caption}>
                      {w.ssid ?? "Wi-Fi 등록됨"}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Text style={[typography.label, { color: colors.primary }]}>
                    근무기록
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.primary}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

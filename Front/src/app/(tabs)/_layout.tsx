import { Tabs } from "expo-router";

/**
 * GNB 탭 바 레이아웃
 * 탭 구조: 홈 | 관심업장 | 근무기록 | 신고 | MY
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E2E8F0",
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarLabel: "홈",
        }}
      />
      <Tabs.Screen
        name="workplace"
        options={{
          title: "관심업장",
          tabBarLabel: "관심업장",
        }}
      />
      <Tabs.Screen
        name="work-record"
        options={{
          title: "근무기록",
          tabBarLabel: "근무기록",
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "신고",
          tabBarLabel: "신고",
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: "MY",
          tabBarLabel: "MY",
        }}
      />
    </Tabs>
  );
}

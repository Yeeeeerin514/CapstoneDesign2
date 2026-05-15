import { View, Text, Pressable, FlatList } from "react-native";
import { cn } from "@/shared/lib/utils";
import type { WifiNetwork } from "../lib/wifi-scanner";

interface Props {
  networks: WifiNetwork[];
  selectedBssid: string | null;
  onSelect: (bssid: string) => void;
}

/** dBm 값을 4단계 바 텍스트로 표시. */
function levelToBars(level: number): string {
  if (level >= -50) return "●●●●";
  if (level >= -65) return "●●●○";
  if (level >= -80) return "●●○○";
  return "●○○○";
}

/** 2-2-2 화면 — 주변 Wi-Fi 목록 + 선택. */
export function BssidScanList({
  networks,
  selectedBssid,
  onSelect,
}: Props): JSX.Element {
  return (
    <FlatList
      data={networks}
      keyExtractor={(item) => item.bssid}
      ItemSeparatorComponent={() => <View className="h-2" />}
      ListEmptyComponent={
        <Text className="text-center text-text-secondary py-8">
          주변 Wi-Fi 네트워크가 없어요. 다시 스캔해 보세요.
        </Text>
      }
      renderItem={({ item }) => {
        const isSelected = selectedBssid === item.bssid;
        return (
          <Pressable
            onPress={() => onSelect(item.bssid)}
            className={cn(
              "flex-row items-center justify-between px-4 py-3 rounded-xl border",
              isSelected
                ? "border-primary bg-primary-light"
                : "border-border bg-card",
            )}
          >
            <View className="gap-1">
              <Text className="text-sm font-semibold text-text-primary">
                {item.ssid}
              </Text>
              <Text className="text-xs text-text-disabled">{item.bssid}</Text>
            </View>
            <Text className="text-xs text-text-secondary">
              {levelToBars(item.level)}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

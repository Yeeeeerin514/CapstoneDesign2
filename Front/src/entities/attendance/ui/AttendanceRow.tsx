import { View, Text } from "react-native";
import { Badge } from "@/shared/ui";
import { formatCurrency } from "@/shared/lib/utils";
import { formatDuration, parseIso, formatTime } from "@/shared/lib/format-date";
import type { AttendanceRecord } from "../model/types";

interface Props {
  record: AttendanceRecord;
}

/** 최근 근무 기록 리스트 한 줄 (3-2 화면). */
export function AttendanceRow({ record }: Props): JSX.Element {
  const checkInLabel = formatTime(parseIso(record.checkInAt));
  const checkOutLabel =
    record.checkOutAt !== null ? formatTime(parseIso(record.checkOutAt)) : "근무 중";

  return (
    <View className="bg-card rounded-2xl border border-border p-4 gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-text-primary">
          {record.date}
        </Text>
        <Text className="text-xs text-text-secondary">
          {checkInLabel} ~ {checkOutLabel}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Text className="text-sm text-text-primary">
          {formatDuration(record.workedMinutes)}
        </Text>
        {record.overtimeMinutes > 0 && (
          <Badge label={`연장 ${formatDuration(record.overtimeMinutes)}`} tone="caution" />
        )}
        {record.nightWorkedMinutes > 0 && (
          <Badge label={`야간 ${formatDuration(record.nightWorkedMinutes)}`} tone="info" />
        )}
      </View>
      <Text className="text-sm font-semibold text-primary">
        추정 {formatCurrency(record.estimatedWage)}
      </Text>
    </View>
  );
}

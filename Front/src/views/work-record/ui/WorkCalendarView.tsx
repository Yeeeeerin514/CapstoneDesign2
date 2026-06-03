import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/shared/ui";
import { useAttendanceStore, type AttendanceRecord } from "@/entities/attendance";

interface WorkCalendarViewProps {
  workplaceId: string;
  workplaceName: string;
  onBack: () => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getMonthMatrix(year: number, month: number): Array<Array<Date | null>> {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const matrix: Array<Array<Date | null>> = [];
  let week: Array<Date | null> = [];

  for (let i = 0; i < startWeekday; i++) {
    week.push(null);
  }

  for (let day = 1; day <= totalDays; day++) {
    week.push(new Date(year, month, day));
    if (week.length === 7) {
      matrix.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null);
    }
    matrix.push(week);
  }

  return matrix;
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function WorkCalendarView({
  workplaceName,
  onBack,
}: WorkCalendarViewProps): JSX.Element {
  // 대시보드가 이미 store에 로드한 실제 출퇴근 이력을 공유해서 사용.
  const recentAttendances = useAttendanceStore((s) => s.recentAttendances);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    recentAttendances.forEach((a) => map.set(a.date, a));
    return map;
  }, [recentAttendances]);

  const matrix = useMemo(
    () => getMonthMatrix(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const handlePrevMonth = (): void => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  const handleNextMonth = (): void => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const monthlyStats = useMemo(() => {
    const records = [...attendanceMap.values()].filter((r) => {
      const d = new Date(r.date);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    });
    const totalMinutes = records.reduce((sum, r) => sum + r.workedMinutes, 0);
    const totalWage = records.reduce((sum, r) => sum + r.estimatedWage, 0);
    return {
      workDays: records.length,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      totalWage,
    };
  }, [attendanceMap, viewYear, viewMonth]);

  const selectedRecord =
    selectedDate !== null ? attendanceMap.get(selectedDate) : undefined;

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
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
            근무 기록 달력
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            {workplaceName}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 80 }}
      >
        {/* 월 네비게이션 */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: "#E2E8F0",
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Pressable onPress={handlePrevMonth} hitSlop={10}>
              <Ionicons name="chevron-back" size={20} color="#475569" />
            </Pressable>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}>
              {`${viewYear}년 ${viewMonth + 1}월`}
            </Text>
            <Pressable onPress={handleNextMonth} hitSlop={10}>
              <Ionicons name="chevron-forward" size={20} color="#475569" />
            </Pressable>
          </View>

          {/* 요일 헤더 */}
          <View style={{ flexDirection: "row", marginBottom: 8 }}>
            {WEEKDAYS.map((wd, i) => (
              <View key={wd} style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "500",
                    color:
                      i === 0 ? "#EF4444" : i === 6 ? "#2563EB" : "#64748B",
                  }}
                >
                  {wd}
                </Text>
              </View>
            ))}
          </View>

          {/* 날짜 그리드 */}
          {matrix.map((week, weekIdx) => (
            <View
              key={weekIdx}
              style={{ flexDirection: "row", marginBottom: 4 }}
            >
              {week.map((date, dayIdx) => {
                if (date === null) {
                  return (
                    <View
                      key={dayIdx}
                      style={{ flex: 1, aspectRatio: 1 }}
                    />
                  );
                }
                const dateStr = toDateString(date);
                const record = attendanceMap.get(dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === toDateString(today);
                const dayOfWeek = date.getDay();
                const textColor =
                  dayOfWeek === 0
                    ? "#EF4444"
                    : dayOfWeek === 6
                      ? "#2563EB"
                      : "#0F172A";

                return (
                  <Pressable
                    key={dayIdx}
                    onPress={() =>
                      setSelectedDate(record !== undefined ? dateStr : null)
                    }
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 2,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: isSelected
                          ? "#2563EB"
                          : record !== undefined
                            ? "#EFF6FF"
                            : "transparent",
                        borderWidth: isToday && !isSelected ? 1 : 0,
                        borderColor: "#2563EB",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: record !== undefined ? "700" : "400",
                          color: isSelected
                            ? "#FFFFFF"
                            : record !== undefined
                              ? "#2563EB"
                              : textColor,
                        }}
                      >
                        {date.getDate()}
                      </Text>
                    </View>
                    {record !== undefined ? (
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: isSelected ? "#FFFFFF" : "#2563EB",
                          marginTop: 2,
                        }}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* 월간 통계 */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "#FFFFFF",
              borderRadius: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <Text style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>
              출근일수
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
              {`${monthlyStats.workDays}일`}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: "#FFFFFF",
              borderRadius: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <Text style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>
              총 근무시간
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
              {`${monthlyStats.totalHours}h`}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: "#FFFFFF",
              borderRadius: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <Text style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>
              월 수당
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#2563EB" }}>
              {`₩${(monthlyStats.totalWage / 10000).toFixed(0)}만`}
            </Text>
          </View>
        </View>

        {/* 선택 날짜 상세 */}
        {selectedRecord !== undefined ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: "#0F172A",
                marginBottom: 12,
              }}
            >
              {`${selectedRecord.date} (${WEEKDAYS[new Date(selectedRecord.date).getDay()]}) 근무 상세`}
            </Text>
            <View style={{ gap: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 13, color: "#64748B" }}>
                  출근 시각
                </Text>
                <Text
                  style={{ fontSize: 13, fontWeight: "500", color: "#0F172A" }}
                >
                  {selectedRecord.actualCheckIn ?? "-"}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 13, color: "#64748B" }}>
                  퇴근 시각
                </Text>
                <Text
                  style={{ fontSize: 13, fontWeight: "500", color: "#0F172A" }}
                >
                  {selectedRecord.actualCheckOut ?? "-"}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 13, color: "#64748B" }}>
                  근무 시간
                </Text>
                <Text
                  style={{ fontSize: 13, fontWeight: "500", color: "#0F172A" }}
                >
                  {`${Math.floor(selectedRecord.workedMinutes / 60)}시간 ${(selectedRecord.workedMinutes % 60).toString().padStart(2, "0")}분`}
                </Text>
              </View>
              {selectedRecord.overtimeMinutes > 0 ? (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontSize: 13, color: "#64748B" }}>
                    연장근무
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "500",
                      color: "#F97316",
                    }}
                  >
                    {`+${selectedRecord.overtimeMinutes}분`}
                  </Text>
                </View>
              ) : null}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingTop: 10,
                  borderTopWidth: 1,
                  borderTopColor: "#F1F5F9",
                }}
              >
                <Text style={{ fontSize: 13, color: "#64748B" }}>일급</Text>
                <Text
                  style={{ fontSize: 15, fontWeight: "700", color: "#2563EB" }}
                >
                  {`₩${selectedRecord.estimatedWage.toLocaleString()}`}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 20,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              alignItems: "center",
            }}
          >
            <Text
              style={{ fontSize: 12, color: "#94A3B8", textAlign: "center" }}
            >
              근무한 날짜를 누르면{"\n"}상세 정보를 볼 수 있어요
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

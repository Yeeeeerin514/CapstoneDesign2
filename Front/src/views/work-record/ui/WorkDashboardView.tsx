import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  ScreenHeader,
  colors,
  radius,
  spacing,
  typography,
} from "@/shared/ui";
import { formatMinutes } from "@/shared/lib/utils";
import { useFavoriteWorkplaceStore } from "@/features/favorite-workplace";
import {
  fetchAttendances,
  fetchTotalMinutes,
  useAttendanceStore,
} from "@/entities/attendance";
import { useReportStore } from "@/features/report-submit";
import { WorkCalendarView } from "./WorkCalendarView";

interface WorkDashboardViewProps {
  workplaceId: string;
  onBack: () => void;
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/** 회색 스켈레톤 박스 — 총·주간 근무시간 로딩 중 표시. */
function MinutesSkeleton(): JSX.Element {
  return (
    <View
      style={{
        width: 80,
        height: 24,
        borderRadius: 4,
        backgroundColor: colors.border,
      }}
    />
  );
}

/** 이번 주 월요일 00:00 (로컬 타임). */
function thisWeekMondayStart(): Date {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun ~ 6=Sat
  const daysFromMonday = (dow + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function WorkDashboardView({
  workplaceId,
  onBack,
}: WorkDashboardViewProps): JSX.Element {
  const [showCalendar, setShowCalendar] = useState(false);
  const [totalMinutes, setTotalMinutes] = useState<number | null>(null);
  const [weeklyMinutes, setWeeklyMinutes] = useState<number | null>(null);
  const [sessionElapsed, setSessionElapsed] = useState(0);

  const workplace = useFavoriteWorkplaceStore((s) =>
    s.workplaces.find((w) => w.id === workplaceId),
  );
  const partTimeJobId = workplace?.partTimeJobId;
  const workState = useAttendanceStore((s) => s.workState);
  const activeSession = useAttendanceStore((s) => s.activeSession);
  const stats = useAttendanceStore((s) => s.stats);
  const recentAttendances = useAttendanceStore((s) => s.recentAttendances);
  const startReport = useReportStore((s) => s.startReport);
  const allCases = useReportStore((s) => s.cases);
  // workplaceId 제거 후 사건은 workplaceName으로 매핑.
  const hasActiveReport = allCases.some(
    (c) => c.workplaceName === workplace?.name && c.status !== "RESOLVED",
  );

  useEffect(() => {
    if (workState !== "working") return;
    const interval = setInterval(() => {
      useAttendanceStore.getState().tickWorkedMinutes();
    }, 60_000);
    return () => clearInterval(interval);
  }, [workState]);

  // 화면 진입 시 누적/이번주 근무시간 로드
  useFocusEffect(
    useCallback(() => {
      if (partTimeJobId === undefined) {
        // 백엔드 등록 전 (BSSID 미등록): API 호출 불가 → 0으로 표시
        setTotalMinutes(0);
        setWeeklyMinutes(0);
        return;
      }
      setTotalMinutes(null);
      setWeeklyMinutes(null);
      // 백엔드에서 현재 출근 상태 + 최근 이력 + 주간 통계 로드 (실제 데이터)
      void useAttendanceStore
        .getState()
        .load(partTimeJobId, workplace?.workHourlyWage ?? 10030);
      fetchTotalMinutes(partTimeJobId)
        .then(setTotalMinutes)
        .catch(() => {
          console.warn("[Dashboard] 총 근무시간 로드 실패");
          setTotalMinutes(0);
        });
      fetchAttendances(String(partTimeJobId))
        .then((records) => {
          const mondayMs = thisWeekMondayStart().getTime();
          const sum = records.reduce((acc, r) => {
            const t =
              r.actualCheckInIso !== undefined
                ? new Date(r.actualCheckInIso).getTime()
                : new Date(r.date).getTime();
            return t >= mondayMs ? acc + r.workedMinutes : acc;
          }, 0);
          setWeeklyMinutes(sum);
        })
        .catch(() => {
          console.warn("[Dashboard] 주간 근무시간 로드 실패");
          setWeeklyMinutes(0);
        });
    }, [partTimeJobId]),
  );

  // 출근 중이면 1분마다 라이브 세션 경과(분) 갱신
  const clockInIso = activeSession?.actualCheckInIso;
  useEffect(() => {
    if (workState !== "working" || clockInIso === undefined) {
      setSessionElapsed(0);
      return;
    }
    const update = (): void => {
      const start = new Date(clockInIso).getTime();
      setSessionElapsed(Math.max(0, Math.floor((Date.now() - start) / 60_000)));
    };
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, [workState, clockInIso]);

  const isWorking = workState === "working";
  const displayMinutes = (totalMinutes ?? 0) + sessionElapsed;
  const weeklyHoursDisplay =
    weeklyMinutes !== null ? Math.round((weeklyMinutes / 60) * 10) / 10 : null;
  const weeklyProgressPercent =
    weeklyHoursDisplay !== null
      ? Math.min(
          Math.round((weeklyHoursDisplay / stats.weeklyTargetHours) * 100),
          100,
        )
      : 0;
  const progressWidth: `${number}%` = `${weeklyProgressPercent}%`;
  const remainingHours =
    weeklyHoursDisplay !== null
      ? Math.max(0, stats.weeklyTargetHours - weeklyHoursDisplay).toFixed(1)
      : "—";

  if (showCalendar) {
    return (
      <WorkCalendarView
        workplaceId={workplaceId}
        workplaceName={workplace?.name ?? "xx카페 강남점"}
        onBack={() => setShowCalendar(false)}
      />
    );
  }

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScreenHeader showLogo />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: spacing.lg,
          gap: 8,
        }}
      >
        <Pressable onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View>
          <Text style={typography.title2}>근무 대시보드</Text>
          <Text style={[typography.caption, { marginTop: 2 }]}>
            {workplace?.name ?? "xx카페 강남점"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
      >
        {/* 근무 상태 카드 */}
        {isWorking && activeSession !== null ? (
          <View
            style={{
              backgroundColor: colors.primaryLight,
              borderRadius: radius.lg,
              padding: spacing.xxl,
              marginBottom: spacing.lg,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="time" size={18} color={colors.primary} />
                <View>
                  <Text style={[typography.label, { color: colors.primary }]}>
                    근무 중
                  </Text>
                  <Text style={typography.caption}>
                    {`출근: ${activeSession.actualCheckIn ?? "-"}`}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: radius.sm,
                }}
              >
                <Text
                  style={{
                    color: colors.white,
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  ● LIVE
                </Text>
              </View>
            </View>
            <View style={{ alignItems: "center", marginTop: spacing.md }}>
              {totalMinutes === null ? (
                <MinutesSkeleton />
              ) : (
                <Text style={typography.display}>
                  {formatMinutes(displayMinutes)}
                </Text>
              )}
              <Text style={[typography.caption, { marginTop: 4 }]}>
                총 근무 시간
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 4,
                marginTop: 10,
              }}
            >
              <Ionicons name="wifi" size={12} color={colors.primary} />
              <Text
                style={[
                  typography.caption,
                  { color: colors.primary, fontWeight: "500" },
                ]}
              >
                Wi-Fi 연결됨
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: colors.bgSecondary,
              borderRadius: radius.lg,
              padding: spacing.xxl,
              marginBottom: spacing.lg,
              alignItems: "center",
            }}
          >
            {totalMinutes === null ? (
              <MinutesSkeleton />
            ) : (
              <Text
                style={[typography.display, { color: colors.textDisabled }]}
              >
                {formatMinutes(totalMinutes)}
              </Text>
            )}
            <Text style={[typography.label, { marginTop: 4 }]}>
              {totalMinutes !== null && totalMinutes > 0
                ? "누적 근무 시간"
                : "아직 근무 시간이 아닙니다"}
            </Text>
            <View
              style={{
                marginTop: 8,
                backgroundColor: colors.surface,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: radius.sm,
              }}
            >
              <Text style={typography.caption}>오프라인</Text>
            </View>
          </View>
        )}

        {/* 진행 정보 (근무 중일 때만) */}
        {isWorking ? (
          <View style={{ marginBottom: spacing.md }}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.sm,
                padding: 10,
                marginBottom: 6,
              }}
            >
              <Text style={typography.body2}>
                {`✓ 주 ${stats.weeklyTargetHours}시간까지 ${remainingHours}시간 남았습니다`}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.sm,
                padding: 10,
              }}
            >
              <Text style={typography.body2}>
                ✓ 이번 주 주휴수당이 적용됩니다 (8시간 추가)
              </Text>
            </View>
          </View>
        ) : null}

        {/* 통계 그리드 */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginBottom: spacing.lg,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginBottom: 6,
              }}
            >
              <Ionicons
                name="time-outline"
                size={12}
                color={colors.primary}
              />
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                주간 근무시간
              </Text>
            </View>
            {weeklyHoursDisplay === null ? (
              <MinutesSkeleton />
            ) : (
              <Text style={typography.title3}>{`${weeklyHoursDisplay}시간`}</Text>
            )}
            <View
              style={{
                height: 4,
                backgroundColor: colors.border,
                borderRadius: 2,
                marginTop: 6,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 4,
                  width: progressWidth,
                  backgroundColor: colors.primary,
                }}
              />
            </View>
            <Text
              style={{
                fontSize: 9,
                color: colors.textTertiary,
                marginTop: 4,
              }}
            >
              {`목표: ${stats.weeklyTargetHours}시간`}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.primary }}>₩</Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                주간 수당
              </Text>
            </View>
            <Text style={typography.title3}>
              {`₩${stats.weeklyWage.toLocaleString()}`}
            </Text>
            <Text
              style={{
                fontSize: 9,
                color: colors.textTertiary,
                marginTop: 8,
              }}
            >
              {`시급 ₩10,000 × ${stats.weeklyWorkedHours}시간`}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginBottom: 6,
              }}
            >
              <Ionicons
                name="calendar-outline"
                size={12}
                color={colors.primary}
              />
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                이번 주 출근
              </Text>
            </View>
            <Text style={typography.title3}>
              {`${stats.weeklyWorkDays}일`}
            </Text>
            <Text
              style={{
                fontSize: 9,
                color: colors.textTertiary,
                marginTop: 8,
              }}
            >
              월~금 중 4일 근무
            </Text>
          </View>
        </View>

        {/* 최근 근무 기록 */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.lg,
          }}
        >
          <Text style={[typography.body1, { marginBottom: 4 }]}>
            최근 근무 기록
          </Text>
          <Text style={[typography.caption, { marginBottom: 12 }]}>
            자동으로 기록된 출퇴근 내역
          </Text>
          {recentAttendances.map((att) => {
            const weekday = WEEKDAY_LABELS[new Date(att.date).getDay()];
            const hours = Math.round((att.workedMinutes / 60) * 10) / 10;
            return (
              <View
                key={att.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <View>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "500",
                        color: colors.text,
                      }}
                    >
                      {`${att.date} (${weekday})`}
                    </Text>
                    <Text style={typography.caption}>
                      {`${att.actualCheckIn ?? "-"} - ${att.actualCheckOut ?? "-"}`}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      color: colors.text,
                    }}
                  >
                    {`${hours}시간`}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.primary,
                      fontWeight: "500",
                    }}
                  >
                    {`₩${att.estimatedWage.toLocaleString()}`}
                  </Text>
                </View>
              </View>
            );
          })}
          <Pressable
            onPress={() => setShowCalendar(true)}
            style={{
              marginTop: 8,
              paddingVertical: 12,
              backgroundColor: colors.primaryLight,
              borderRadius: radius.sm,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={colors.primary}
            />
            <Text
              style={{
                fontSize: 13,
                color: colors.primary,
                fontWeight: "500",
              }}
            >
              근무 기록 달력 보기
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={colors.primary}
            />
          </Pressable>
        </View>

        {/* 신고하기 카드 */}
        <View
          style={{
            marginTop: 16,
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: "#FEE2E2",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: "#FEF2F2",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="warning" size={18} color="#DC2626" />
            </View>
            <Text
              style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}
            >
              문제가 있다면 신고하세요
            </Text>
          </View>
          <Text
            style={{
              fontSize: 12,
              color: "#64748B",
              lineHeight: 18,
              marginBottom: 12,
            }}
          >
            임금체불, 부당해고, 위법 사항이 있다면{"\n"}
            수집된 근무기록을 바탕으로 신고 절차를 시작합니다
          </Text>

          {hasActiveReport ? (
            <Pressable
              onPress={() => router.push("/(tabs)/report")}
              style={{
                backgroundColor: "#FEF2F2",
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#FECACA",
              }}
            >
              <Text
                style={{
                  color: "#DC2626",
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                진행 중인 신고 보기 →
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                // PoC: 사건 매칭/필터링용 메타는 mock으로 채움. 실 데이터는 workplace 도메인에 추가 후 연동.
                // 증거는 앱이 자동 수집한 근무기록·계약서만 반영. 금액은 증거 readiness에 따라 단계적으로 채워짐.
                startReport({
                  workplaceName: workplace?.name ?? "업장",
                  industry: "카페·음식점",
                  region: "서울 강남구",
                  damageTypes: ["임금체불", "주휴수당"],
                  initialEvidence: {
                    contracts: 1,
                    workLogs: recentAttendances.length,
                  },
                });
                router.push("/(tabs)/report");
              }}
              style={{
                backgroundColor: "#DC2626",
                paddingVertical: 13,
                borderRadius: 10,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                🚨 임금체불·위법 신고하기
              </Text>
            </Pressable>
          )}
        </View>

        {__DEV__ ? (
          <View
            style={{
              marginTop: 16,
              padding: 14,
              backgroundColor: "#FEF3C7",
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#FCD34D",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "#92400E",
                marginBottom: 8,
              }}
            >
              📶 근무 기록 (BSSID 검증 · 실제 서버)
            </Text>
            <Text
              style={{ fontSize: 10, color: "#92400E", marginBottom: 10 }}
            >
              {`현재 상태: ${workState}`}
            </Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Pressable
                onPress={() => {
                  if (partTimeJobId === undefined) return;
                  void useAttendanceStore
                    .getState()
                    .clockIn(
                      partTimeJobId,
                      workplace?.bssid ?? "",
                      workplace?.workHourlyWage ?? 10030,
                    )
                    .catch(() => undefined);
                }}
                style={{
                  flex: 1,
                  padding: 8,
                  backgroundColor: "#2563EB",
                  borderRadius: 6,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#FFF", fontSize: 11, fontWeight: "500" }}
                >
                  출근
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  void useAttendanceStore
                    .getState()
                    .clockOut(
                      workplace?.bssid ?? "",
                      workplace?.workHourlyWage ?? 10030,
                    )
                    .catch(() => undefined)
                }
                style={{
                  flex: 1,
                  padding: 8,
                  backgroundColor: "#F97316",
                  borderRadius: 6,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#FFF", fontSize: 11, fontWeight: "500" }}
                >
                  퇴근
                </Text>
              </Pressable>
              <Pressable
                onPress={() => useAttendanceStore.getState().reset()}
                style={{
                  flex: 1,
                  padding: 8,
                  backgroundColor: "#64748B",
                  borderRadius: 6,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#FFF", fontSize: 11, fontWeight: "500" }}
                >
                  리셋
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

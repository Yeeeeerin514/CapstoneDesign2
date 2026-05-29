import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useReportStore } from "@/features/report-submit";
import { ReportEmptyView } from "./ReportEmptyView";
import { ReportListView } from "./ReportListView";
import { ReportDetailView } from "./ReportDetailView";
import { WorkplaceSelectForReportView } from "./WorkplaceSelectForReportView";

type Screen = "list" | "detail" | "workplace-select";

export function ReportView(): JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<Screen>("list");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const cases = useReportStore((s) => s.cases);
  // 진행 중/해결됨 분리는 ReportListView 내부에서 처리.
  // 사건이 0건일 때만 Empty 화면, 1건 이상이면(해결됨 포함) ListView에서 섹션 분리해 표시.

  useFocusEffect(
    useCallback(() => {
      // 일회성 플래그가 설정되어 있으면(예: mentor-chat 라우트로 빠졌다가 돌아온 경우)
      // 현재 상세 화면 상태를 그대로 유지. 그 외엔 list로 복귀.
      const { shouldSkipNextFocusReset, setShouldSkipNextFocusReset } =
        useReportStore.getState();
      if (shouldSkipNextFocusReset) {
        setShouldSkipNextFocusReset(false);
        return;
      }
      setCurrentScreen("list");
      setSelectedCaseId(null);
    }, []),
  );

  if (currentScreen === "detail" && selectedCaseId !== null) {
    return (
      <ReportDetailView
        caseId={selectedCaseId}
        onBack={() => {
          setCurrentScreen("list");
          setSelectedCaseId(null);
        }}
      />
    );
  }

  if (currentScreen === "workplace-select") {
    return (
      <WorkplaceSelectForReportView
        onBack={() => setCurrentScreen("list")}
        onCaseCreated={(caseId) => {
          setSelectedCaseId(caseId);
          setCurrentScreen("detail");
        }}
      />
    );
  }

  if (cases.length === 0) {
    return (
      <ReportEmptyView
        onSelectWorkplace={() => setCurrentScreen("workplace-select")}
      />
    );
  }

  return (
    <ReportListView
      cases={cases}
      onCasePress={(id) => {
        setSelectedCaseId(id);
        setCurrentScreen("detail");
      }}
      onNewReport={() => setCurrentScreen("workplace-select")}
    />
  );
}

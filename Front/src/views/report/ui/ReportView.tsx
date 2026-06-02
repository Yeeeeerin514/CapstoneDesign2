import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useReportStore } from "@/features/report-submit";
import type { BusinessSearchResult } from "@/entities/business";
import { ReportEmptyView } from "./ReportEmptyView";
import { ReportListView } from "./ReportListView";
import { ReportDetailView } from "./ReportDetailView";
import { WorkplaceSelectForReportView } from "./WorkplaceSelectForReportView";
import { ManualBusinessInputView } from "./ManualBusinessInputView";
import { BusinessSearchView } from "./BusinessSearchView";
import { BusinessConfirmView } from "./BusinessConfirmView";

type Screen =
  | "list"
  | "detail"
  | "source-select"        // "+ 새 사건 신고하기" 누른 후 검색/등록업장 선택 화면
  | "workplace-select"
  | "manual-business-input"
  | "business-search"      // V2 사업장 검색
  | "business-confirm";    // V2 검색 결과 카드 탭 후 "이 사업장이 맞나요?"

interface PendingManualInput {
  workplaceId: string;
  workplaceName: string;
  hasContract: boolean;
}

export function ReportView(): JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<Screen>("list");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [pendingManualInput, setPendingManualInput] =
    useState<PendingManualInput | null>(null);
  /** 사업장 검색 결과 카드 탭 직후 confirm 단계로 전달할 데이터. */
  const [confirmCandidate, setConfirmCandidate] =
    useState<BusinessSearchResult | null>(null);
  const startReport = useReportStore((s) => s.startReport);

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

  if (currentScreen === "business-search") {
    return (
      <BusinessSearchView
        onBack={() => setCurrentScreen("list")}
        onSelectResult={(result) => {
          setConfirmCandidate(result);
          setCurrentScreen("business-confirm");
        }}
        onManualInput={(defaultName) => {
          setPendingManualInput({
            workplaceId: `manual-${Date.now()}`,
            workplaceName: defaultName,
            hasContract: false,
          });
          setCurrentScreen("manual-business-input");
        }}
      />
    );
  }

  if (currentScreen === "business-confirm" && confirmCandidate !== null) {
    return (
      <BusinessConfirmView
        business={confirmCandidate}
        onBack={() => {
          setConfirmCandidate(null);
          setCurrentScreen("business-search");
        }}
        onConfirmed={(caseId) => {
          setConfirmCandidate(null);
          setSelectedCaseId(caseId);
          setCurrentScreen("detail");
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

  if (currentScreen === "manual-business-input" && pendingManualInput !== null) {
    const pending = pendingManualInput;
    return (
      <ManualBusinessInputView
        defaultWorkplaceName={pending.workplaceName}
        onBack={() => {
          setPendingManualInput(null);
          setCurrentScreen("workplace-select");
        }}
        onSubmit={({ workplaceName, region, businessRegistrationNumber }) => {
          const caseId = startReport({
            workplaceName,
            businessRegistrationNumber,
            industry: "카페·음식점",
            region,
            damageTypes: ["임금체불"],
            initialEvidence: pending.hasContract ? { contracts: 1 } : {},
          });
          setPendingManualInput(null);
          setSelectedCaseId(caseId);
          setCurrentScreen("detail");
        }}
      />
    );
  }

  if (cases.length === 0) {
    return (
      <ReportEmptyView
        mode="empty"
        onSearchBusiness={() => setCurrentScreen("business-search")}
        onSelectRegistered={() => setCurrentScreen("workplace-select")}
      />
    );
  }

  // "+ 새 사건 신고하기" 진입 — Empty 화면과 동일한 두 갈래 분기 (재사용).
  if (currentScreen === "source-select") {
    return (
      <ReportEmptyView
        mode="add-new-case"
        onBack={() => setCurrentScreen("list")}
        onSearchBusiness={() => setCurrentScreen("business-search")}
        onSelectRegistered={() => setCurrentScreen("workplace-select")}
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
      onNewReport={() => setCurrentScreen("source-select")}
    />
  );
}

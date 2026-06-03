import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useReportStore } from "@/features/report-submit";
import { useReviewStore } from "@/entities/review";
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
  | "source-select"
  | "workplace-select"
  | "manual-business-input"
  | "business-search"
  | "business-confirm";

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
  const [confirmCandidate, setConfirmCandidate] =
    useState<BusinessSearchResult | null>(null);
  const startReport = useReportStore((s) => s.startReport);
  const cases = useReportStore((s) => s.cases);

  useFocusEffect(
    useCallback(() => {
      // 후기 목록을 백엔드에서 로드 (report 탭 진입 시마다)
      void useReviewStore.getState().load();
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

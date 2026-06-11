import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { useReportStore } from "@/features/report-submit";
import { createReportDraft, fetchMyReports } from "@/entities/report";
import { useReviewStore } from "@/entities/review";
import { usePaymentStore } from "@/features/payment";
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
  const createDraft = useReportStore((s) => s.createReportDraft);
  const cases = useReportStore((s) => s.cases);

  useFocusEffect(
    useCallback(() => {
      // 신고 목록 + 후기 + 내 결제 기록을 백엔드에서 로드 (report 탭 진입 시마다).
      // 신고 목록은 서버 DB가 진실의 원천 — 메모리 cases를 서버 응답으로 교체.
      void (async () => {
        try {
          const serverCases = await fetchMyReports();
          useReportStore.getState().hydrateFromServer(serverCases);
        } catch {
          // 서버 조회 실패 시 기존 메모리 cases 유지(오프라인/일시 오류 대비).
        }
      })();
      void useReviewStore.getState().load();
      void usePaymentStore.getState().load();
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
          void (async () => {
            try {
              // 백엔드에 manual draft 생성 → 정수형 caseId 확보.
              // 이게 있어야 이후 AI 진정 내용 생성(POST /reports/{caseId}/complaint-draft)이 가능.
              const res = await createReportDraft({
                source: "manual",
                businessName: workplaceName,
                businessRegistrationNumber,
                businessAddress: region,
              });
              const caseId = String(res.caseId);
              createDraft({
                caseId,
                source: "manual",
                business: res.business,
                region,
              });
              setPendingManualInput(null);
              setSelectedCaseId(caseId);
              setCurrentScreen("detail");
            } catch (err) {
              Alert.alert(
                "신고 생성 실패",
                err instanceof Error ? err.message : "다시 시도해주세요.",
              );
            }
          })();
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

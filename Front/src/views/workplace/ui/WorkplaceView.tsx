import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Star } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { isAxiosError } from "axios";
import {
  saveContractPending,
  clearContractPending,
  listPendingBusinessNames,
  type ContractAnalysisResult,
} from "@/entities/job-post";
import {
  useFavoriteWorkplaceStore,
  type FavoriteWorkplace,
} from "@/features/favorite-workplace";
import { ScreenHeader, colors } from "@/shared/ui";
import { deletePartTimeJob, registerWorkplace } from "@/entities/workplace";
import { useAuthStore } from "@/entities/user/model/auth-store";
import { ContractUploadView } from "./ContractUploadView";
import { ContractAnalysisView } from "./ContractAnalysisView";
import { ContractEditView } from "./ContractEditView";
import { BssidRegisterView } from "./BssidRegisterView";
import { BssidRegisterCompleteView } from "./BssidRegisterCompleteView";
import { WorkInfoInputView } from "./WorkInfoInputView";
import { WorkInfoConfirmView } from "./WorkInfoConfirmView";
import { ContractGateView } from "./ContractGateView";

type ButtonVariant = "disabled" | "primary" | "outline" | "success";

interface ButtonStyle {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  textColor: string;
  opacity: number;
}

const BUTTON_STYLES: Record<ButtonVariant, ButtonStyle> = {
  disabled: {
    backgroundColor: "#F1F5F9",
    borderColor: colors.borderStrong,
    borderWidth: 1,
    textColor: colors.textDisabled,
    opacity: 1,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderWidth: 0,
    textColor: colors.white,
    opacity: 1,
  },
  outline: {
    backgroundColor: colors.white,
    borderColor: colors.primary,
    borderWidth: 1.5,
    textColor: colors.primary,
    opacity: 1,
  },
  success: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 0,
    textColor: colors.primaryDark,
    opacity: 1,
  },
};

type CardAction =
  | "open-gate"        // initial 상태: [업장 등록하기] → 계약서 게이트로
  | "upload-contract"  // 등록 후 계약서 추가 업로드
  | "edit-contract"    // 이미 업로드된 계약서 수정
  | "register-bssid"   // 계약서만 업로드된 상태에서 BSSID 등록만 진행
  | "open-dashboard";  // 등록 완료 — 근무 대시보드로 이동

interface CardButtonState {
  variant: ButtonVariant;
  label: string;
  action: CardAction;
}

/**
 * 카드 버튼 매트릭스 — (계약서 업로드 여부) × (업장 등록 여부) 2×2.
 *   - none × none:    [업장 등록하기] 단일
 *   - none × registered:    [계약서 업로드] + [근무 대시보드]
 *   - uploaded × none:      [계약서 수정] + [BSSID 등록]
 *   - uploaded × registered:[계약서 수정] + [근무 대시보드]
 */
interface CardButtonStates {
  layout: "single" | "dual";
  primary: CardButtonState;
  secondary?: CardButtonState;
}

function getCardButtonStates(workplace: FavoriteWorkplace): CardButtonStates {
  const hasContract =
    workplace.contractStatus === "uploaded" ||
    workplace.contractStatus === "analyzed";
  const isRegistered = workplace.registrationStatus === "registered";

  // 초기 (계약서 X / 등록 X): 단일 [업장 등록하기]
  if (!hasContract && !isRegistered) {
    return {
      layout: "single",
      primary: {
        variant: "primary",
        label: "업장 등록하기",
        action: "open-gate",
      },
    };
  }

  // 계약서 없이 등록만 완료: [계약서 업로드] + [근무 대시보드]
  if (!hasContract && isRegistered) {
    return {
      layout: "dual",
      primary: {
        variant: "outline",
        label: "계약서 업로드",
        action: "upload-contract",
      },
      secondary: {
        variant: "primary",
        label: "근무 대시보드",
        action: "open-dashboard",
      },
    };
  }

  // 계약서만 업로드 / 등록 X: [계약서 수정] + [BSSID 등록]
  if (hasContract && !isRegistered) {
    return {
      layout: "dual",
      primary: {
        variant: "outline",
        label: "계약서 수정",
        action: "edit-contract",
      },
      secondary: {
        variant: "primary",
        label: "BSSID 등록",
        action: "register-bssid",
      },
    };
  }

  // 계약서 + 등록 모두 완료: [계약서 수정] + [근무 대시보드]
  return {
    layout: "dual",
    primary: {
      variant: "outline",
      label: "계약서 수정",
      action: "edit-contract",
    },
    secondary: {
      variant: "primary",
      label: "근무 대시보드",
      action: "open-dashboard",
    },
  };
}

type Screen =
  | "list"
  | "contract-gate"          // [업장 등록하기] 직후 — 계약서 있나요?
  | "upload"
  | "analysis"
  | "edit"
  | "register-step1"         // 근무 정보 입력 (수동 입력 — 건너뛰기 path 전용)
  | "register-step2-confirm" // 근무 정보 확인 (양쪽 path 공통, BSSID 직전)
  | "bssid-register"
  | "register-complete";

interface PendingRegistration {
  workplaceId: string;
  workplaceName: string;
  bssid?: string;
  ssid?: string;
}

export function WorkplaceView(): JSX.Element {
  const {
    workplaces,
    removeWorkplace,
    markContractUploaded,
    updateContractStatus,
    setContractId,
    setPartTimeJobId,
    markRegistered,
    setWorkInfo,
  } = useFavoriteWorkplaceStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [currentScreen, setCurrentScreen] = useState<Screen>("list");
  /** AsyncStorage에 남아있는 분석 완료된 사업장명 셋 — 목록 뱃지 표시용. */
  const [pendingNames, setPendingNames] = useState<Set<string>>(new Set());

  // 목록 진입/복귀 시 AsyncStorage pending 키 로드
  useFocusEffect(
    useCallback(() => {
      void listPendingBusinessNames()
        .then((names) => setPendingNames(new Set(names)))
        .catch(() => setPendingNames(new Set()));
    }, []),
  );
  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<string | null>(
    null,
  );
  const [analysisResult, setAnalysisResult] =
    useState<ContractAnalysisResult | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [pendingRegistration, setPendingRegistration] =
    useState<PendingRegistration | null>(null);
  /**
   * register-step2-confirm 화면이 보여줄 페이로드.
   * - isFromContract=true: 계약서 분석에서 직접 derive — input 단계 건너뜀.
   * - isFromContract=false: 사용자가 register-step1에서 입력한 값.
   */
  const [confirmPayload, setConfirmPayload] = useState<{
    info: import("@/features/favorite-workplace").WorkInfoInput;
    isFromContract: boolean;
  } | null>(null);

  const selectedWorkplace = workplaces.find((w) => w.id === selectedWorkplaceId);

  /**
   * 관심업장 삭제 — 백엔드 part_time_job 동시 정리.
   * - partTimeJobId가 없으면 (BSSID 미등록 단계) 로컬만 제거
   * - 있으면 DELETE /api/part-time-jobs/{id} 호출 후 로컬 제거
   * - 404는 이미 삭제된 것으로 간주하고 로컬도 정리, 그 외 status는 로컬 보존
   */
  const performDelete = async (wp: FavoriteWorkplace): Promise<void> => {
    if (wp.partTimeJobId === undefined) {
      removeWorkplace(wp.id);
      return;
    }
    setDeletingId(wp.id);
    try {
      await deletePartTimeJob(wp.partTimeJobId);
      removeWorkplace(wp.id);
      Alert.alert("삭제됨", "삭제되었습니다");
      // TODO: 서버 기준 동기화 — 추후 fetchWorkplaces() 결과로 store 재구축 함수 도입 시 여기서 호출.
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 404) {
          removeWorkplace(wp.id);
          Alert.alert("이미 삭제됨", "이미 삭제된 알바입니다.");
          return;
        }
        if (status === 403) {
          Alert.alert("권한 없음", "삭제 권한이 없습니다.");
          return;
        }
        if (err.response === undefined) {
          Alert.alert("연결 오류", "인터넷 연결을 확인해주세요.");
          return;
        }
      }
      Alert.alert("삭제 실패", "삭제에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (wp: FavoriteWorkplace): void => {
    Alert.alert(
      "알바를 삭제하시겠어요?",
      "삭제 후에는 복구할 수 없습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제하기",
          style: "destructive",
          onPress: () => {
            void performDelete(wp);
          },
        },
      ],
    );
  };

  if (currentScreen === "contract-gate" && pendingRegistration) {
    const registration = pendingRegistration;
    return (
      <ContractGateView
        workplaceName={registration.workplaceName}
        onBack={() => {
          setPendingRegistration(null);
          setCurrentScreen("list");
        }}
        onUploadContract={() => setCurrentScreen("upload")}
        onSkip={() => setCurrentScreen("register-step1")}
      />
    );
  }

  if (currentScreen === "upload" && selectedWorkplace) {
    return (
      <ContractUploadView
        workplaceId={selectedWorkplace.id}
        workplaceName={selectedWorkplace.name}
        onBack={() => setCurrentScreen("list")}
        onAnalysisComplete={(imageUri, result) => {
          setPendingImageUri(imageUri);
          setAnalysisResult(result);
          // 백엔드 contractId 저장 (분석 응답에 포함된 경우)
          if (result.contractId !== null) {
            setContractId(selectedWorkplace.id, result.contractId);
          }
          // 분석 완료 status 갱신 (analyzed 단계)
          updateContractStatus(selectedWorkplace.id, "analyzed");
          // 4-C: AsyncStorage 캐시 저장 (업장 등록 1단계 pre-fill용, fire-and-forget)
          void saveContractPending(
            selectedWorkplace.name,
            result.contractId,
            result.extracted,
          )
            .then(() => {
              setPendingNames((prev) => new Set(prev).add(selectedWorkplace.name));
            })
            .catch(() => {});
          setCurrentScreen("analysis");
        }}
      />
    );
  }

  if (currentScreen === "analysis" && selectedWorkplace) {
    const fromEdit =
      selectedWorkplace.contractStatus === "uploaded" ||
      selectedWorkplace.contractStatus === "analyzed";
    const result = fromEdit
      ? (selectedWorkplace.contractAnalysis ?? analysisResult)
      : analysisResult;
    if (result === undefined || result === null) {
      setCurrentScreen("list");
      return <View />;
    }
    // 이미 등록된 업장에서 "계약서 업로드" 진입한 경우 — 사업장 등록 흐름이 아니라
    // 계약서만 추가하는 경로. 하단 CTA를 "계약서 업로드 완료"로 바꿔주고
    // 클릭 시엔 분석 결과를 store에 저장하고 list로 복귀.
    const isAlreadyRegistered =
      selectedWorkplace.registrationStatus === "registered";
    return (
      <ContractAnalysisView
        result={result}
        onBack={() => setCurrentScreen(fromEdit ? "edit" : "upload")}
        submitLabel={
          isAlreadyRegistered ? "계약서 업로드 완료" : "내 일터로 등록하기 →"
        }
        onRegister={() => {
          if (!fromEdit && pendingImageUri !== null) {
            markContractUploaded(
              selectedWorkplace.id,
              pendingImageUri,
              result,
            );
          }
          setPendingImageUri(null);

          if (isAlreadyRegistered) {
            // 이미 등록된 업장 — 계약서 저장만 하고 list 복귀.
            setCurrentScreen("list");
            return;
          }

          // 신규 등록 path — 입력 단계 건너뛰고 바로 확인 화면으로.
          // 분석 결과의 extracted 필드에서 WorkInfoInput을 derive.
          setPendingRegistration({
            workplaceId: selectedWorkplace.id,
            workplaceName: selectedWorkplace.name,
          });
          const ex = result.extracted;
          const todayIso = (): string => {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          };
          setConfirmPayload({
            info: {
              workDays: ex.workDays ?? [],
              workStartTime: ex.workStartTime ?? "09:00",
              workEndTime: ex.workEndTime ?? "18:00",
              startDay: ex.employmentStartDate ?? todayIso(),
              hourlyWage:
                ex.hourlyWage !== null && ex.hourlyWage !== undefined
                  ? ex.hourlyWage
                  : undefined,
            },
            isFromContract: true,
          });
          setCurrentScreen("register-step2-confirm");
        }}
      />
    );
  }

  if (currentScreen === "edit" && selectedWorkplace) {
    return (
      <ContractEditView
        workplaceId={selectedWorkplace.id}
        workplaceName={selectedWorkplace.name}
        imageUri={selectedWorkplace.contractImageUri}
        analysis={selectedWorkplace.contractAnalysis}
        onBack={() => setCurrentScreen("list")}
        onViewAnalysisResult={() => setCurrentScreen("analysis")}
      />
    );
  }

  if (currentScreen === "register-step1" && pendingRegistration) {
    const registration = pendingRegistration;
    const wp = workplaces.find((w) => w.id === registration.workplaceId);
    return (
      <WorkInfoInputView
        workplaceName={registration.workplaceName}
        prefillFromContract={wp?.contractAnalysis}
        onBack={() => {
          setPendingRegistration(null);
          setCurrentScreen("list");
          router.push("/(tabs)/work-record");
        }}
        onNext={(info) => {
          setWorkInfo(registration.workplaceId, info);
          setConfirmPayload({ info, isFromContract: false });
          setCurrentScreen("register-step2-confirm");
        }}
        onGoToContractUpload={() => {
          setSelectedWorkplaceId(registration.workplaceId);
          setPendingRegistration(null);
          setCurrentScreen("upload");
        }}
      />
    );
  }

  if (
    currentScreen === "register-step2-confirm" &&
    pendingRegistration &&
    confirmPayload
  ) {
    const registration = pendingRegistration;
    const wp = workplaces.find((w) => w.id === registration.workplaceId);
    return (
      <WorkInfoConfirmView
        workplaceName={registration.workplaceName}
        workInfo={confirmPayload.info}
        isFromContract={confirmPayload.isFromContract}
        contractAnalysis={wp?.contractAnalysis}
        onBack={() => {
          // 계약서 path → analysis로 / 입력 path → register-step1로
          setCurrentScreen(
            confirmPayload.isFromContract ? "analysis" : "register-step1",
          );
        }}
        onConfirm={(updated) => {
          // 확인 완료 — 인라인 편집된 최종 값을 store에 저장 후 BSSID 단계로.
          setWorkInfo(registration.workplaceId, updated);
          setConfirmPayload({ ...confirmPayload, info: updated });
          setCurrentScreen("bssid-register");
        }}
        onViewIssues={() => setCurrentScreen("analysis")}
      />
    );
  }

  if (currentScreen === "bssid-register" && pendingRegistration) {
    const registration = pendingRegistration;
    return (
      <BssidRegisterView
        workplaceName={registration.workplaceName}
        onBack={() => {
          setPendingRegistration(null);
          setCurrentScreen("list");
        }}
        onRegisterComplete={(bssid, ssid) => {
          // 4-B Step 3: API 성공 후 navigate (명세 정합).
          // 에러 매핑: 400/401/network/other 분기.
          if (!bssid) {
            Alert.alert("Wi-Fi 선택 필요", "Wi-Fi를 먼저 선택해주세요");
            return;
          }
          // 근무 정보(요일/시간/시급)도 함께 전송 — 직전 확인 화면에서 확정된 값.
          const workInfo = confirmPayload?.info;
          registerWorkplace({
            workplaceName: registration.workplaceName,
            bssid,
            ssid,
            workDays: workInfo?.workDays,
            workStartTime: workInfo?.workStartTime,
            workEndTime: workInfo?.workEndTime,
            startDay: workInfo?.startDay,
            hourlyWage: workInfo?.hourlyWage,
          })
            .then((res) => {
              // 성공: 로컬 store 반영 + completion 화면
              markRegistered(registration.workplaceId, bssid, ssid);
              setPartTimeJobId(registration.workplaceId, res.partTimeJobId);
              setPendingRegistration({ ...registration, bssid, ssid });
              setCurrentScreen("register-complete");
              // 4-C: 등록 성공 → AsyncStorage 캐시 삭제 (fire-and-forget)
              void clearContractPending(registration.workplaceName)
                .then(() => {
                  setPendingNames((prev) => {
                    const next = new Set(prev);
                    next.delete(registration.workplaceName);
                    return next;
                  });
                })
                .catch(() => {});
            })
            .catch((err) => {
              if (isAxiosError(err)) {
                const status = err.response?.status;
                if (status === 400) {
                  Alert.alert("Wi-Fi 선택 필요", "Wi-Fi를 먼저 선택해주세요");
                  return;
                }
                if (status === 401) {
                  Alert.alert(
                    "로그인 필요",
                    "로그인이 필요합니다",
                    [
                      {
                        text: "로그인 화면으로",
                        onPress: () => {
                          clearAuth();
                          router.replace("/login");
                        },
                      },
                    ],
                  );
                  return;
                }
                if (err.response === undefined) {
                  Alert.alert(
                    "연결 오류",
                    "인터넷 연결을 확인해주세요",
                  );
                  return;
                }
              }
              Alert.alert(
                "등록 실패",
                "등록에 실패했습니다. 다시 시도해주세요",
              );
            });
        }}
      />
    );
  }

  if (
    currentScreen === "register-complete" &&
    pendingRegistration?.bssid !== undefined &&
    pendingRegistration.ssid !== undefined
  ) {
    return (
      <BssidRegisterCompleteView
        workplaceName={pendingRegistration.workplaceName}
        ssid={pendingRegistration.ssid}
        bssid={pendingRegistration.bssid}
        onGoToDashboard={() => {
          setPendingRegistration(null);
          setCurrentScreen("list");
          router.push("/(tabs)/work-record");
        }}
        onGoHome={() => {
          setPendingRegistration(null);
          setCurrentScreen("list");
          router.push("/(tabs)");
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScreenHeader showLogo />
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#111827",
            marginBottom: 12,
          }}
        >
          관심업장
        </Text>

        {workplaces.length === 0 ? (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 24,
              alignItems: "center",
              borderWidth: 0.5,
              borderColor: "#E5E7EB",
            }}
          >
            <Star size={32} color="#D1D5DB" />
            <Text
              style={{
                fontSize: 14,
                color: "#6B7280",
                marginTop: 8,
                textAlign: "center",
              }}
            >
              등록된 관심업장이 없어요.{"\n"}홈에서 공고를 분석하고 별 아이콘을
              눌러 등록하세요.
            </Text>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              borderWidth: 0.5,
              borderColor: "#E5E7EB",
              overflow: "hidden",
            }}
          >
            {workplaces.map((wp, idx) => (
              <WorkplaceRow
                key={wp.id}
                workplace={wp}
                isLast={idx === workplaces.length - 1}
                isDeleting={deletingId === wp.id}
                hasContractPending={pendingNames.has(wp.name)}
                onRemove={() => handleDelete(wp)}
                onAction={(action) => {
                  setSelectedWorkplaceId(wp.id);
                  switch (action) {
                    case "open-gate":
                      // 초기 [업장 등록하기] → 계약서 게이트 (있으세요? 화면)
                      setPendingRegistration({
                        workplaceId: wp.id,
                        workplaceName: wp.name,
                      });
                      setCurrentScreen("contract-gate");
                      return;
                    case "upload-contract":
                      // 등록 후 계약서 추가 업로드
                      setCurrentScreen("upload");
                      return;
                    case "edit-contract":
                      // 이미 업로드된 계약서 수정/재업로드
                      setCurrentScreen("edit");
                      return;
                    case "register-bssid":
                      // 계약서만 업로드된 상태 — 근무 정보 확인 거쳐 BSSID 등록.
                      // WorkInfoInputView가 contract prefill을 그대로 보여주므로 register-step1로.
                      setPendingRegistration({
                        workplaceId: wp.id,
                        workplaceName: wp.name,
                      });
                      setCurrentScreen("register-step1");
                      return;
                    case "open-dashboard":
                      // 등록 완료 — 근무 대시보드 (work-record 탭)로 이동
                      router.push("/(tabs)/work-record");
                      return;
                  }
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

interface RowProps {
  workplace: FavoriteWorkplace;
  isLast: boolean;
  isDeleting: boolean;
  /** 분석 완료된 계약서가 AsyncStorage 캐시에 남아있는지 — 뱃지 표시용. */
  hasContractPending: boolean;
  onRemove: () => void;
  /** 카드 버튼이 요청하는 액션을 상위가 받아서 적절한 화면으로 라우팅. */
  onAction: (action: CardAction) => void;
}

function WorkplaceRow({
  workplace: wp,
  isLast,
  isDeleting,
  hasContractPending,
  onRemove,
  onAction,
}: RowProps): JSX.Element {
  const states = getCardButtonStates(wp);

  return (
    <View
      style={{
        padding: 16,
        borderBottomWidth: isLast ? 0 : 0.5,
        borderBottomColor: "#E5E7EB",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
            {wp.name}
          </Text>
          {hasContractPending ? (
            <View
              style={{
                marginLeft: 6,
                backgroundColor: "#DBEAFE",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
              }}
            >
              <Text
                style={{ fontSize: 9, color: "#1D4ED8", fontWeight: "700" }}
              >
                📄 계약서 분석 완료
              </Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={8}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Star size={18} color={colors.primary} fill={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <ActionButton
          state={states.primary}
          onPress={() => onAction(states.primary.action)}
          fullWidth={states.layout === "single"}
        />
        {states.layout === "dual" && states.secondary !== undefined ? (
          <ActionButton
            state={states.secondary}
            onPress={() => onAction(states.secondary!.action)}
          />
        ) : null}
      </View>
    </View>
  );
}

interface ActionButtonProps {
  state: CardButtonState;
  onPress: () => void;
  fullWidth?: boolean;
}

function ActionButton({
  state,
  onPress,
  fullWidth = false,
}: ActionButtonProps): JSX.Element {
  const style = BUTTON_STYLES[state.variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flex: fullWidth ? 1 : 1,
        paddingVertical: 10,
        backgroundColor: style.backgroundColor,
        borderRadius: 10,
        borderWidth: style.borderWidth,
        borderColor: style.borderColor,
        opacity: style.opacity,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 13,
          color: style.textColor,
          fontWeight: "600",
        }}
      >
        {state.label}
      </Text>
    </TouchableOpacity>
  );
}

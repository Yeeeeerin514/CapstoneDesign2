import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Star } from "lucide-react-native";
import { router } from "expo-router";
import { isAxiosError } from "axios";
import type { ContractAnalysisResult } from "@/entities/job-post";
import {
  useFavoriteWorkplaceStore,
  type FavoriteWorkplace,
} from "@/features/favorite-workplace";
import { ScreenHeader, colors } from "@/shared/ui";
import { deletePartTimeJob, registerWorkplace } from "@/entities/workplace";
import { ContractUploadView } from "./ContractUploadView";
import { ContractAnalysisView } from "./ContractAnalysisView";
import { ContractEditView } from "./ContractEditView";
import { BssidRegisterView } from "./BssidRegisterView";
import { BssidRegisterCompleteView } from "./BssidRegisterCompleteView";

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

type CardStage = "initial" | "contract-uploaded" | "registered";

interface CardButtonState {
  variant: ButtonVariant;
  label: string;
  isPressable: boolean;
}

interface CardButtonStates {
  stage: CardStage;
  contractButton: CardButtonState;
  registerButton: CardButtonState;
}

function getCardButtonStates(workplace: FavoriteWorkplace): CardButtonStates {
  const isContractUploaded =
    workplace.contractStatus === "uploaded" ||
    workplace.contractStatus === "analyzed";
  const isRegistered = workplace.registrationStatus === "registered";

  let stage: CardStage = "initial";
  if (isRegistered) {
    stage = "registered";
  } else if (isContractUploaded) {
    stage = "contract-uploaded";
  }

  const contractButton: CardButtonState =
    stage === "initial"
      ? { variant: "primary", label: "계약서 업로드", isPressable: true }
      : { variant: "outline", label: "계약서 수정", isPressable: true };

  let registerButton: CardButtonState;
  if (stage === "initial") {
    registerButton = {
      variant: "disabled",
      label: "업장 등록",
      isPressable: false,
    };
  } else if (stage === "contract-uploaded") {
    registerButton = {
      variant: "primary",
      label: "업장 등록",
      isPressable: true,
    };
  } else {
    registerButton = {
      variant: "success",
      label: "등록 완료 ✓",
      isPressable: false,
    };
  }

  return { stage, contractButton, registerButton };
}

type Screen =
  | "list"
  | "upload"
  | "analysis"
  | "edit"
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
  } = useFavoriteWorkplaceStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>("list");
  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<string | null>(
    null,
  );
  const [analysisResult, setAnalysisResult] =
    useState<ContractAnalysisResult | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [pendingRegistration, setPendingRegistration] =
    useState<PendingRegistration | null>(null);

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
    return (
      <ContractAnalysisView
        result={result}
        onBack={() => setCurrentScreen(fromEdit ? "edit" : "upload")}
        onRegister={() => {
          if (!fromEdit && pendingImageUri !== null) {
            markContractUploaded(
              selectedWorkplace.id,
              pendingImageUri,
              result,
            );
          }
          setPendingImageUri(null);
          setPendingRegistration({
            workplaceId: selectedWorkplace.id,
            workplaceName: selectedWorkplace.name,
          });
          setCurrentScreen("bssid-register");
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
          // 1) 로컬 store 즉시 반영
          markRegistered(registration.workplaceId, bssid, ssid);
          setPendingRegistration({ ...registration, bssid, ssid });
          setCurrentScreen("register-complete");

          // 2) 백엔드 part_time_job 자동 생성 + BSSID 영속 (실패해도 UX 끊김 X)
          registerWorkplace({
            workplaceName: registration.workplaceName,
            bssid,
            ssid,
          })
            .then((res) => {
              setPartTimeJobId(registration.workplaceId, res.partTimeJobId);
            })
            .catch(() => {
              // 네트워크 실패 시 로컬 store는 유지 (재진입 시 재시도 가능)
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
                onRemove={() => handleDelete(wp)}
                onUploadContract={() => {
                  setSelectedWorkplaceId(wp.id);
                  setCurrentScreen(
                    wp.contractStatus === "none" ? "upload" : "edit",
                  );
                }}
                onRegisterWorkplace={() => {
                  setPendingRegistration({
                    workplaceId: wp.id,
                    workplaceName: wp.name,
                  });
                  setCurrentScreen("bssid-register");
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
  onRemove: () => void;
  onUploadContract: () => void;
  onRegisterWorkplace: () => void;
}

function WorkplaceRow({
  workplace: wp,
  isLast,
  isDeleting,
  onRemove,
  onUploadContract,
  onRegisterWorkplace,
}: RowProps): JSX.Element {
  const { stage, contractButton, registerButton } = getCardButtonStates(wp);
  const contractStyle = BUTTON_STYLES[contractButton.variant];
  const registerStyle = BUTTON_STYLES[registerButton.variant];

  const handleRegisterPress = (): void => {
    if (registerButton.isPressable) {
      onRegisterWorkplace();
      return;
    }
    if (stage === "initial") {
      Alert.alert("안내", "먼저 계약서를 업로드하세요");
    }
  };

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
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
          {wp.name}
        </Text>
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
        <TouchableOpacity
          onPress={() => {
            if (contractButton.isPressable) onUploadContract();
          }}
          disabled={!contractButton.isPressable}
          activeOpacity={0.8}
          style={{
            flex: 1,
            paddingVertical: 10,
            backgroundColor: contractStyle.backgroundColor,
            borderRadius: 10,
            borderWidth: contractStyle.borderWidth,
            borderColor: contractStyle.borderColor,
            opacity: contractStyle.opacity,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: contractStyle.textColor,
              fontWeight: "600",
            }}
          >
            {contractButton.label}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleRegisterPress}
          disabled={!registerButton.isPressable && stage !== "initial"}
          activeOpacity={0.8}
          style={{
            flex: 1,
            paddingVertical: 10,
            backgroundColor: registerStyle.backgroundColor,
            borderRadius: 10,
            borderWidth: registerStyle.borderWidth,
            borderColor: registerStyle.borderColor,
            opacity: registerStyle.opacity,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: registerStyle.textColor,
              fontWeight: "600",
            }}
          >
            {registerButton.label}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

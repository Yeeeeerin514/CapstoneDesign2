import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, Alert } from "react-native";
import { Star } from "lucide-react-native";
import { router } from "expo-router";
import type { ContractAnalysisResult } from "@/entities/job-post";
import {
  useFavoriteWorkplaceStore,
  type FavoriteWorkplace,
} from "@/features/favorite-workplace";
import { ScreenHeader, colors } from "@/shared/ui";
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
  const isContractUploaded = workplace.contractStatus === "uploaded";
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
  const { workplaces, removeWorkplace, markContractUploaded, markRegistered } =
    useFavoriteWorkplaceStore();
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

  if (currentScreen === "upload" && selectedWorkplace) {
    return (
      <ContractUploadView
        workplaceId={selectedWorkplace.id}
        workplaceName={selectedWorkplace.name}
        onBack={() => setCurrentScreen("list")}
        onAnalysisComplete={(imageUri, result) => {
          setPendingImageUri(imageUri);
          setAnalysisResult(result);
          setCurrentScreen("analysis");
        }}
      />
    );
  }

  if (currentScreen === "analysis" && selectedWorkplace) {
    const fromEdit = selectedWorkplace.contractStatus === "uploaded";
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
          setCurrentScreen("list");
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
    return (
      <BssidRegisterView
        workplaceName={pendingRegistration.workplaceName}
        onBack={() => {
          setPendingRegistration(null);
          setCurrentScreen("list");
        }}
        onRegisterComplete={(bssid, ssid) => {
          markRegistered(pendingRegistration.workplaceId, bssid, ssid);
          setPendingRegistration({ ...pendingRegistration, bssid, ssid });
          setCurrentScreen("register-complete");
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
                onRemove={() =>
                  Alert.alert(
                    "관심업장 삭제",
                    `${wp.name}을(를) 삭제하시겠어요?`,
                    [
                      { text: "취소", style: "cancel" },
                      {
                        text: "삭제",
                        style: "destructive",
                        onPress: () => removeWorkplace(wp.id),
                      },
                    ],
                  )
                }
                onUploadContract={() => {
                  setSelectedWorkplaceId(wp.id);
                  setCurrentScreen(
                    wp.contractStatus === "uploaded" ? "edit" : "upload",
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
  onRemove: () => void;
  onUploadContract: () => void;
  onRegisterWorkplace: () => void;
}

function WorkplaceRow({
  workplace: wp,
  isLast,
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
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Star size={18} color={colors.primary} fill={colors.primary} />
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

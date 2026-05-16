import { useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  JobVerifyForm,
  registerWorkplaceFromResult,
  useJobVerify,
  useJobVerifyStore,
} from "@/features/job-verify";
import { JobAnalyzingProgress } from "./JobAnalyzingProgress";
import { JobVerifyResultView } from "./JobVerifyResultView";

/** 홈 화면 공고 검증 메인 위젯. form ↔ progress ↔ result 흐름을 조립. */
export function JobVerifyWidget() {
  const { imagePreviewUri, stage, result, error, setImage } =
    useJobVerifyStore();
  const { submit, pickFromCamera, pickFromLibrary, resetAll } = useJobVerify();
  const [isRegistering, setIsRegistering] = useState(false);

  const isAnalyzing =
    stage === "extracting" || stage === "comparing" || stage === "reviewing";

  async function handleRegister() {
    if (result === null) return;
    setIsRegistering(true);
    try {
      const created = await registerWorkplaceFromResult(result);
      Alert.alert("등록 완료", `${created.name}을(를) 관심업장에 추가했어요.`);
      resetAll();
    } catch (err) {
      Alert.alert(
        "등록 실패",
        err instanceof Error ? err.message : "잠시 후 다시 시도해주세요",
      );
    } finally {
      setIsRegistering(false);
    }
  }

  if (stage === "done" && result !== null) {
    return (
      <JobVerifyResultView
        result={result}
        isRegistering={isRegistering}
        onRegister={handleRegister}
        onRetry={resetAll}
      />
    );
  }

  if (isAnalyzing) {
    return <JobAnalyzingProgress stage={stage} />;
  }

  return (
    <View className="gap-2">
      <JobVerifyForm
        imagePreviewUri={imagePreviewUri}
        isAnalyzing={false}
        onSubmit={submit}
        onPickFromCamera={pickFromCamera}
        onPickFromLibrary={pickFromLibrary}
        onClearImage={() => setImage(null, null)}
      />
      {stage === "error" && error !== null && (
        <View className="bg-badge-danger rounded-xl p-3">
          <Text className="text-sm text-danger-dark">{error}</Text>
        </View>
      )}
    </View>
  );
}

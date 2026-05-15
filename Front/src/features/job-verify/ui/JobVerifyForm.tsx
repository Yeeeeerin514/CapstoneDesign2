import { View, Text } from "react-native";
import { Button, Input } from "@/shared/ui";

interface Props {
  jobUrl: string;
  isAnalyzing: boolean;
  onChangeUrl: (v: string) => void;
  onSubmit: () => void;
  onPickImage: () => void;
}

/** 1-1 화면 — 공고 URL 입력 또는 이미지 업로드. */
export function JobVerifyForm({
  jobUrl,
  isAnalyzing,
  onChangeUrl,
  onSubmit,
  onPickImage,
}: Props): JSX.Element {
  const canSubmit = jobUrl.length > 0 && !isAnalyzing;
  return (
    <View className="bg-card rounded-2xl border border-border p-4 gap-3">
      <Text className="text-base font-semibold text-text-primary">
        공고 검증
      </Text>
      <Input
        value={jobUrl}
        onChangeText={onChangeUrl}
        placeholder="알바몬/알바천국 공고 URL"
        keyboardType="url"
      />
      <Button
        label={isAnalyzing ? "분석 중..." : "분석시작"}
        onPress={onSubmit}
        disabled={!canSubmit}
        fullWidth
      />
      <Button
        label="대신 캡처 이미지 업로드"
        onPress={onPickImage}
        variant="secondary"
        fullWidth
      />
    </View>
  );
}

import { View, Text, Pressable } from "react-native";
import { Button } from "@/shared/ui";

interface Props {
  imageUri: string | null;
  isAnalyzing: boolean;
  onPickImage: () => void;
  onSubmit: () => void;
}

/** 2-1-2 화면 — 드래그/탭 업로드 + 분석 시작 버튼. */
export function ContractUploadForm({
  imageUri,
  isAnalyzing,
  onPickImage,
  onSubmit,
}: Props): JSX.Element {
  const canSubmit = imageUri !== null && !isAnalyzing;
  return (
    <View className="bg-card rounded-2xl border border-border p-4 gap-3">
      <Text className="text-base font-semibold text-text-primary">
        계약서 업로드
      </Text>
      <Text className="text-xs text-text-secondary">
        JPG · PNG · PDF · 최대 10MB. 개인정보는 분석 직후 삭제됩니다.
      </Text>
      <Pressable
        onPress={onPickImage}
        className="border-2 border-dashed border-border rounded-2xl py-8 items-center"
      >
        <Text className="text-text-secondary">
          {imageUri !== null ? "사진 선택됨 — 다시 선택" : "탭하여 사진/파일 선택"}
        </Text>
      </Pressable>
      <Button
        onPress={onSubmit}
        isDisabled={!canSubmit}
        isLoading={isAnalyzing}
        fullWidth
      >
        {isAnalyzing ? "분석 중..." : "AI로 분석하기"}
      </Button>
    </View>
  );
}

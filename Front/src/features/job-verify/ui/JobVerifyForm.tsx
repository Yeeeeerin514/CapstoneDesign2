import { View, Text, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/ui";

interface Props {
  imagePreviewUri: string | null;
  isAnalyzing: boolean;
  onSubmit: () => void;
  onPickFromCamera: () => void;
  onPickFromLibrary: () => void;
  onClearImage: () => void;
}

/** 1-1 화면 — 공고 캡쳐 이미지 업로드 전용. 중앙 dropzone 강조. */
export function JobVerifyForm({
  imagePreviewUri,
  isAnalyzing,
  onSubmit,
  onPickFromCamera,
  onPickFromLibrary,
  onClearImage,
}: Props) {
  const hasImage = imagePreviewUri !== null;
  const canSubmit = hasImage && !isAnalyzing;
  return (
    <View className="bg-card rounded-2xl border border-border p-4 gap-3">
      <Text className="text-base font-semibold text-text-primary">
        공고 검증
      </Text>

      {hasImage ? (
        <View className="gap-2">
          <Image
            source={{ uri: imagePreviewUri }}
            className="w-full h-56 rounded-2xl"
            resizeMode="cover"
          />
          <Pressable onPress={onClearImage} className="self-end">
            <Text className="text-xs text-danger">이미지 제거</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={onPickFromLibrary}
          disabled={isAnalyzing}
          className="border-2 border-dashed border-border rounded-2xl bg-surface py-10 px-6 items-center justify-center"
        >
          <Ionicons name="cloud-upload-outline" size={40} color="#94A3B8" />
          <Text className="mt-2 text-sm font-medium text-text-primary">
            공고 캡쳐 이미지를 업로드하세요
          </Text>
          <Text className="mt-1 text-xs text-text-disabled">
            JPG, PNG 지원 · 최대 10MB
          </Text>
        </Pressable>
      )}

      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            variant="secondary"
            onPress={onPickFromCamera}
            isDisabled={isAnalyzing}
            fullWidth
            children={"카메라"}
          />
        </View>
        <View className="flex-1">
          <Button
            variant="secondary"
            onPress={onPickFromLibrary}
            isDisabled={isAnalyzing}
            fullWidth
            children={"갤러리"}
          />
        </View>
      </View>

      <Button
        onPress={onSubmit}
        isDisabled={!canSubmit}
        isLoading={isAnalyzing}
        fullWidth
        children={isAnalyzing ? "분석 중..." : "분석시작"}
      />
    </View>
  );
}

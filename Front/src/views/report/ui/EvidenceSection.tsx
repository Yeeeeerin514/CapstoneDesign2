import { useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import type { ReportCase } from "@/entities/report";
import { useReportStore } from "@/features/report-submit";

interface EvidenceSectionProps {
  caseId: string;
  reportCase: ReportCase;
}

const MAX_LEN = 500;
const PREVIEW_LEN = 50;

/**
 * Step 1 (evidence_collection) 자연어 증거 입력 섹션.
 * STEP 17(4-E)에서 이미지 업로드 기반 → 자연어 텍스트 입력으로 교체됨.
 * 사용자가 자유롭게 작성한 텍스트는 ReportCase.evidenceTexts에 누적.
 * POST /api/reports description 필드로 `\n\n---\n\n` join 후 전송 (호출처에서 처리).
 */
export function EvidenceSection({
  caseId,
  reportCase,
}: EvidenceSectionProps): JSX.Element {
  const addEvidenceText = useReportStore((s) => s.addEvidenceText);
  const removeEvidenceText = useReportStore((s) => s.removeEvidenceText);
  const [inputText, setInputText] = useState<string>("");

  const handleAdd = (): void => {
    const trimmed = inputText.trim();
    if (trimmed === "") {
      Alert.alert("내용을 입력해주세요");
      return;
    }
    addEvidenceText(caseId, trimmed);
    setInputText("");
  };

  const handleRemove = (index: number): void => {
    Alert.alert("증거 삭제", "이 텍스트를 삭제하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => removeEvidenceText(caseId, index),
      },
    ]);
  };

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: "#0F172A",
          marginBottom: 6,
        }}
      >
        증거 내용 작성
      </Text>
      <View
        style={{
          backgroundColor: "#EBF3FF",
          borderRadius: 8,
          padding: 10,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 12, color: "#1A5FAF", lineHeight: 18 }}>
          💡 어떤 상황인지 자유롭게 적어주세요. 여러 건은 항목별로 추가할 수 있어요.
        </Text>
      </View>

      {/* 입력 영역 */}
      <View
        style={{
          borderWidth: 1,
          borderColor: "#E0E0DC",
          borderRadius: 10,
          padding: 12,
          marginBottom: 8,
          backgroundColor: "#FAFAF7",
        }}
      >
        <TextInput
          value={inputText}
          onChangeText={(v) => setInputText(v.slice(0, MAX_LEN))}
          multiline
          maxLength={MAX_LEN}
          placeholder={
            "예: 지난달 통장에 입금된 금액이 계약서 시급 × 근무시간보다 12만원 적었어요."
          }
          placeholderTextColor="#94A3B8"
          style={{
            fontSize: 14,
            color: "#0F172A",
            minHeight: 80,
            textAlignVertical: "top",
            padding: 0,
          }}
        />
        <Text
          style={{
            fontSize: 11,
            color: "#94A3B8",
            textAlign: "right",
            marginTop: 6,
          }}
        >
          {`${inputText.length} / ${MAX_LEN}자`}
        </Text>
      </View>
      <Pressable
        onPress={handleAdd}
        style={{
          backgroundColor: "#3182F6",
          borderRadius: 10,
          paddingVertical: 11,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
          + 추가하기
        </Text>
      </Pressable>

      {/* 추가된 텍스트 목록 */}
      {reportCase.evidenceTexts.length === 0 ? (
        <View
          style={{
            backgroundColor: "#F5F5F0",
            borderRadius: 10,
            padding: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 12, color: "#888888" }}>
            아직 작성된 증거가 없어요
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#475569",
              marginBottom: 2,
            }}
          >
            {`작성된 증거 ${reportCase.evidenceTexts.length}건`}
          </Text>
          {reportCase.evidenceTexts.map((text, idx) => (
            <EvidenceTextCard
              key={idx}
              text={text}
              onRemove={() => handleRemove(idx)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface EvidenceTextCardProps {
  text: string;
  onRemove: () => void;
}

function EvidenceTextCard({
  text,
  onRemove,
}: EvidenceTextCardProps): JSX.Element {
  const preview =
    text.length > PREVIEW_LEN ? `${text.slice(0, PREVIEW_LEN)}…` : text;
  return (
    <Animated.View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#EBF3FF",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 0.5,
        borderColor: "#B5D4F4",
      }}
    >
      <Text style={{ fontSize: 16 }}>💬</Text>
      <Text
        style={{
          flex: 1,
          fontSize: 13,
          color: "#0F172A",
          lineHeight: 18,
        }}
        numberOfLines={2}
      >
        {preview}
      </Text>
      <Pressable
        onPress={onRemove}
        hitSlop={6}
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: "#E24B4A",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>
          ✕
        </Text>
      </Pressable>
    </Animated.View>
  );
}

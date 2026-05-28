import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useActionSheet } from "@expo/react-native-action-sheet";
import {
  EVIDENCE_META,
  FILE_EVIDENCE_KEYS,
  type EvidenceFile,
  type EvidenceMeta,
  type FileEvidenceKey,
  type ReportCase,
} from "@/entities/report";
import { useReportStore } from "@/features/report-submit";
import { pickEvidenceFile } from "@/shared/lib/evidence-file-picker";

interface EvidenceSectionProps {
  caseId: string;
  reportCase: ReportCase;
  /** 어떤 종류를 강조할지. 외부에서 setState로 잠시 set, 이후 null로 클리어. */
  highlightedType?: FileEvidenceKey | null;
}

/**
 * Step 1 "자동 수집된 증거" 카드 — 실제 파일 첨부/삭제 기능 포함.
 * 각 행은 카운트만 보이는 collapsed 상태가 기본, 행 탭 시 썸네일 가로 스크롤 expand.
 * highlightedType가 일치하면 파란 테두리 + 3회 깜빡임 애니메이션으로 "👆 여기" 강조.
 */
export function EvidenceSection({
  caseId,
  reportCase,
  highlightedType,
}: EvidenceSectionProps): JSX.Element {
  const { showActionSheetWithOptions } = useActionSheet();
  const addEvidenceFiles = useReportStore((s) => s.addEvidenceFiles);
  const removeEvidenceFile = useReportStore((s) => s.removeEvidenceFile);
  const [expandedType, setExpandedType] = useState<FileEvidenceKey | null>(
    null,
  );

  const handleAdd = async (meta: EvidenceMeta): Promise<void> => {
    // userInput* 키는 파일 선택 대상이 아님 (FILE_EVIDENCE_KEYS에서 이미 제외됨)
    const fileKey = meta.key as FileEvidenceKey;
    const files = await pickEvidenceFile({
      evidenceType: fileKey,
      acceptTypes: meta.acceptTypes,
      showActionSheetWithOptions,
    });
    if (files === null || files.length === 0) return;
    addEvidenceFiles(caseId, files);
  };

  const handleRemove = (fileId: string): void => {
    Alert.alert("증거 삭제", "이 증거 파일을 삭제하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => removeEvidenceFile(caseId, fileId),
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
        자동 수집된 증거
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
          💡 근로계약서, 급여명세서, 통장 내역이 있으면 해결 속도가 빨라집니다
        </Text>
      </View>

      {FILE_EVIDENCE_KEYS.map((key) => {
        const meta = EVIDENCE_META[key];
        const count = reportCase.evidence[key] as number;
        const files = reportCase.evidenceFiles.filter(
          (f) => f.evidenceType === key,
        );
        const isHighlighted = highlightedType === key;
        const isExpanded = expandedType === key;
        return (
          <EvidenceRow
            key={key}
            meta={meta}
            count={count}
            files={files}
            isHighlighted={isHighlighted}
            isExpanded={isExpanded}
            onToggleExpand={() =>
              setExpandedType((prev) => (prev === key ? null : key))
            }
            onAdd={() => {
              void handleAdd(meta);
            }}
            onRemoveFile={handleRemove}
          />
        );
      })}
    </View>
  );
}

// ──────────────────────────────────────
// EvidenceRow — 1줄 카드 + 펼치면 파일 썸네일 가로 스크롤
// ──────────────────────────────────────

interface EvidenceRowProps {
  meta: EvidenceMeta;
  count: number;
  files: EvidenceFile[];
  isHighlighted: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAdd: () => void;
  onRemoveFile: (fileId: string) => void;
}

function EvidenceRow({
  meta,
  count,
  files,
  isHighlighted,
  isExpanded,
  onToggleExpand,
  onAdd,
  onRemoveFile,
}: EvidenceRowProps): JSX.Element {
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isHighlighted) {
      blinkAnim.setValue(1);
      return;
    }
    // 3회 깜빡임
    Animated.sequence([
      Animated.timing(blinkAnim, {
        toValue: 0.3,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(blinkAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(blinkAnim, {
        toValue: 0.3,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(blinkAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(blinkAnim, {
        toValue: 0.3,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(blinkAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isHighlighted, blinkAnim]);

  const importanceColor =
    meta.importance === "high"
      ? "#1A5FAF"
      : meta.importance === "medium"
        ? "#BA7517"
        : "#C5C4BE";

  return (
    <Animated.View
      style={{
        marginBottom: 6,
        borderRadius: 10,
        overflow: "hidden",
        borderWidth: isHighlighted ? 1.5 : 0,
        borderColor: isHighlighted ? "#1A5FAF" : "transparent",
        backgroundColor: isHighlighted ? "#EBF3FF" : "transparent",
        opacity: blinkAnim,
      }}
    >
      <Pressable
        onPress={count > 0 ? onToggleExpand : onAdd}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 10,
          paddingHorizontal: 8,
          gap: 10,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
            flex: 1,
          }}
        >
          <View
            style={{
              width: 3,
              borderRadius: 2,
              alignSelf: "stretch",
              minHeight: 28,
              backgroundColor: importanceColor,
            }}
          />
          <Text style={{ fontSize: 20, marginTop: 1 }}>{meta.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 14, fontWeight: "500", color: "#111111" }}
            >
              {meta.label}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: "#888888",
                marginTop: 2,
                lineHeight: 15,
              }}
            >
              {meta.description}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {count > 0 ? (
            <Text
              style={{ fontSize: 13, fontWeight: "600", color: "#1A5FAF" }}
            >
              {`${count}건`}
            </Text>
          ) : null}
          <Pressable
            onPress={onAdd}
            hitSlop={8}
            style={{
              backgroundColor: "#EBF3FF",
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderWidth: 0.5,
              borderColor: "#B5D4F4",
            }}
          >
            <Text
              style={{ fontSize: 12, color: "#185FA5", fontWeight: "600" }}
            >
              + 추가
            </Text>
          </Pressable>
        </View>
      </Pressable>

      {isHighlighted ? (
        <View
          style={{
            backgroundColor: "#1A5FAF",
            paddingVertical: 6,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>
            👆 여기에 추가해주세요!
          </Text>
        </View>
      ) : null}

      {isExpanded && files.length > 0 ? (
        <View
          style={{
            paddingTop: 10,
            paddingBottom: 12,
            paddingLeft: 4,
            borderTopWidth: 0.5,
            borderTopColor: "#E0E0DC",
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 16 }}
          >
            {files.map((file) => (
              <EvidenceFileThumb
                key={file.id}
                file={file}
                onRemove={() => onRemoveFile(file.id)}
              />
            ))}
            <Pressable
              onPress={onAdd}
              style={{
                width: 72,
                height: 72,
                borderRadius: 8,
                backgroundColor: "#F5F5F0",
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: "#C5C4BE",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 22, color: "#888888" }}>+</Text>
              <Text style={{ fontSize: 11, color: "#888888" }}>추가</Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}
    </Animated.View>
  );
}

// ──────────────────────────────────────
// 파일 1건 썸네일 (이미지면 사진, PDF/문서면 아이콘)
// ──────────────────────────────────────

interface EvidenceFileThumbProps {
  file: EvidenceFile;
  onRemove: () => void;
}

function EvidenceFileThumb({
  file,
  onRemove,
}: EvidenceFileThumbProps): JSX.Element {
  return (
    <View style={{ width: 72, alignItems: "center", gap: 4 }}>
      {file.fileType === "image" && file.thumbnail !== undefined ? (
        <Image
          source={{ uri: file.thumbnail }}
          style={{
            width: 72,
            height: 72,
            borderRadius: 8,
            backgroundColor: "#F0EFE8",
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 8,
            backgroundColor: "#F0EFE8",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 0.5,
            borderColor: "#E0E0DC",
          }}
        >
          <Text style={{ fontSize: 28 }}>
            {file.fileType === "pdf" ? "📄" : "📎"}
          </Text>
        </View>
      )}
      <Pressable
        onPress={onRemove}
        hitSlop={4}
        style={{
          position: "absolute",
          top: -4,
          right: -4,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: "#E24B4A",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>
          ✕
        </Text>
      </Pressable>
      <Text
        numberOfLines={1}
        style={{
          fontSize: 10,
          color: "#666666",
          textAlign: "center",
          width: 72,
        }}
      >
        {file.isAutoCollected ? "자동수집" : file.name.slice(0, 8)}
      </Text>
    </View>
  );
}

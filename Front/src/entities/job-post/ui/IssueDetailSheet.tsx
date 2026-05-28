import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import type { ContractIssue, ContractIssueLevel } from "../model/types";

interface IssueDetailSheetProps {
  issue: ContractIssue | null;
  totalCount: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

const LEVEL_BADGE: Record<
  ContractIssueLevel,
  { bg: string; color: string; label: string }
> = {
  danger: { bg: "#FCEBEB", color: "#A32D2D", label: "위험" },
  warning: { bg: "#FAEEDA", color: "#854F0B", label: "경고" },
  info: { bg: "#E6F1FB", color: "#0C447C", label: "정보" },
};

export function IssueDetailSheet({
  issue,
  totalCount,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: IssueDetailSheetProps): JSX.Element | null {
  if (issue === null) return null;

  const badge = LEVEL_BADGE[issue.level];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 28,
            maxHeight: "80%",
          }}
        >
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: "#E2E8F0",
                borderRadius: 2,
              }}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: badge.bg,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 6,
                marginBottom: 10,
              }}
            >
              <Text
                style={{ color: badge.color, fontSize: 12, fontWeight: "500" }}
              >
                {`${badge.label} · 이슈 ${issue.number} / ${totalCount}`}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 18,
                fontWeight: "500",
                color: "#0F172A",
                marginBottom: 6,
              }}
            >
              {issue.title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#475569",
                lineHeight: 22,
                marginBottom: 16,
              }}
            >
              {issue.description}
            </Text>

            <View
              style={{
                backgroundColor: "#F8FAFC",
                borderRadius: 10,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "500",
                  color: "#185FA5",
                  marginBottom: 6,
                }}
              >
                ⚖️ 관련 법령
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: "#0F172A",
                  marginBottom: 4,
                }}
              >
                {issue.legalBasis}
              </Text>
              {issue.legalBasisExcerpt !== null && (
                <Text style={{ fontSize: 13, color: "#475569", lineHeight: 20 }}>
                  {issue.legalBasisExcerpt}
                </Text>
              )}
            </View>

            <View
              style={{
                backgroundColor: "#F0FDF4",
                borderRadius: 10,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "500",
                  color: "#0F6E56",
                  marginBottom: 6,
                }}
              >
                💡 이렇게 바꾸세요
              </Text>
              <Text style={{ fontSize: 14, color: "#04342C", lineHeight: 22 }}>
                {issue.recommendation}
              </Text>
            </View>

            {issue.actionable != null ? (
              <Pressable
                style={{
                  backgroundColor: "#2563EB",
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  marginBottom: 12,
                }}
                onPress={() => {
                  // TODO: actionable.type에 따라 실제 동작 연결 (신고 화면 이동 등)
                }}
              >
                <Text
                  style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "500" }}
                >
                  {issue.actionable!.label}
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Pressable
              onPress={onPrev}
              disabled={!hasPrev}
              style={{
                flex: 1,
                backgroundColor: hasPrev ? "#F8FAFC" : "#F1F5F9",
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
                opacity: hasPrev ? 1 : 0.5,
              }}
            >
              <Text
                style={{ color: "#475569", fontSize: 14, fontWeight: "500" }}
              >
                ← 이전 이슈
              </Text>
            </Pressable>
            <Pressable
              onPress={onNext}
              disabled={!hasNext}
              style={{
                flex: 1,
                backgroundColor: hasNext ? "#2563EB" : "#94A3B8",
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
                opacity: hasNext ? 1 : 0.5,
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "500" }}
              >
                다음 이슈 →
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

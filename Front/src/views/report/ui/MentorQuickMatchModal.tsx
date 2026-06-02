import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMentorStore, useMentorMatchStore } from "@/features/mentor-match";
import { usePaymentStore } from "@/features/payment";
import { useReportStore } from "@/features/report-submit";
import { useAuthStore } from "@/entities/user/model/auth-store";
import type { ReportCase } from "@/entities/report";

interface MentorQuickMatchModalProps {
  visible: boolean;
  /** 매칭하려는 멘토의 userId. (mock-mentor entity와 매핑) */
  mentorUserId: string;
  /** 매칭 대상 후보 사건들 (진행 중인 사건만 전달받음). */
  activeCases: ReportCase[];
  onClose: () => void;
}

/**
 * 신고 탭에서 즉시 멘토 매칭 → 결제 흐름 모달.
 *
 * - activeCases가 1개면 자동 선택 후 결제 확인 단계로 진입
 * - activeCases가 여러 개면 라디오로 사건 선택 → 결제 확인
 * - 결제 성공 시 매칭 레코드 생성 + 1:1 채팅방 이동
 */
export function MentorQuickMatchModal({
  visible,
  mentorUserId,
  activeCases,
  onClose,
}: MentorQuickMatchModalProps): JSX.Element {
  const getMentorById = useMentorStore((s) => s.getMentorById);
  const chargeMentorFee = usePaymentStore((s) => s.chargeMentorFee);
  const isCharging = usePaymentStore((s) => s.isLoading);
  const createMatch = useMentorMatchStore((s) => s.createMatch);
  const setShouldSkipNextFocusReset = useReportStore(
    (s) => s.setShouldSkipNextFocusReset,
  );
  const menteeId = useAuthStore((s) => s.userIdString);

  const mentor = getMentorById(mentorUserId);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(
    activeCases[0]?.id ?? null,
  );

  const targetCase = activeCases.find((c) => c.id === selectedCaseId);

  const handleConfirm = async (): Promise<void> => {
    if (mentor === undefined || targetCase === undefined) return;
    const result = await chargeMentorFee({
      menteeId,
      mentorId: mentor.userId,
      caseId: targetCase.id,
    });
    if (!result.success) {
      // payment store가 isLoading false로 알아서 처리, alert만.
      return;
    }
    const match = createMatch({
      caseId: targetCase.id,
      menteeId,
      mentorId: mentor.userId,
      mentorNickname: mentor.nickname,
      mentorBadges: mentor.badges,
      mentorIndustry: mentor.industry,
    });
    // 다른 라우트로 이동 시 신고 탭 list 리셋 방지
    setShouldSkipNextFocusReset(true);
    onClose();
    router.push(`/mentor-chat/${match.id}`);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.55)",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            padding: 20,
          }}
        >
          {mentor === undefined ? (
            <>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#0F172A",
                  marginBottom: 8,
                }}
              >
                멘토 정보를 찾을 수 없어요
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#64748B",
                  marginBottom: 18,
                  lineHeight: 19,
                }}
              >
                후기 작성자가 아직 멘토로 등록되지 않았어요. 후기 상세에서 다시 확인해주세요.
              </Text>
              <Pressable
                onPress={onClose}
                style={{
                  backgroundColor: "#F1F5F9",
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#475569", fontSize: 14, fontWeight: "600" }}
                >
                  닫기
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <Ionicons name="person" size={16} color="#1B64DA" />
                <Text
                  style={{ fontSize: 12, fontWeight: "700", color: "#1B64DA" }}
                >
                  멘토 매칭 결제
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#0F172A",
                  marginBottom: 4,
                }}
              >
                {`${mentor.nickname} 멘토와 1:1 매칭`}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "#64748B",
                  marginBottom: 16,
                  lineHeight: 17,
                }}
                numberOfLines={2}
              >
                {mentor.bio}
              </Text>

              {/* 사건 선택 — 1개면 자동, 여러 개면 라디오 */}
              {activeCases.length > 1 ? (
                <>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#475569",
                      marginBottom: 6,
                    }}
                  >
                    어떤 사건에 연결할까요?
                  </Text>
                  <View style={{ gap: 6, marginBottom: 14 }}>
                    {activeCases.map((c) => {
                      const active = c.id === selectedCaseId;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => setSelectedCaseId(c.id)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderRadius: 8,
                            backgroundColor: active ? "#EBF3FF" : "#F8FAFC",
                            borderWidth: 1,
                            borderColor: active ? "#3182F6" : "#E2E8F0",
                          }}
                        >
                          <View
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              borderWidth: 1.5,
                              borderColor: active ? "#3182F6" : "#CBD5E1",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {active ? (
                              <View
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 4,
                                  backgroundColor: "#3182F6",
                                }}
                              />
                            ) : null}
                          </View>
                          <Text
                            style={{
                              fontSize: 13,
                              color: "#0F172A",
                              fontWeight: active ? "600" : "500",
                              flex: 1,
                            }}
                          >
                            {c.workplaceName}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : targetCase !== undefined ? (
                <View
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Ionicons name="briefcase" size={14} color="#475569" />
                  <Text style={{ fontSize: 12, color: "#475569" }}>연결할 사건</Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#0F172A",
                      marginLeft: 4,
                    }}
                  >
                    {targetCase.workplaceName}
                  </Text>
                </View>
              ) : null}

              {/* 결제 정보 */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: "#F1F5F9",
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 13, color: "#475569" }}>결제 금액</Text>
                <Text
                  style={{ fontSize: 16, fontWeight: "700", color: "#DC2626" }}
                >
                  {`₩${mentor.consultingFee.toLocaleString()}`}
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 11,
                  color: "#94A3B8",
                  marginBottom: 14,
                  lineHeight: 16,
                }}
              >
                결제 후 멘토 채팅방으로 이동합니다. 사건이 해결되면 일부 금액이 환급돼요.
              </Text>

              {/* 액션 버튼 */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={onClose}
                  disabled={isCharging}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor: "#F1F5F9",
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                  }}
                >
                  <Text
                    style={{ color: "#475569", fontSize: 14, fontWeight: "600" }}
                  >
                    취소
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleConfirm()}
                  disabled={isCharging || targetCase === undefined}
                  style={{
                    flex: 2,
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor: isCharging ? "#94A3B8" : "#3182F6",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {isCharging ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : null}
                  <Text
                    style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}
                  >
                    {isCharging ? "결제 중..." : "결제하고 매칭"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

import { router, useLocalSearchParams } from "expo-router";
import { MentorChatView } from "@/views/report/ui/MentorChatView";

/**
 * 멘토 채팅 진입 라우트. 진입점이 여러 곳(사건 상세 / MY 탭 / 결제 직후)이라 top-level 라우트로 분리.
 * `/mentor-chat/<matchId>`로 push.
 */
export default function MentorChatRoute(): JSX.Element {
  const params = useLocalSearchParams<{ matchId: string }>();
  const matchId = typeof params.matchId === "string" ? params.matchId : "";
  return <MentorChatView matchId={matchId} onBack={() => router.back()} />;
}

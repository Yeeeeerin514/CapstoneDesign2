import { router, useLocalSearchParams } from "expo-router";
import { BackendChatView } from "@/views/report/ui/BackendChatView";

/**
 * 멘토 인박스 채팅 진입 라우트 — `/mentor-inbox/<backendMatchId>?title=&subtitle=`.
 * 멘티 측 `/mentor-chat/<localMatchId>`(로컬 store 기반)와 달리, 여기서 matchId는
 * 백엔드 mentorship_match.id 이고 BackendChatView가 순수 백엔드 폴링으로 동작한다.
 */
export default function MentorInboxChatRoute(): JSX.Element {
  const params = useLocalSearchParams<{
    matchId: string;
    title?: string;
    subtitle?: string;
  }>();
  const backendMatchId =
    typeof params.matchId === "string" ? Number(params.matchId) : NaN;
  const title =
    typeof params.title === "string" && params.title.length > 0
      ? params.title
      : "익명 멘티";
  const subtitle =
    typeof params.subtitle === "string" && params.subtitle.length > 0
      ? params.subtitle
      : undefined;

  return (
    <BackendChatView
      backendMatchId={backendMatchId}
      title={title}
      subtitle={subtitle}
      onBack={() => router.back()}
    />
  );
}

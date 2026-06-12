import { Pressable, Text, View } from "react-native";
import type { ResolveReview } from "@/entities/review";

interface ResolveReviewCardProps {
  review: ResolveReview;
  /** "해결 후기 보기" 버튼 클릭 → 해당 후기 상세로 이동. */
  onPressDetail: () => void;
}

/**
 * 임금체불 해결 후기 카드 — HomeView/ReportListView/ReportEmptyView 공용.
 * 카드 외관 + 내부 "해결 후기 보기" CTA. 카드 외곽 클릭 동작은 호출자가 자유롭게 wrap.
 */
export function ResolveReviewCard({
  review: r,
  onPressDetail,
}: ResolveReviewCardProps): JSX.Element {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 0.5,
        borderColor: "#E2E8F0",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 10,
        }}
      >
        <Text style={{ fontSize: 12, color: "#475569" }}>
          {`${r.industry} · 알바`}
        </Text>
        <View
          style={{
            backgroundColor: "#FEE2E2",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
          }}
        >
          <Text
            style={{ fontSize: 11, color: "#B91C1C", fontWeight: "700" }}
          >
            {r.damageTypes.length > 1
              ? `${r.damageTypes[0]} 외 ${r.damageTypes.length - 1}건`
              : (r.damageTypes[0] ?? "")}
          </Text>
        </View>
      </View>
      <Text
        style={{
          fontSize: 12,
          color: "#475569",
          marginBottom: 2,
        }}
      >
        돌려받은 금액
      </Text>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "700",
          color: "#16A34A",
          marginBottom: 8,
        }}
      >
        {`${r.unpaidAmountRange} 회수`}
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: "#64748B",
          lineHeight: 18,
          marginBottom: 12,
        }}
      >
        {`피해액 ${r.unpaidAmountRange} 전액 · ${r.resolutionMethod} · ${r.resolveDays}일 만에 해결`}
      </Text>
      <Pressable
        onPress={onPressDetail}
        style={{
          backgroundColor: "#3182F6",
          paddingVertical: 11,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text
          style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}
        >
          해결 후기 보기
        </Text>
      </Pressable>
    </View>
  );
}

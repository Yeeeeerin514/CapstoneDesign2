import { Text } from "react-native";
import type {
  ContractIssue,
  ContractIssueLevel,
  ContractTextSegment,
} from "../model/types";

interface HighlightedContractTextProps {
  segments: ContractTextSegment[];
  issues: ContractIssue[];
  onIssuePress: (issueId: string) => void;
}

const HIGHLIGHT_COLORS: Record<
  ContractIssueLevel,
  { bg: string; border: string; numberColor: string }
> = {
  danger: { bg: "#FCEBEB", border: "#E24B4A", numberColor: "#A32D2D" },
  warning: { bg: "#FAEEDA", border: "#BA7517", numberColor: "#854F0B" },
  info: { bg: "#E6F1FB", border: "#185FA5", numberColor: "#0C447C" },
};

export function HighlightedContractText({
  segments,
  issues,
  onIssuePress,
}: HighlightedContractTextProps): JSX.Element {
  const issueMap = new Map(issues.map((i) => [i.id, i]));

  return (
    <Text style={{ fontSize: 14, lineHeight: 24, color: "#0F172A" }}>
      {segments.map((segment, idx) => {
        if (segment.issueId === undefined) {
          return <Text key={idx}>{segment.text}</Text>;
        }
        const issue = issueMap.get(segment.issueId);
        if (issue === undefined) {
          return <Text key={idx}>{segment.text}</Text>;
        }
        const color = HIGHLIGHT_COLORS[issue.level];
        return (
          <Text
            key={idx}
            onPress={() => onIssuePress(issue.id)}
            style={{
              backgroundColor: color.bg,
              borderBottomWidth: 2,
              borderBottomColor: color.border,
              color: "#0F172A",
              fontWeight: "500",
            }}
          >
            {segment.text}
            <Text
              style={{
                fontSize: 10,
                color: color.numberColor,
                fontWeight: "700",
              }}
            >
              {` ${issue.number}`}
            </Text>
          </Text>
        );
      })}
    </Text>
  );
}

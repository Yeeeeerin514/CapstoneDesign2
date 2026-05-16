import { useCallback } from "react";
import { uid } from "@/shared/lib/utils";
import type { IssueSeverity } from "@/entities/contract";
import { verifyJobByImage } from "../api/verify-job";
import { useJobVerifyStore } from "../model/store";
import type { JobIssue, JobVerifyResult, RecentAnalysis } from "../model/types";
import {
  pickImageFromCamera,
  pickImageFromLibrary,
} from "./image-picker";

const SEVERITY_RANK: Record<IssueSeverity, number> = {
  danger: 3,
  caution: 2,
  info: 1,
};

function topSeverityOf(issues: JobIssue[]): IssueSeverity | null {
  if (issues.length === 0) return null;
  return issues.reduce<IssueSeverity>((acc, cur) => {
    return SEVERITY_RANK[cur.severity] > SEVERITY_RANK[acc] ? cur.severity : acc;
  }, issues[0].severity);
}

function toRecent(result: JobVerifyResult): RecentAnalysis {
  return {
    id: uid(),
    analyzedAt: new Date().toISOString(),
    workplaceName: result.workplaceName,
    issueCount: result.issues.length,
    topSeverity: topSeverityOf(result.issues),
  };
}

interface UseJobVerify {
  submit: () => Promise<void>;
  pickFromCamera: () => Promise<void>;
  pickFromLibrary: () => Promise<void>;
  resetAll: () => void;
}

/** JobVerifyWidget이 사용하는 오케스트레이터. store에 묶여 있어 컴포넌트는 그대로 표현만 담당. */
export function useJobVerify(): UseJobVerify {
  const s = useJobVerifyStore();

  const submit = useCallback(async () => {
    s.setError(null);
    s.setResult(null);
    try {
      s.setStage("extracting");
      const hasImage = s.imageBase64 !== null && s.imageBase64.length > 0;
      if (!hasImage) {
        s.setStage("error");
        s.setError("공고 캡쳐 이미지를 업로드해주세요");
        return;
      }
      s.setStage("comparing");
      const result = await verifyJobByImage(s.imageBase64 as string);
      s.setStage("reviewing");
      s.setResult(result);
      s.pushRecent(toRecent(result));
      s.setStage("done");
    } catch (err) {
      s.setStage("error");
      s.setError(err instanceof Error ? err.message : "분석에 실패했어요");
    }
  }, [s]);

  const pickFromCamera = useCallback(async () => {
    const picked = await pickImageFromCamera();
    if (picked === null) return;
    s.setImage(picked.base64, picked.uri);
  }, [s]);

  const pickFromLibrary = useCallback(async () => {
    const picked = await pickImageFromLibrary();
    if (picked === null) return;
    s.setImage(picked.base64, picked.uri);
  }, [s]);

  const resetAll = useCallback(() => {
    s.reset();
  }, [s]);

  return { submit, pickFromCamera, pickFromLibrary, resetAll };
}

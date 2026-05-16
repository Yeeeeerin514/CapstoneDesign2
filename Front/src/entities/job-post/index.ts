// entities/job-post Public API
export type {
  JobPostAnalysisResult,
  JobPostIssue,
  FavoriteWorkplace,
  ContractAnalysisResult,
  ContractIssue,
} from "./model/types";
export {
  MOCK_JOB_ANALYSIS,
  MOCK_CONTRACT_ANALYSIS,
  MOCK_FAVORITE_WORKPLACES,
} from "./model/mock-data";
export { analyzeJobPost, analyzeContract } from "./api/analyze-job-post";

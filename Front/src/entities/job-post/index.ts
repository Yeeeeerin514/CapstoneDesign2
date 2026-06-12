// entities/job-post Public API
export type {
  JobPostAnalysisResult,
  JobPostIssue,
  ExternalCheck,
  BusinessCandidate,
  ExtractedPosting,
  FavoriteWorkplace,
  ContractAnalysisResult,
  ContractIssue,
  ContractIssueLevel,
  ContractTextSegment,
  ExtractedContract,
  RelatedCase,
  ApiContractAnalysisResponse,
  ApiJobPostingAnalysisResponse,
} from "./model/types";
export { mapJobPostingApiResponse } from "./model/types";
export { mapApiResponseToContractResult, mapContractApiResponse } from "./model/types";
export {
  MOCK_JOB_ANALYSIS,
  MOCK_CONTRACT_ANALYSIS,
  MOCK_FAVORITE_WORKPLACES,
} from "./model/mock-data";
export {
  analyzeJobPost,
  analyzeContract,
  fetchJobPostingAnalysis,
} from "./api/analyze-job-post";
export {
  fetchContractDetail,
  fetchContractFactSheet,
  fetchLatestContractByPartTimeJob,
} from "./api/contracts-api";
export type {
  ContractAnalysisResponse,
  ContractFactSheet,
} from "./api/contracts-api";
export { HighlightedContractText } from "./ui/HighlightedContractText";
export { IssueDetailSheet } from "./ui/IssueDetailSheet";
export {
  saveContractPending,
  loadContractPending,
  clearContractPending,
  listPendingBusinessNames,
  cleanExpiredContractPending,
} from "./lib/contract-pending-cache";
export type { ContractPendingEntry } from "./lib/contract-pending-cache";

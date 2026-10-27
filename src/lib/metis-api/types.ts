/*
 * Types for every schema in components.schemas of "Metis.Api.Presentation v1", with the same names.
 *
 * Conventions applied:
 * - The spec's ["integer","string"] / ["number","string"] unions are a .NET serializer artifact and map to `number`.
 * - `date-time` maps to an ISO-8601 string.
 * - Fields the spec lists as required but nullable (the .NET nullable-reference-type artifact) are typed `T | null`.
 * - Enums the spec only describes in prose use the literal unions from ./constants.
 */

import type {
  AssignmentAvailability,
  AssignmentStatus,
  AssessmentStatus,
  GradingStatus,
  ItemType,
  RosterSubmissionStatus,
  SubmissionStatus,
  WorkspaceStatus,
} from './constants';

export interface AccessKeyResponse {
  accessKey: string;
}

export interface AccessTokenResponse {
  tokenType?: string | null;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

export interface AiStatusResponse {
  isAiAvailable: boolean;
}

export interface AnswerRequest {
  selectedKey: string | null;
  selectedKeys: string[] | null;
  value: boolean | null;
  text: string | null;
}

export interface AnswerResponse {
  selectedKey: string | null;
  selectedKeys: string[] | null;
  value: boolean | null;
  text: string | null;
}

export interface AssessmentDraftItemResponse {
  type: ItemType;
  prompt: string;
  points: number;
  options: ChoiceOptionRequest[] | null;
  isTrue: boolean | null;
  minWords: number | null;
  maxWords: number | null;
  teacherNotes: string | null;
  assistantEnabled: boolean;
  studentHint: string | null;
}

export interface AssessmentDraftResponse {
  title: string;
  instructions: string | null;
  items: AssessmentDraftItemResponse[];
  notices: string[];
  aiGenerated: boolean;
}

export interface AssessmentItemRequest {
  type: ItemType | null;
  prompt: string | null;
  points: number | null;
  options: ChoiceOptionRequest[] | null;
  isTrue: boolean | null;
  minWords: number | null;
  maxWords: number | null;
  teacherNotes: string | null;
  assistantEnabled: boolean | null;
  studentHint: string | null;
}

export interface AssessmentItemResponse {
  id: string;
  position: number;
  type: ItemType;
  prompt: string;
  points: number;
  options: ChoiceOptionResponse[] | null;
  isTrue: boolean | null;
  minWords: number | null;
  maxWords: number | null;
  teacherNotes: string | null;
  assistantEnabled: boolean;
  studentHint: string | null;
}

export interface AssessmentResponse {
  id: string;
  title: string;
  instructions: string | null;
  status: AssessmentStatus;
  generatedWithAi: boolean;
  itemCount: number;
  totalPoints: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: AssessmentItemResponse[];
}

export interface AssessmentSummaryResponse {
  id: string;
  title: string;
  status: AssessmentStatus;
  itemCount: number;
  totalPoints: number;
  generatedWithAi: boolean;
  updatedAt: string;
  publishedAt: string | null;
}

export interface AssignmentResponse {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  workspaceId: string;
  workspaceName: string;
  shareToken: string;
  status: AssignmentStatus;
  availability: AssignmentAvailability;
  opensAt: string;
  dueAt: string | null;
  durationMinutes: number;
  assistantEnabled: boolean;
  maxHelpLevel: number;
  assistantInstructions: string | null;
  resultsVisible: boolean;
  createdAt: string;
  submissionCount: number;
}

export interface AssignmentSummaryResponse {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  workspaceId: string;
  workspaceName: string;
  availability: AssignmentAvailability;
  opensAt: string;
  dueAt: string | null;
  durationMinutes: number;
  resultsVisible: boolean;
  createdAt: string;
}

export interface ChoiceOptionRequest {
  text: string | null;
  isCorrect: boolean;
}

export interface ChoiceOptionResponse {
  key: string;
  text: string;
  isCorrect: boolean;
}

export interface CreateAssessmentRequest {
  title: string | null;
  instructions: string | null;
  generatedWithAi: boolean | null;
  items: AssessmentItemRequest[] | null;
}

export interface CreateAssignmentRequest {
  assessmentId: string | null;
  workspaceId: string | null;
  opensAt: string | null;
  dueAt: string | null;
  durationMinutes: number | null;
  assistantEnabled: boolean | null;
  maxHelpLevel: number | null;
  assistantInstructions: string | null;
  resultsVisible: boolean | null;
}

export interface CreateOrganizationRequest {
  name: string;
}

export interface CreateStudentRequest {
  name: string;
  email: string;
}

export interface CreateStudentsBulkRequest {
  students: CreateStudentRequest[] | null;
}

export interface CreateStudentsBulkResponse {
  added: StudentResponse[];
  alreadyEnrolled: string[];
}

export interface CreateWorkspaceRequest {
  name: string;
}

export interface CurrentUserResponse {
  id: string;
  name: string;
  email: string;
}

export interface HttpValidationProblemDetails {
  type?: string | null;
  title?: string | null;
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
  errors?: Record<string, string[]>;
}

export interface ItemResultResponse {
  score: number | null;
  gradingStatus: GradingStatus;
  feedback: string | null;
  gradedAt: string | null;
}

export interface JoinCodeResponse {
  joinCode: string;
}

export interface JoinInfoResponse {
  workspaceName: string;
  teacherName: string;
}

export interface JoinRequest {
  joinCode: string;
  name: string;
  email: string;
}

export interface JoinResponse {
  workspaceName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
}

export interface ProblemDetails {
  type?: string | null;
  title?: string | null;
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
}

export interface PublicAssignmentResponse {
  assessmentTitle: string;
  instructions: string | null;
  workspaceName: string;
  teacherName: string;
  itemCount: number;
  durationMinutes: number;
  opensAt: string;
  dueAt: string | null;
  availability: AssignmentAvailability;
  metisAvailable: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface ReopenAssignmentRequest {
  dueAt: string | null;
}

export interface ReorderItemsRequest {
  itemIds: string[] | null;
}

export interface ResponseChangeRequest {
  itemId: string | null;
  response: AnswerRequest | null;
}

export interface ResponseEntryResponse {
  itemId: string;
  response: AnswerResponse | null;
  updatedAt: string | null;
}

export interface ResultsVisibilityRequest {
  visible: boolean | null;
}

export interface ReviewItemRequest {
  score: number | null;
  feedback: string | null;
}

export interface SaveResponsesRequest {
  responses: ResponseChangeRequest[] | null;
}

export interface SaveResponsesResponse {
  status: SubmissionStatus;
  deadline: string;
  serverNow: string;
  responses: ResponseEntryResponse[];
}

export interface ShareTokenResponse {
  shareToken: string;
}

export interface StartSubmissionRequest {
  email: string | null;
}

export interface StudentAssessmentResponse {
  id: string;
  title: string;
  instructions: string | null;
  itemCount: number;
  totalPoints: number;
  items: StudentItemResponse[];
}

export interface StudentChoiceOptionResponse {
  key: string;
  text: string;
}

export interface StudentItemResponse {
  id: string;
  position: number;
  type: ItemType;
  prompt: string;
  points: number;
  options: StudentChoiceOptionResponse[] | null;
  minWords: number | null;
  maxWords: number | null;
}

export interface StudentResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface StudentResultDetailResponse {
  score: number;
  maxScore: number;
  percentage: number;
  isProvisional: boolean;
  items: StudentResultItemResponse[];
}

export interface StudentResultItemResponse {
  itemId: string;
  position: number;
  type: ItemType;
  prompt: string;
  points: number;
  options: StudentChoiceOptionResponse[] | null;
  minWords: number | null;
  maxWords: number | null;
  response: AnswerResponse | null;
  score: number | null;
  gradingStatus: GradingStatus | null;
  feedback: string | null;
}

export interface StudentResultResponse {
  status: SubmissionStatus;
  submittedAt: string | null;
  resultsVisible: boolean;
  result: StudentResultDetailResponse | null;
}

export interface StudentSubmissionResponse {
  status: SubmissionStatus;
  assessmentTitle: string;
  instructions: string | null;
  items: SubmissionItemResponse[];
  responses: ResponseEntryResponse[];
  startedAt: string;
  deadline: string;
  serverNow: string;
  submittedAt: string | null;
}

export interface SubmissionDetailItemResponse {
  item: AssessmentItemResponse;
  response: AnswerResponse | null;
  result: ItemResultResponse | null;
}

export interface SubmissionDetailResponse {
  id: string;
  assignmentId: string;
  assessmentTitle: string;
  student: SubmissionStudentResponse;
  status: SubmissionStatus;
  startedAt: string;
  submittedAt: string | null;
  deadline: string;
  score: number | null;
  isScoreProvisional: boolean;
  maxScore: number | null;
  gradedAt: string | null;
  pendingReviewCount: number;
  resumeAllowed: boolean;
  items: SubmissionDetailItemResponse[];
}

export interface SubmissionItemResponse {
  id: string;
  position: number;
  type: ItemType;
  prompt: string;
  points: number;
  options: StudentChoiceOptionResponse[] | null;
  minWords: number | null;
  maxWords: number | null;
  metisAvailable: boolean;
}

export interface SubmissionRosterResponse {
  studentId: string;
  studentName: string;
  studentEmail: string;
  submissionId: string | null;
  status: RosterSubmissionStatus;
  score: number | null;
  isScoreProvisional: boolean | null;
  maxScore: number | null;
  startedAt: string | null;
  submittedAt: string | null;
  deadline: string | null;
  pendingReviewCount: number;
  resumeAllowed: boolean;
}

export interface SubmissionStudentResponse {
  id: string;
  name: string;
  email: string;
}

export interface SubmitResponse {
  status: SubmissionStatus;
  submittedAt: string | null;
}

export interface UpdateAssessmentRequest {
  title: string | null;
  instructions: string | null;
}

export interface UpdateAssignmentRequest {
  opensAt: string | null;
  dueAt: string | null;
  durationMinutes: number | null;
  assistantEnabled: boolean | null;
  maxHelpLevel: number | null;
  assistantInstructions: string | null;
}

export interface UpdateOrganizationRequest {
  name: string;
}

export interface UpdateStudentRequest {
  name: string;
  email: string;
}

export interface UpdateWorkspaceRequest {
  name: string;
}

export interface WorkspaceResponse {
  id: string;
  name: string;
  joinCode: string;
  status: WorkspaceStatus;
  studentCount: number;
  createdAt: string;
}

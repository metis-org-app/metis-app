import type {
  AccessKeyResponse,
  AccessTokenResponse,
  AiStatusResponse,
  AssessmentDraftResponse,
  AssessmentItemRequest,
  AssessmentItemResponse,
  AssessmentResponse,
  AssessmentSummaryResponse,
  AssignmentResponse,
  AssignmentSummaryResponse,
  CreateAssessmentRequest,
  CreateAssignmentRequest,
  CreateOrganizationRequest,
  CreateStudentRequest,
  CreateStudentsBulkRequest,
  CreateStudentsBulkResponse,
  CreateWorkspaceRequest,
  CurrentUserResponse,
  JoinCodeResponse,
  JoinInfoResponse,
  JoinRequest,
  JoinResponse,
  LoginRequest,
  OrganizationResponse,
  PublicAssignmentResponse,
  RegisterRequest,
  ReopenAssignmentRequest,
  ReorderItemsRequest,
  ResultsVisibilityRequest,
  ReviewItemRequest,
  SaveResponsesRequest,
  SaveResponsesResponse,
  ShareTokenResponse,
  StartSubmissionRequest,
  StudentAssessmentResponse,
  StudentResponse,
  StudentResultResponse,
  StudentSubmissionResponse,
  SubmissionDetailResponse,
  SubmissionRosterResponse,
  SubmitResponse,
  UpdateAssessmentRequest,
  UpdateAssignmentRequest,
  UpdateOrganizationRequest,
  UpdateStudentRequest,
  UpdateWorkspaceRequest,
  WorkspaceResponse,
} from './types';
import type {
  AiDifficulty,
  AssessmentStatus,
  AssignmentAvailability,
  ItemType,
  WorkspaceStatus,
} from './constants';

/** Query filters of GetWorkspaces (an invalid `status` fails with HttpValidationProblemDetails). */
export type GetWorkspacesQuery = {
  status?: WorkspaceStatus;
};

/** Query filters of GetAssessments (an invalid `status` fails with HttpValidationProblemDetails). */
export type GetAssessmentsQuery = {
  status?: AssessmentStatus;
};

/** Query filters of GetAssignments (an invalid `availability` fails with HttpValidationProblemDetails). */
export type GetAssignmentsQuery = {
  workspaceId?: string;
  assessmentId?: string;
  availability?: AssignmentAvailability;
};

/**
 * The multipart body of GenerateAssessmentDraft. The spec documents no requestBody for that operation;
 * this mirrors what the app uploads (see src/features/assessments/generator/values.ts).
 */
export type GenerateAssessmentDraftInput = {
  topic: string;
  level?: string;
  itemCount?: number;
  difficulty?: AiDifficulty;
  allowedTypes?: ItemType[];
  instructions?: string;
  sourceText?: string;
  files?: readonly File[];
};

/**
 * The typed metis-api surface: one method per operation of "Metis.Api.Presentation v1", named after its
 * operationId in camelCase. Callers depend on this interface only; createMetisApi() picks the implementation.
 * Failures are thrown as MetisApiError, carrying the status and the Problem Details body of the real API.
 */
export interface IMetisApi {
  // Auth
  register(body: RegisterRequest): Promise<AccessTokenResponse>;
  login(body: LoginRequest): Promise<AccessTokenResponse>;
  getCurrentUser(): Promise<CurrentUserResponse>;

  // Organizations
  getOrganizations(): Promise<OrganizationResponse[]>;
  createOrganization(body: CreateOrganizationRequest): Promise<OrganizationResponse>;
  getOrganizationById(id: string): Promise<OrganizationResponse>;
  updateOrganization(id: string, body: UpdateOrganizationRequest): Promise<OrganizationResponse>;
  deleteOrganization(id: string): Promise<void>;

  // Workspaces
  getWorkspaces(query?: GetWorkspacesQuery): Promise<WorkspaceResponse[]>;
  createWorkspace(body: CreateWorkspaceRequest): Promise<WorkspaceResponse>;
  getWorkspaceById(id: string): Promise<WorkspaceResponse>;
  updateWorkspace(id: string, body: UpdateWorkspaceRequest): Promise<WorkspaceResponse>;
  deleteWorkspace(id: string): Promise<void>;
  archiveWorkspace(id: string): Promise<WorkspaceResponse>;
  restoreWorkspace(id: string): Promise<WorkspaceResponse>;
  regenerateWorkspaceJoinCode(id: string): Promise<JoinCodeResponse>;

  // Students
  getStudents(id: string): Promise<StudentResponse[]>;
  createStudent(id: string, body: CreateStudentRequest): Promise<StudentResponse>;
  createStudentsBulk(id: string, body: CreateStudentsBulkRequest): Promise<CreateStudentsBulkResponse>;
  getStudentById(id: string, studentId: string): Promise<StudentResponse>;
  updateStudent(id: string, studentId: string, body: UpdateStudentRequest): Promise<StudentResponse>;
  deleteStudent(id: string, studentId: string): Promise<void>;

  // Join
  getJoinInfo(joinCode: string): Promise<JoinInfoResponse>;
  joinWorkspace(body: JoinRequest): Promise<JoinResponse>;

  // Assessments
  generateAssessmentDraft(input: GenerateAssessmentDraftInput): Promise<AssessmentDraftResponse>;
  getAssessments(query?: GetAssessmentsQuery): Promise<AssessmentSummaryResponse[]>;
  createAssessment(body: CreateAssessmentRequest): Promise<AssessmentResponse>;
  getAssessmentById(id: string): Promise<AssessmentResponse>;
  updateAssessment(id: string, body: UpdateAssessmentRequest): Promise<AssessmentResponse>;
  deleteAssessment(id: string): Promise<void>;
  publishAssessment(id: string): Promise<AssessmentResponse>;
  archiveAssessment(id: string): Promise<AssessmentResponse>;
  duplicateAssessment(id: string): Promise<AssessmentResponse>;
  previewAssessment(id: string): Promise<StudentAssessmentResponse>;

  // Assessment items
  createAssessmentItem(id: string, body: AssessmentItemRequest): Promise<AssessmentItemResponse>;
  getAssessmentItemById(id: string, itemId: string): Promise<AssessmentItemResponse>;
  updateAssessmentItem(
    id: string,
    itemId: string,
    body: AssessmentItemRequest,
  ): Promise<AssessmentItemResponse>;
  deleteAssessmentItem(id: string, itemId: string): Promise<void>;
  reorderAssessmentItems(id: string, body: ReorderItemsRequest): Promise<AssessmentItemResponse[]>;

  // AI
  getAiStatus(): Promise<AiStatusResponse>;

  // Assignments
  getAssignments(query?: GetAssignmentsQuery): Promise<AssignmentSummaryResponse[]>;
  createAssignment(body: CreateAssignmentRequest): Promise<AssignmentResponse>;
  getAssignmentById(id: string): Promise<AssignmentResponse>;
  updateAssignment(id: string, body: UpdateAssignmentRequest): Promise<AssignmentResponse>;
  deleteAssignment(id: string): Promise<void>;
  closeAssignment(id: string): Promise<AssignmentResponse>;
  reopenAssignment(id: string, body?: ReopenAssignmentRequest | null): Promise<AssignmentResponse>;
  setAssignmentResultsVisibility(id: string, body: ResultsVisibilityRequest): Promise<AssignmentResponse>;
  regenerateAssignmentShareToken(id: string): Promise<ShareTokenResponse>;

  // Public assignments
  getPublicAssignment(shareToken: string): Promise<PublicAssignmentResponse>;

  // Submissions
  getAssignmentSubmissions(id: string): Promise<SubmissionRosterResponse[]>;
  getSubmissionById(id: string): Promise<SubmissionDetailResponse>;
  reviewSubmissionItem(
    id: string,
    itemId: string,
    body: ReviewItemRequest,
  ): Promise<SubmissionDetailResponse>;
  allowSubmissionResume(id: string): Promise<SubmissionDetailResponse>;

  // Public submissions
  startSubmission(shareToken: string, body: StartSubmissionRequest): Promise<AccessKeyResponse>;
  getPublicSubmission(accessKey: string): Promise<StudentSubmissionResponse>;
  saveSubmissionResponses(accessKey: string, body: SaveResponsesRequest): Promise<SaveResponsesResponse>;
  submitSubmission(accessKey: string): Promise<SubmitResponse>;
  getSubmissionResult(accessKey: string): Promise<StudentResultResponse>;
}

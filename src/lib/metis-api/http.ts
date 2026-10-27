import type {
  GetAssessmentsQuery,
  GetAssignmentsQuery,
  GetWorkspacesQuery,
  GenerateAssessmentDraftInput,
  IMetisApi,
} from './client';
import { NotImplementedError } from './errors';
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

/**
 * The real-API implementation. Every operation throws NotImplementedError until the HTTP calls are
 * wired to metis-api; the class exists so the app can already be written against IMetisApi.
 */
export class HttpMetisApi implements IMetisApi {
  register(_body: RegisterRequest): Promise<AccessTokenResponse> {
    throw new NotImplementedError('HttpMetisApi.register');
  }

  login(_body: LoginRequest): Promise<AccessTokenResponse> {
    throw new NotImplementedError('HttpMetisApi.login');
  }

  getCurrentUser(): Promise<CurrentUserResponse> {
    throw new NotImplementedError('HttpMetisApi.getCurrentUser');
  }

  getOrganizations(): Promise<OrganizationResponse[]> {
    throw new NotImplementedError('HttpMetisApi.getOrganizations');
  }

  createOrganization(_body: CreateOrganizationRequest): Promise<OrganizationResponse> {
    throw new NotImplementedError('HttpMetisApi.createOrganization');
  }

  getOrganizationById(_id: string): Promise<OrganizationResponse> {
    throw new NotImplementedError('HttpMetisApi.getOrganizationById');
  }

  updateOrganization(_id: string, _body: UpdateOrganizationRequest): Promise<OrganizationResponse> {
    throw new NotImplementedError('HttpMetisApi.updateOrganization');
  }

  deleteOrganization(_id: string): Promise<void> {
    throw new NotImplementedError('HttpMetisApi.deleteOrganization');
  }

  getWorkspaces(_query?: GetWorkspacesQuery): Promise<WorkspaceResponse[]> {
    throw new NotImplementedError('HttpMetisApi.getWorkspaces');
  }

  createWorkspace(_body: CreateWorkspaceRequest): Promise<WorkspaceResponse> {
    throw new NotImplementedError('HttpMetisApi.createWorkspace');
  }

  getWorkspaceById(_id: string): Promise<WorkspaceResponse> {
    throw new NotImplementedError('HttpMetisApi.getWorkspaceById');
  }

  updateWorkspace(_id: string, _body: UpdateWorkspaceRequest): Promise<WorkspaceResponse> {
    throw new NotImplementedError('HttpMetisApi.updateWorkspace');
  }

  deleteWorkspace(_id: string): Promise<void> {
    throw new NotImplementedError('HttpMetisApi.deleteWorkspace');
  }

  archiveWorkspace(_id: string): Promise<WorkspaceResponse> {
    throw new NotImplementedError('HttpMetisApi.archiveWorkspace');
  }

  restoreWorkspace(_id: string): Promise<WorkspaceResponse> {
    throw new NotImplementedError('HttpMetisApi.restoreWorkspace');
  }

  regenerateWorkspaceJoinCode(_id: string): Promise<JoinCodeResponse> {
    throw new NotImplementedError('HttpMetisApi.regenerateWorkspaceJoinCode');
  }

  getStudents(_id: string): Promise<StudentResponse[]> {
    throw new NotImplementedError('HttpMetisApi.getStudents');
  }

  createStudent(_id: string, _body: CreateStudentRequest): Promise<StudentResponse> {
    throw new NotImplementedError('HttpMetisApi.createStudent');
  }

  createStudentsBulk(_id: string, _body: CreateStudentsBulkRequest): Promise<CreateStudentsBulkResponse> {
    throw new NotImplementedError('HttpMetisApi.createStudentsBulk');
  }

  getStudentById(_id: string, _studentId: string): Promise<StudentResponse> {
    throw new NotImplementedError('HttpMetisApi.getStudentById');
  }

  updateStudent(_id: string, _studentId: string, _body: UpdateStudentRequest): Promise<StudentResponse> {
    throw new NotImplementedError('HttpMetisApi.updateStudent');
  }

  deleteStudent(_id: string, _studentId: string): Promise<void> {
    throw new NotImplementedError('HttpMetisApi.deleteStudent');
  }

  getJoinInfo(_joinCode: string): Promise<JoinInfoResponse> {
    throw new NotImplementedError('HttpMetisApi.getJoinInfo');
  }

  joinWorkspace(_body: JoinRequest): Promise<JoinResponse> {
    throw new NotImplementedError('HttpMetisApi.joinWorkspace');
  }

  generateAssessmentDraft(_input: GenerateAssessmentDraftInput): Promise<AssessmentDraftResponse> {
    throw new NotImplementedError('HttpMetisApi.generateAssessmentDraft');
  }

  getAssessments(_query?: GetAssessmentsQuery): Promise<AssessmentSummaryResponse[]> {
    throw new NotImplementedError('HttpMetisApi.getAssessments');
  }

  createAssessment(_body: CreateAssessmentRequest): Promise<AssessmentResponse> {
    throw new NotImplementedError('HttpMetisApi.createAssessment');
  }

  getAssessmentById(_id: string): Promise<AssessmentResponse> {
    throw new NotImplementedError('HttpMetisApi.getAssessmentById');
  }

  updateAssessment(_id: string, _body: UpdateAssessmentRequest): Promise<AssessmentResponse> {
    throw new NotImplementedError('HttpMetisApi.updateAssessment');
  }

  deleteAssessment(_id: string): Promise<void> {
    throw new NotImplementedError('HttpMetisApi.deleteAssessment');
  }

  publishAssessment(_id: string): Promise<AssessmentResponse> {
    throw new NotImplementedError('HttpMetisApi.publishAssessment');
  }

  archiveAssessment(_id: string): Promise<AssessmentResponse> {
    throw new NotImplementedError('HttpMetisApi.archiveAssessment');
  }

  duplicateAssessment(_id: string): Promise<AssessmentResponse> {
    throw new NotImplementedError('HttpMetisApi.duplicateAssessment');
  }

  previewAssessment(_id: string): Promise<StudentAssessmentResponse> {
    throw new NotImplementedError('HttpMetisApi.previewAssessment');
  }

  createAssessmentItem(_id: string, _body: AssessmentItemRequest): Promise<AssessmentItemResponse> {
    throw new NotImplementedError('HttpMetisApi.createAssessmentItem');
  }

  getAssessmentItemById(_id: string, _itemId: string): Promise<AssessmentItemResponse> {
    throw new NotImplementedError('HttpMetisApi.getAssessmentItemById');
  }

  updateAssessmentItem(
    _id: string,
    _itemId: string,
    _body: AssessmentItemRequest,
  ): Promise<AssessmentItemResponse> {
    throw new NotImplementedError('HttpMetisApi.updateAssessmentItem');
  }

  deleteAssessmentItem(_id: string, _itemId: string): Promise<void> {
    throw new NotImplementedError('HttpMetisApi.deleteAssessmentItem');
  }

  reorderAssessmentItems(_id: string, _body: ReorderItemsRequest): Promise<AssessmentItemResponse[]> {
    throw new NotImplementedError('HttpMetisApi.reorderAssessmentItems');
  }

  getAiStatus(): Promise<AiStatusResponse> {
    throw new NotImplementedError('HttpMetisApi.getAiStatus');
  }

  getAssignments(_query?: GetAssignmentsQuery): Promise<AssignmentSummaryResponse[]> {
    throw new NotImplementedError('HttpMetisApi.getAssignments');
  }

  createAssignment(_body: CreateAssignmentRequest): Promise<AssignmentResponse> {
    throw new NotImplementedError('HttpMetisApi.createAssignment');
  }

  getAssignmentById(_id: string): Promise<AssignmentResponse> {
    throw new NotImplementedError('HttpMetisApi.getAssignmentById');
  }

  updateAssignment(_id: string, _body: UpdateAssignmentRequest): Promise<AssignmentResponse> {
    throw new NotImplementedError('HttpMetisApi.updateAssignment');
  }

  deleteAssignment(_id: string): Promise<void> {
    throw new NotImplementedError('HttpMetisApi.deleteAssignment');
  }

  closeAssignment(_id: string): Promise<AssignmentResponse> {
    throw new NotImplementedError('HttpMetisApi.closeAssignment');
  }

  reopenAssignment(_id: string, _body?: ReopenAssignmentRequest | null): Promise<AssignmentResponse> {
    throw new NotImplementedError('HttpMetisApi.reopenAssignment');
  }

  setAssignmentResultsVisibility(_id: string, _body: ResultsVisibilityRequest): Promise<AssignmentResponse> {
    throw new NotImplementedError('HttpMetisApi.setAssignmentResultsVisibility');
  }

  regenerateAssignmentShareToken(_id: string): Promise<ShareTokenResponse> {
    throw new NotImplementedError('HttpMetisApi.regenerateAssignmentShareToken');
  }

  getPublicAssignment(_shareToken: string): Promise<PublicAssignmentResponse> {
    throw new NotImplementedError('HttpMetisApi.getPublicAssignment');
  }

  getAssignmentSubmissions(_id: string): Promise<SubmissionRosterResponse[]> {
    throw new NotImplementedError('HttpMetisApi.getAssignmentSubmissions');
  }

  getSubmissionById(_id: string): Promise<SubmissionDetailResponse> {
    throw new NotImplementedError('HttpMetisApi.getSubmissionById');
  }

  reviewSubmissionItem(
    _id: string,
    _itemId: string,
    _body: ReviewItemRequest,
  ): Promise<SubmissionDetailResponse> {
    throw new NotImplementedError('HttpMetisApi.reviewSubmissionItem');
  }

  allowSubmissionResume(_id: string): Promise<SubmissionDetailResponse> {
    throw new NotImplementedError('HttpMetisApi.allowSubmissionResume');
  }

  startSubmission(_shareToken: string, _body: StartSubmissionRequest): Promise<AccessKeyResponse> {
    throw new NotImplementedError('HttpMetisApi.startSubmission');
  }

  getPublicSubmission(_accessKey: string): Promise<StudentSubmissionResponse> {
    throw new NotImplementedError('HttpMetisApi.getPublicSubmission');
  }

  saveSubmissionResponses(_accessKey: string, _body: SaveResponsesRequest): Promise<SaveResponsesResponse> {
    throw new NotImplementedError('HttpMetisApi.saveSubmissionResponses');
  }

  submitSubmission(_accessKey: string): Promise<SubmitResponse> {
    throw new NotImplementedError('HttpMetisApi.submitSubmission');
  }

  getSubmissionResult(_accessKey: string): Promise<StudentResultResponse> {
    throw new NotImplementedError('HttpMetisApi.getSubmissionResult');
  }
}

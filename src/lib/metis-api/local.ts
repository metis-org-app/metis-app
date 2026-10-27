/*
 * LocalMetisApi: a fully working IMetisApi backed by IndexedDB, so the app can be demoed offline.
 *
 * It fails the way metis-api does: every rejection is a MetisApiError carrying the status and an RFC 9457
 * Problem Details body (HttpValidationProblemDetails with an `errors` map for field errors), anything the
 * current user does not own answers 404, and the two conflicts a client must tell apart carry the `code`
 * extension member used by the real API ("alreadyStarted", "submissionClosed").
 */

import type {
  AccessKeyResponse,
  AccessTokenResponse,
  AiStatusResponse,
  AnswerRequest,
  AnswerResponse,
  AssessmentDraftItemResponse,
  AssessmentDraftResponse,
  AssessmentItemRequest,
  AssessmentItemResponse,
  AssessmentResponse,
  AssessmentSummaryResponse,
  AssignmentResponse,
  AssignmentSummaryResponse,
  ChoiceOptionRequest,
  ChoiceOptionResponse,
  CreateAssessmentRequest,
  CreateAssignmentRequest,
  CreateOrganizationRequest,
  CreateStudentRequest,
  CreateStudentsBulkRequest,
  CreateStudentsBulkResponse,
  CreateWorkspaceRequest,
  CurrentUserResponse,
  ItemResultResponse,
  JoinCodeResponse,
  JoinInfoResponse,
  JoinRequest,
  JoinResponse,
  LoginRequest,
  OrganizationResponse,
  ProblemDetails,
  PublicAssignmentResponse,
  RegisterRequest,
  ReopenAssignmentRequest,
  ReorderItemsRequest,
  ResponseEntryResponse,
  ResultsVisibilityRequest,
  ReviewItemRequest,
  SaveResponsesRequest,
  SaveResponsesResponse,
  ShareTokenResponse,
  StartSubmissionRequest,
  StudentAssessmentResponse,
  StudentChoiceOptionResponse,
  StudentItemResponse,
  StudentResponse,
  StudentResultItemResponse,
  StudentResultResponse,
  StudentSubmissionResponse,
  SubmissionDetailItemResponse,
  SubmissionDetailResponse,
  SubmissionRosterResponse,
  SubmissionStudentResponse,
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
import {
  AI_DIFFICULTIES,
  ASSESSMENT_STATUSES,
  ASSIGNMENT_AVAILABILITIES,
  ITEM_TYPES,
  WORKSPACE_STATUSES,
} from './constants';
import type {
  GenerateAssessmentDraftInput,
  GetAssessmentsQuery,
  GetAssignmentsQuery,
  GetWorkspacesQuery,
  IMetisApi,
} from './client';
import { apiError, MetisApiError, problemDetails, validationError } from './errors';
import {
  openMetisDb,
  TOKEN_STORAGE_KEY,
  type AssessmentRecord,
  type AssignmentRecord,
  type ItemRecord,
  type MetisDb,
  type OrganizationRecord,
  type ResponseRecord,
  type StudentRecord,
  type SubmissionRecord,
  type UserRecord,
  type WorkspaceRecord,
} from './db';

/** Aligned with the join code the app validates (see src/features/workspaces/api.ts). */
const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const JOIN_CODE_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
 * Mirrors src/features/assessments/generator/limits.ts (and values.ts) so the local validation matches the
 * upload rules the app already enforces. Feature internals are not importable from src/lib, so the small
 * constants are duplicated here on purpose.
 */
const GENERATOR_LIMITS = {
  topicMax: 300,
  levelMax: 100,
  instructionsMax: 2_000,
  sourceTextMax: 50_000,
  itemCountMin: 1,
  itemCountMax: 30,
  itemCountDefault: 10,
  maxFiles: 5,
  maxImageBytes: 5 * 1024 * 1024,
  maxFileBytes: 15 * 1024 * 1024,
  maxUploadBytes: 40 * 1024 * 1024,
} as const;

const ACCEPTED_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.docx',
  '.pptx',
  '.xlsx',
  '.odt',
  '.odp',
  '.ods',
  '.rtf',
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.html',
  '.htm',
  '.json',
] as const;

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'] as const;

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot).toLowerCase();
}

function isImage(fileName: string): boolean {
  return (IMAGE_EXTENSIONS as readonly string[]).includes(extensionOf(fileName));
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') return cryptoObj.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
    return bytes;
  }
  for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Opaque URL-safe random string: 16 bytes -> 22 characters, same shape as the app's share tokens. */
function randomToken(): string {
  return base64Url(randomBytes(16));
}

function newJoinCode(): string {
  const bytes = randomBytes(JOIN_CODE_LENGTH);
  let code = '';
  for (const byte of bytes) code += JOIN_CODE_ALPHABET[byte % JOIN_CODE_ALPHABET.length] ?? 'A';
  return code;
}

/** The fake bearer token: `demo.` plus the user id, so getCurrentUser survives a reload. */
function encodeToken(userId: string): string {
  return `demo.${base64Url(new TextEncoder().encode(userId))}`;
}

function decodeTokenUserId(token: string | null): string | null {
  if (!token || !token.startsWith('demo.')) return null;
  const encoded = token.slice('demo.'.length).replace(/-/g, '+').replace(/_/g, '/');
  try {
    const padded = `${encoded}${'='.repeat((4 - (encoded.length % 4)) % 4)}`;
    const binary = atob(padded);
    return new TextDecoder().decode(Uint8Array.from(binary, (ch) => ch.charCodeAt(0)));
  } catch {
    return null;
  }
}

function readToken(): string | null {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem(TOKEN_STORAGE_KEY);
}

function persistToken(token: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

function isValidIso(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function addError(errors: Record<string, string[]>, key: string, message: string): void {
  const list = errors[key] ?? [];
  list.push(message);
  errors[key] = list;
}

/** Problem Details body carrying the `code` extension member of the real API's conflicts. */
type ProblemDetailsWithCode = ProblemDetails & { code?: string };

function conflictError(status: number, title: string, code: string, detail: string): MetisApiError {
  const body: ProblemDetailsWithCode = { ...problemDetails(status, title, detail), code };
  return new MetisApiError(status, body);
}

function isWorkspaceStatus(value: string): value is WorkspaceStatus {
  return (WORKSPACE_STATUSES as readonly string[]).includes(value);
}

function isAssessmentStatus(value: string): value is AssessmentStatus {
  return (ASSESSMENT_STATUSES as readonly string[]).includes(value);
}

function isAvailability(value: string): value is AssignmentAvailability {
  return (ASSIGNMENT_AVAILABILITIES as readonly string[]).includes(value);
}

function isItemType(value: string): value is ItemType {
  return (ITEM_TYPES as readonly string[]).includes(value);
}

function isAiDifficulty(value: string): value is AiDifficulty {
  return (AI_DIFFICULTIES as readonly string[]).includes(value);
}

/** Availability of an assignment, computed from its window and its Open/Closed state. */
function computeAvailability(record: AssignmentRecord, now: number): AssignmentAvailability {
  if (record.status === 'Closed') return 'Closed';
  if (Date.parse(record.opensAt) > now) return 'Scheduled';
  if (record.dueAt !== null && Date.parse(record.dueAt) < now) return 'Closed';
  return 'Open';
}

function toChoiceOptions(options: ChoiceOptionRequest[] | null): ChoiceOptionResponse[] | null {
  if (!options) return null;
  return options.map((option, index) => ({
    key: String.fromCharCode(65 + index),
    text: (option.text ?? '').trim(),
    isCorrect: option.isCorrect,
  }));
}

function toStudentChoiceOptions(
  options: ChoiceOptionResponse[] | null,
): StudentChoiceOptionResponse[] | null {
  if (!options) return null;
  return options.map(({ key, text }) => ({ key, text }));
}

function toStudentItem(item: ItemRecord): StudentItemResponse {
  return {
    id: item.id,
    position: item.position,
    type: item.type,
    prompt: item.prompt,
    points: item.points,
    options: toStudentChoiceOptions(item.options),
    minWords: item.minWords,
    maxWords: item.maxWords,
  };
}

function toItemResponse(item: ItemRecord): AssessmentItemResponse {
  return {
    id: item.id,
    position: item.position,
    type: item.type,
    prompt: item.prompt,
    points: item.points,
    options: item.options,
    isTrue: item.isTrue,
    minWords: item.minWords,
    maxWords: item.maxWords,
    teacherNotes: item.teacherNotes,
    assistantEnabled: item.assistantEnabled,
    studentHint: item.studentHint,
  };
}

function toStudentResponse(record: StudentRecord): StudentResponse {
  return { id: record.id, name: record.name, email: record.email, createdAt: record.createdAt };
}

function toWorkspaceResponse(record: WorkspaceRecord, studentCount: number): WorkspaceResponse {
  return {
    id: record.id,
    name: record.name,
    joinCode: record.joinCode,
    status: record.status,
    studentCount,
    createdAt: record.createdAt,
  };
}

function isBlankAnswer(type: ItemType, answer: AnswerResponse): boolean {
  switch (type) {
    case 'SingleChoice':
      return answer.selectedKey === null;
    case 'MultipleChoice':
      return !answer.selectedKeys || answer.selectedKeys.length === 0;
    case 'TrueFalse':
      return answer.value === null;
    case 'Essay':
      return answer.text === null || answer.text.trim() === '';
  }
}

function isCorrectAnswer(item: ItemRecord, answer: AnswerResponse): boolean {
  switch (item.type) {
    case 'SingleChoice': {
      const option = (item.options ?? []).find((entry) => entry.key === answer.selectedKey);
      return option !== undefined && option.isCorrect;
    }
    case 'MultipleChoice': {
      const selected = new Set(answer.selectedKeys ?? []);
      const correct = (item.options ?? []).filter((entry) => entry.isCorrect);
      return selected.size === correct.length && correct.every((entry) => selected.has(entry.key));
    }
    case 'TrueFalse':
      return answer.value !== null && answer.value === item.isTrue;
    case 'Essay':
      return false;
  }
}

function responseEntries(items: ItemRecord[], records: ResponseRecord[]): ResponseEntryResponse[] {
  const byItem = new Map(records.map((record) => [record.itemId, record] as const));
  const entries: ResponseEntryResponse[] = [];
  for (const item of items) {
    const record = byItem.get(item.id);
    if (record && record.response) {
      entries.push({ itemId: item.id, response: record.response, updatedAt: record.updatedAt });
    }
  }
  return entries;
}

const DRAFT_PROMPTS: Record<ItemType, (n: number, topic: string) => string> = {
  SingleChoice: (n, topic) => `Pregunta ${n}: selecciona la opción correcta sobre «${topic}».`,
  MultipleChoice: (n, topic) => `Pregunta ${n}: selecciona todas las opciones correctas sobre «${topic}».`,
  TrueFalse: (n, topic) => `Pregunta ${n}: indica si la afirmación sobre «${topic}» es verdadera o falsa.`,
  Essay: (n, topic) => `Pregunta ${n}: desarrolla por escrito un aspecto relevante de «${topic}».`,
};

/** LocalMetisApi: IMetisApi persisted in the `metis-demo` IndexedDB database. */
export class LocalMetisApi implements IMetisApi {
  private dbPromise: Promise<MetisDb> | null = null;

  private db(): Promise<MetisDb> {
    this.dbPromise ??= openMetisDb();
    return this.dbPromise;
  }

  private async requireUser(): Promise<UserRecord> {
    const userId = decodeTokenUserId(readToken());
    const db = await this.db();
    const user = userId ? await db.get('users', userId) : undefined;
    if (!user) throw apiError(401, 'Unauthorized', 'Inicia sesión para continuar.');
    return user;
  }

  private async requireWorkspace(userId: string, id: string): Promise<WorkspaceRecord> {
    const db = await this.db();
    const record = await db.get('workspaces', id);
    if (!record || record.userId !== userId) throw apiError(404, 'Workspace not found.');
    return record;
  }

  private async requireAssessment(userId: string, id: string): Promise<AssessmentRecord> {
    const db = await this.db();
    const record = await db.get('assessments', id);
    if (!record || record.userId !== userId) throw apiError(404, 'Assessment not found.');
    return record;
  }

  private async requireAssignment(userId: string, id: string): Promise<AssignmentRecord> {
    const db = await this.db();
    const record = await db.get('assignments', id);
    if (!record || record.userId !== userId) throw apiError(404, 'Assignment not found.');
    return record;
  }

  private async itemsOf(assessmentId: string): Promise<ItemRecord[]> {
    const db = await this.db();
    const items = await db.getAllFromIndex('items', 'by-assessment', assessmentId);
    return items.sort((a, b) => a.position - b.position);
  }

  private async requireItem(assessmentId: string, itemId: string): Promise<ItemRecord> {
    const db = await this.db();
    const item = await db.get('items', itemId);
    if (!item || item.assessmentId !== assessmentId) throw apiError(404, 'Item not found.');
    return item;
  }

  private async findResponse(submissionId: string, itemId: string): Promise<ResponseRecord | undefined> {
    const db = await this.db();
    const records = await db.getAllFromIndex('responses', 'by-submission', submissionId);
    return records.find((record) => record.itemId === itemId);
  }

  private issueTokens(userId: string): AccessTokenResponse {
    const accessToken = encodeToken(userId);
    persistToken(accessToken);
    return { tokenType: 'Bearer', accessToken, expiresIn: 3600, refreshToken: randomToken() };
  }

  private validateItemRequest(
    body: AssessmentItemRequest,
    prefix: string,
    errors: Record<string, string[]>,
  ): void {
    const key = (field: string) => (prefix === '' ? field : `${prefix}.${field}`);
    const type = body.type ?? '';
    if (!isItemType(type)) addError(errors, key('type'), 'El tipo de pregunta es obligatorio.');

    if (body.prompt === null || body.prompt.trim() === '') {
      addError(errors, key('prompt'), 'El enunciado es obligatorio.');
    }

    if (body.points === null || !Number.isInteger(body.points) || body.points <= 0) {
      addError(errors, key('points'), 'Los puntos deben ser un entero mayor que cero.');
    }

    if (type === 'SingleChoice' || type === 'MultipleChoice') {
      const options = body.options ?? [];
      if (options.length < 2) {
        addError(errors, key('options'), 'Incluye al menos dos alternativas.');
      }
      options.forEach((option, index) => {
        if (option.text === null || option.text.trim() === '') {
          addError(errors, `${key('options')}[${index}].text`, 'La alternativa no puede estar vacía.');
        }
      });
      const correctCount = options.filter((option) => option.isCorrect).length;
      if (type === 'SingleChoice' && correctCount !== 1) {
        addError(errors, key('options'), 'Marca exactamente una alternativa correcta.');
      }
      if (type === 'MultipleChoice' && correctCount < 1) {
        addError(errors, key('options'), 'Marca al menos una alternativa correcta.');
      }
    }

    if (type === 'TrueFalse' && body.isTrue === null) {
      addError(errors, key('isTrue'), 'Indica si la afirmación es verdadera o falsa.');
    }

    if (type === 'Essay') {
      const { minWords, maxWords } = body;
      if (minWords === null || !Number.isInteger(minWords) || minWords < 0) {
        addError(errors, key('minWords'), 'El mínimo de palabras debe ser un entero mayor o igual a cero.');
      }
      if (maxWords === null || !Number.isInteger(maxWords) || maxWords < 0) {
        addError(errors, key('maxWords'), 'El máximo de palabras debe ser un entero mayor o igual a cero.');
      }
      if (
        minWords !== null &&
        maxWords !== null &&
        Number.isInteger(minWords) &&
        Number.isInteger(maxWords) &&
        minWords > maxWords
      ) {
        addError(errors, key('minWords'), 'El mínimo de palabras no puede superar el máximo.');
      }
    }
  }

  private assertItemValid(body: AssessmentItemRequest, prefix = ''): void {
    const errors: Record<string, string[]> = {};
    this.validateItemRequest(body, prefix, errors);
    if (Object.keys(errors).length > 0) throw validationError(errors);
  }

  private validateAnswer(
    item: ItemRecord,
    answer: AnswerRequest,
    key: string,
    errors: Record<string, string[]>,
  ): void {
    const otherFieldsSet =
      (item.type === 'SingleChoice' &&
        (answer.selectedKeys !== null || answer.value !== null || answer.text !== null)) ||
      (item.type === 'MultipleChoice' &&
        (answer.selectedKey !== null || answer.value !== null || answer.text !== null)) ||
      (item.type === 'TrueFalse' &&
        (answer.selectedKey !== null || answer.selectedKeys !== null || answer.text !== null)) ||
      (item.type === 'Essay' &&
        (answer.selectedKey !== null || answer.selectedKeys !== null || answer.value !== null));
    if (otherFieldsSet) {
      addError(errors, key, 'La respuesta no corresponde al tipo de la pregunta.');
      return;
    }

    switch (item.type) {
      case 'SingleChoice': {
        const keys = (item.options ?? []).map((option) => option.key);
        if (answer.selectedKey === null || !keys.includes(answer.selectedKey)) {
          addError(errors, key, 'Selecciona una alternativa válida.');
        }
        break;
      }
      case 'MultipleChoice': {
        const keys = (item.options ?? []).map((option) => option.key);
        const selected = answer.selectedKeys ?? [];
        if (selected.length === 0) {
          addError(errors, key, 'Selecciona al menos una alternativa.');
          break;
        }
        if (new Set(selected).size !== selected.length) {
          addError(errors, key, 'No repitas alternativas.');
          break;
        }
        if (selected.some((entry) => !keys.includes(entry))) {
          addError(errors, key, 'Selecciona alternativas válidas.');
        }
        break;
      }
      case 'TrueFalse': {
        if (answer.value === null) {
          addError(errors, key, 'Indica si la afirmación es verdadera o falsa.');
        }
        break;
      }
      case 'Essay': {
        if (answer.text === null) {
          addError(errors, key, 'Escribe tu respuesta.');
        }
        break;
      }
    }
  }

  private normalizeAnswer(answer: AnswerRequest): AnswerResponse {
    return {
      selectedKey: answer.selectedKey,
      selectedKeys: answer.selectedKeys,
      value: answer.value,
      text: answer.text,
    };
  }

  /**
   * Grades every item of a submission and recomputes its score and status. Items already reviewed by the
   * instructor keep their score and feedback; essays waiting for review make the score provisional.
   */
  private async gradeAndRecompute(submissionId: string, at: string): Promise<void> {
    const db = await this.db();
    const submission = await db.get('submissions', submissionId);
    if (!submission) return;
    const assignment = await db.get('assignments', submission.assignmentId);
    if (!assignment) return;
    const items = await this.itemsOf(assignment.assessmentId);
    const records = await db.getAllFromIndex('responses', 'by-submission', submissionId);
    const byItem = new Map(records.map((record) => [record.itemId, record] as const));

    let score = 0;
    let pending = 0;
    for (const item of items) {
      let record = byItem.get(item.id);
      if (!record) {
        record = {
          id: newId(),
          submissionId,
          itemId: item.id,
          response: null,
          updatedAt: null,
          score: null,
          gradingStatus: null,
          feedback: null,
          gradedAt: null,
        };
        await db.put('responses', record);
      }
      if (record.gradingStatus === 'Reviewed') {
        score += record.score ?? 0;
        continue;
      }

      const answer = record.response;
      const blank = answer === null || isBlankAnswer(item.type, answer);
      if (item.type === 'Essay' && !blank) {
        record.score = null;
        record.gradingStatus = 'PendingReview';
        record.gradedAt = null;
        pending += 1;
      } else {
        record.score = blank || !answer ? 0 : isCorrectAnswer(item, answer) ? item.points : 0;
        record.gradingStatus = 'AutoGraded';
        record.gradedAt = at;
        score += record.score;
      }
      await db.put('responses', record);
    }

    const maxScore = items.reduce((sum, item) => sum + item.points, 0);
    submission.score = score;
    submission.maxScore = maxScore;
    submission.isScoreProvisional = pending > 0;
    submission.status = pending > 0 ? 'Submitted' : 'Graded';
    submission.gradedAt = pending > 0 ? null : at;
    await db.put('submissions', submission);
  }

  private async buildAssignment(assignment: AssignmentRecord): Promise<AssignmentResponse> {
    const db = await this.db();
    const assessment = await db.get('assessments', assignment.assessmentId);
    const workspace = await db.get('workspaces', assignment.workspaceId);
    const submissionCount = await db.countFromIndex('submissions', 'by-assignment', assignment.id);
    return {
      id: assignment.id,
      assessmentId: assignment.assessmentId,
      assessmentTitle: assessment?.title ?? '',
      workspaceId: assignment.workspaceId,
      workspaceName: workspace?.name ?? '',
      shareToken: assignment.shareToken,
      status: assignment.status,
      availability: computeAvailability(assignment, Date.now()),
      opensAt: assignment.opensAt,
      dueAt: assignment.dueAt,
      durationMinutes: assignment.durationMinutes,
      assistantEnabled: assignment.assistantEnabled,
      maxHelpLevel: assignment.maxHelpLevel,
      assistantInstructions: assignment.assistantInstructions,
      resultsVisible: assignment.resultsVisible,
      createdAt: assignment.createdAt,
      submissionCount,
    };
  }

  private async buildAssignmentSummary(assignment: AssignmentRecord): Promise<AssignmentSummaryResponse> {
    const db = await this.db();
    const assessment = await db.get('assessments', assignment.assessmentId);
    const workspace = await db.get('workspaces', assignment.workspaceId);
    return {
      id: assignment.id,
      assessmentId: assignment.assessmentId,
      assessmentTitle: assessment?.title ?? '',
      workspaceId: assignment.workspaceId,
      workspaceName: workspace?.name ?? '',
      availability: computeAvailability(assignment, Date.now()),
      opensAt: assignment.opensAt,
      dueAt: assignment.dueAt,
      durationMinutes: assignment.durationMinutes,
      resultsVisible: assignment.resultsVisible,
      createdAt: assignment.createdAt,
    };
  }

  private async buildSubmissionDetail(submission: SubmissionRecord): Promise<SubmissionDetailResponse> {
    const db = await this.db();
    const assignment = await db.get('assignments', submission.assignmentId);
    const assessment = assignment ? await db.get('assessments', assignment.assessmentId) : undefined;
    const items = assignment ? await this.itemsOf(assignment.assessmentId) : [];
    const records = await db.getAllFromIndex('responses', 'by-submission', submission.id);
    const byItem = new Map(records.map((record) => [record.itemId, record] as const));

    const detailItems: SubmissionDetailItemResponse[] = items.map((item) => {
      const record = byItem.get(item.id);
      const result: ItemResultResponse | null =
        record && record.gradingStatus
          ? {
              score: record.score,
              gradingStatus: record.gradingStatus,
              feedback: record.feedback,
              gradedAt: record.gradedAt,
            }
          : null;
      return { item: toItemResponse(item), response: record?.response ?? null, result };
    });

    return {
      id: submission.id,
      assignmentId: submission.assignmentId,
      assessmentTitle: assessment?.title ?? '',
      student: await this.buildSubmissionStudentDetail(submission),
      status: submission.status,
      startedAt: submission.startedAt,
      submittedAt: submission.submittedAt,
      deadline: submission.deadline,
      score: submission.score,
      isScoreProvisional: submission.isScoreProvisional,
      maxScore: submission.maxScore,
      gradedAt: submission.gradedAt,
      pendingReviewCount: records.filter((r) => r.gradingStatus === 'PendingReview').length,
      resumeAllowed: submission.resumeAllowed,
      items: detailItems,
    };
  }

  private async buildSubmissionStudentDetail(
    submission: SubmissionRecord,
  ): Promise<SubmissionStudentResponse> {
    const db = await this.db();
    const student = await db.get('students', submission.studentId);
    return {
      id: student?.id ?? submission.studentId,
      name: student?.name ?? '',
      email: student?.email ?? '',
    };
  }

  // Auth

  async register(body: RegisterRequest): Promise<AccessTokenResponse> {
    const name = (body.name ?? '').trim();
    const email = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';
    const errors: Record<string, string[]> = {};
    if (name === '') addError(errors, 'name', 'El nombre es obligatorio.');
    if (email === '') addError(errors, 'email', 'El correo es obligatorio.');
    else if (!EMAIL_PATTERN.test(email)) addError(errors, 'email', 'Ingresa un correo válido.');
    if (password === '') addError(errors, 'password', 'La contraseña es obligatoria.');
    if (Object.keys(errors).length > 0) throw validationError(errors);

    const db = await this.db();
    const existing = await db.getFromIndex('users', 'by-email', email);
    if (existing) {
      throw apiError(409, 'Conflict', 'Ya existe una cuenta con ese correo.');
    }
    const record: UserRecord = {
      id: newId(),
      name,
      email,
      password,
      createdAt: nowIso(),
    };
    await db.put('users', record);
    return this.issueTokens(record.id);
  }

  async login(body: LoginRequest): Promise<AccessTokenResponse> {
    const email = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';
    const db = await this.db();
    const record = email === '' ? undefined : await db.getFromIndex('users', 'by-email', email);
    if (!record || record.password !== password) {
      throw apiError(401, 'Unauthorized', 'Correo o contraseña incorrectos.');
    }
    return this.issueTokens(record.id);
  }

  async getCurrentUser(): Promise<CurrentUserResponse> {
    const user = await this.requireUser();
    return { id: user.id, name: user.name, email: user.email };
  }

  // Organizations

  async getOrganizations(): Promise<OrganizationResponse[]> {
    const user = await this.requireUser();
    const db = await this.db();
    const records = await db.getAllFromIndex('organizations', 'by-user', user.id);
    return records.map((record: OrganizationRecord) => ({ id: record.id, name: record.name }));
  }

  async createOrganization(body: CreateOrganizationRequest): Promise<OrganizationResponse> {
    const user = await this.requireUser();
    const name = (body.name ?? '').trim();
    if (name === '') throw validationError({ name: ['El nombre es obligatorio.'] });
    const db = await this.db();
    const record: OrganizationRecord = { id: newId(), userId: user.id, name };
    await db.put('organizations', record);
    return { id: record.id, name: record.name };
  }

  async getOrganizationById(id: string): Promise<OrganizationResponse> {
    const user = await this.requireUser();
    const db = await this.db();
    const record = await db.get('organizations', id);
    if (!record || record.userId !== user.id) throw apiError(404, 'Organization not found.');
    return { id: record.id, name: record.name };
  }

  async updateOrganization(id: string, body: UpdateOrganizationRequest): Promise<OrganizationResponse> {
    const user = await this.requireUser();
    const db = await this.db();
    const record = await db.get('organizations', id);
    if (!record || record.userId !== user.id) throw apiError(404, 'Organization not found.');
    const name = (body.name ?? '').trim();
    if (name === '') throw validationError({ name: ['El nombre es obligatorio.'] });
    record.name = name;
    await db.put('organizations', record);
    return { id: record.id, name: record.name };
  }

  async deleteOrganization(id: string): Promise<void> {
    const user = await this.requireUser();
    const db = await this.db();
    const record = await db.get('organizations', id);
    if (!record || record.userId !== user.id) throw apiError(404, 'Organization not found.');
    await db.delete('organizations', id);
  }

  // Workspaces

  async getWorkspaces(query?: GetWorkspacesQuery): Promise<WorkspaceResponse[]> {
    const user = await this.requireUser();
    if (query?.status !== undefined && !isWorkspaceStatus(query.status)) {
      throw validationError({ status: ['Usa uno de: Active, Archived.'] });
    }
    const db = await this.db();
    const records = await db.getAllFromIndex('workspaces', 'by-user', user.id);
    const filtered = query?.status ? records.filter((r) => r.status === query.status) : records;
    return Promise.all(
      filtered.map(async (record) =>
        toWorkspaceResponse(record, await db.countFromIndex('students', 'by-workspace', record.id)),
      ),
    );
  }

  async createWorkspace(body: CreateWorkspaceRequest): Promise<WorkspaceResponse> {
    const user = await this.requireUser();
    const name = (body.name ?? '').trim();
    if (name === '') throw validationError({ name: ['El nombre es obligatorio.'] });
    const db = await this.db();
    const record: WorkspaceRecord = {
      id: newId(),
      userId: user.id,
      name,
      joinCode: await this.freeJoinCode(),
      status: 'Active',
      createdAt: nowIso(),
    };
    await db.put('workspaces', record);
    return toWorkspaceResponse(record, 0);
  }

  private async freeJoinCode(): Promise<string> {
    const db = await this.db();
    for (;;) {
      const code = newJoinCode();
      const existing = await db.getFromIndex('workspaces', 'by-join-code', code);
      if (!existing) return code;
    }
  }

  async getWorkspaceById(id: string): Promise<WorkspaceResponse> {
    const user = await this.requireUser();
    const record = await this.requireWorkspace(user.id, id);
    const db = await this.db();
    const studentCount = await db.countFromIndex('students', 'by-workspace', record.id);
    return toWorkspaceResponse(record, studentCount);
  }

  async updateWorkspace(id: string, body: UpdateWorkspaceRequest): Promise<WorkspaceResponse> {
    const user = await this.requireUser();
    const record = await this.requireWorkspace(user.id, id);
    const name = (body.name ?? '').trim();
    if (name === '') throw validationError({ name: ['El nombre es obligatorio.'] });
    const db = await this.db();
    record.name = name;
    await db.put('workspaces', record);
    const studentCount = await db.countFromIndex('students', 'by-workspace', record.id);
    return toWorkspaceResponse(record, studentCount);
  }

  async deleteWorkspace(id: string): Promise<void> {
    const user = await this.requireUser();
    const record = await this.requireWorkspace(user.id, id);
    const db = await this.db();
    const assignments = await db.getAllFromIndex('assignments', 'by-workspace', id);
    if (assignments.length > 0) {
      // A workspace with assignments keeps its history: it is archived instead of deleted.
      record.status = 'Archived';
      await db.put('workspaces', record);
      return;
    }
    const students = await db.getAllFromIndex('students', 'by-workspace', id);
    for (const student of students) await db.delete('students', student.id);
    await db.delete('workspaces', id);
  }

  async archiveWorkspace(id: string): Promise<WorkspaceResponse> {
    const user = await this.requireUser();
    const record = await this.requireWorkspace(user.id, id);
    if (record.status === 'Archived') {
      throw apiError(400, 'Bad Request', 'El espacio ya está archivado.');
    }
    const db = await this.db();
    record.status = 'Archived';
    await db.put('workspaces', record);
    const studentCount = await db.countFromIndex('students', 'by-workspace', record.id);
    return toWorkspaceResponse(record, studentCount);
  }

  async restoreWorkspace(id: string): Promise<WorkspaceResponse> {
    const user = await this.requireUser();
    const record = await this.requireWorkspace(user.id, id);
    if (record.status === 'Active') {
      throw apiError(400, 'Bad Request', 'El espacio ya está activo.');
    }
    const db = await this.db();
    record.status = 'Active';
    await db.put('workspaces', record);
    const studentCount = await db.countFromIndex('students', 'by-workspace', record.id);
    return toWorkspaceResponse(record, studentCount);
  }

  async regenerateWorkspaceJoinCode(id: string): Promise<JoinCodeResponse> {
    const user = await this.requireUser();
    const record = await this.requireWorkspace(user.id, id);
    const db = await this.db();
    record.joinCode = await this.freeJoinCode();
    await db.put('workspaces', record);
    return { joinCode: record.joinCode };
  }

  // Students

  async getStudents(id: string): Promise<StudentResponse[]> {
    const user = await this.requireUser();
    await this.requireWorkspace(user.id, id);
    const db = await this.db();
    const records = await db.getAllFromIndex('students', 'by-workspace', id);
    return records
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((record) => toStudentResponse(record));
  }

  async createStudent(id: string, body: CreateStudentRequest): Promise<StudentResponse> {
    const user = await this.requireUser();
    await this.requireWorkspace(user.id, id);
    const errors = this.validateStudent(body);
    if (Object.keys(errors).length > 0) throw validationError(errors);
    const email = (body.email ?? '').trim().toLowerCase();
    const db = await this.db();
    const existing = await db.getFromIndex('students', 'by-workspace-email', [id, email]);
    if (existing) {
      throw apiError(409, 'Conflict', 'El correo ya está inscrito en el curso.');
    }
    const record: StudentRecord = {
      id: newId(),
      workspaceId: id,
      name: (body.name ?? '').trim(),
      email,
      createdAt: nowIso(),
    };
    await db.put('students', record);
    return toStudentResponse(record);
  }

  private validateStudent(body: CreateStudentRequest): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    if ((body.name ?? '').trim() === '') addError(errors, 'name', 'El nombre es obligatorio.');
    const email = (body.email ?? '').trim().toLowerCase();
    if (email === '') addError(errors, 'email', 'El correo es obligatorio.');
    else if (!EMAIL_PATTERN.test(email)) addError(errors, 'email', 'Ingresa un correo válido.');
    return errors;
  }

  async createStudentsBulk(id: string, body: CreateStudentsBulkRequest): Promise<CreateStudentsBulkResponse> {
    const user = await this.requireUser();
    await this.requireWorkspace(user.id, id);
    const students = body.students ?? null;
    const errors: Record<string, string[]> = {};
    if (!students || students.length === 0) {
      addError(errors, 'students', 'Incluye al menos un estudiante.');
    } else if (students.length > 100) {
      addError(errors, 'students', 'Máximo 100 estudiantes por carga.');
    } else {
      const seen = new Set<string>();
      students.forEach((student, index) => {
        const entryErrors = this.validateStudent(student);
        for (const [field, messages] of Object.entries(entryErrors)) {
          for (const message of messages) addError(errors, `students[${index}].${field}`, message);
        }
        const email = (student.email ?? '').trim().toLowerCase();
        if (seen.has(email)) {
          addError(errors, `students[${index}].email`, 'El correo se repite en la lista.');
        }
        seen.add(email);
      });
    }
    if (Object.keys(errors).length > 0) throw validationError(errors);
    if (!students) throw validationError({ students: ['Incluye al menos un estudiante.'] });

    const db = await this.db();
    const added: StudentResponse[] = [];
    const alreadyEnrolled: string[] = [];
    const records: StudentRecord[] = [];
    for (const student of students) {
      const email = (student.email ?? '').trim().toLowerCase();
      const existing = await db.getFromIndex('students', 'by-workspace-email', [id, email]);
      if (existing) {
        alreadyEnrolled.push(email);
        continue;
      }
      const record: StudentRecord = {
        id: newId(),
        workspaceId: id,
        name: (student.name ?? '').trim(),
        email,
        createdAt: nowIso(),
      };
      records.push(record);
      added.push(toStudentResponse(record));
    }
    for (const record of records) await db.put('students', record);
    return { added, alreadyEnrolled };
  }

  async getStudentById(id: string, studentId: string): Promise<StudentResponse> {
    const user = await this.requireUser();
    await this.requireWorkspace(user.id, id);
    const student = await this.requireStudent(id, studentId);
    return toStudentResponse(student);
  }

  private async requireStudent(workspaceId: string, studentId: string): Promise<StudentRecord> {
    const db = await this.db();
    const record = await db.get('students', studentId);
    if (!record || record.workspaceId !== workspaceId) throw apiError(404, 'Student not found.');
    return record;
  }

  async updateStudent(id: string, studentId: string, body: UpdateStudentRequest): Promise<StudentResponse> {
    const user = await this.requireUser();
    await this.requireWorkspace(user.id, id);
    const record = await this.requireStudent(id, studentId);
    const errors = this.validateStudent(body);
    if (Object.keys(errors).length > 0) throw validationError(errors);
    const email = (body.email ?? '').trim().toLowerCase();
    const db = await this.db();
    const existing = await db.getFromIndex('students', 'by-workspace-email', [id, email]);
    if (existing && existing.id !== studentId) {
      throw apiError(409, 'Conflict', 'El correo ya está inscrito en el curso.');
    }
    record.name = (body.name ?? '').trim();
    record.email = email;
    await db.put('students', record);
    return toStudentResponse(record);
  }

  async deleteStudent(id: string, studentId: string): Promise<void> {
    const user = await this.requireUser();
    await this.requireWorkspace(user.id, id);
    const record = await this.requireStudent(id, studentId);
    const db = await this.db();
    const submissions = await db.getAll('submissions');
    if (submissions.some((submission) => submission.studentId === studentId)) {
      throw apiError(400, 'Bad Request', 'El estudiante tiene envíos y no puede eliminarse.');
    }
    await db.delete('students', record.id);
  }

  // Join

  async getJoinInfo(joinCode: string): Promise<JoinInfoResponse> {
    const workspace = await this.findJoinableWorkspace(joinCode);
    const db = await this.db();
    const teacher = await db.get('users', workspace.userId);
    return { workspaceName: workspace.name, teacherName: teacher?.name ?? '' };
  }

  async joinWorkspace(body: JoinRequest): Promise<JoinResponse> {
    const workspace = await this.findJoinableWorkspace(body.joinCode ?? '');
    const errors: Record<string, string[]> = {};
    const name = (body.name ?? '').trim();
    const email = (body.email ?? '').trim().toLowerCase();
    if (name === '') addError(errors, 'name', 'El nombre es obligatorio.');
    if (email === '') addError(errors, 'email', 'El correo es obligatorio.');
    else if (!EMAIL_PATTERN.test(email)) addError(errors, 'email', 'Ingresa un correo válido.');
    if (Object.keys(errors).length > 0) throw validationError(errors);

    const db = await this.db();
    const existing = await db.getFromIndex('students', 'by-workspace-email', [workspace.id, email]);
    if (!existing) {
      const record: StudentRecord = {
        id: newId(),
        workspaceId: workspace.id,
        name,
        email,
        createdAt: nowIso(),
      };
      await db.put('students', record);
    }
    return { workspaceName: workspace.name };
  }

  private async findJoinableWorkspace(joinCode: string): Promise<WorkspaceRecord> {
    const code = (joinCode ?? '').trim().toUpperCase();
    const db = await this.db();
    const workspace = code === '' ? undefined : await db.getFromIndex('workspaces', 'by-join-code', code);
    if (!workspace || workspace.status !== 'Active') {
      throw apiError(404, 'Workspace not found.');
    }
    return workspace;
  }

  // AI

  async getAiStatus(): Promise<AiStatusResponse> {
    return { isAiAvailable: false };
  }

  async generateAssessmentDraft(input: GenerateAssessmentDraftInput): Promise<AssessmentDraftResponse> {
    await this.requireUser();
    const errors: Record<string, string[]> = {};
    const topic = (input.topic ?? '').trim();
    if (topic === '') addError(errors, 'topic', 'El tema es obligatorio.');
    else if (topic.length > GENERATOR_LIMITS.topicMax) {
      addError(errors, 'topic', `Máximo ${GENERATOR_LIMITS.topicMax} caracteres.`);
    }

    const level = (input.level ?? '').trim();
    if (level.length > GENERATOR_LIMITS.levelMax) {
      addError(errors, 'level', `Máximo ${GENERATOR_LIMITS.levelMax} caracteres.`);
    }

    const itemCount = input.itemCount ?? GENERATOR_LIMITS.itemCountDefault;
    if (
      !Number.isInteger(itemCount) ||
      itemCount < GENERATOR_LIMITS.itemCountMin ||
      itemCount > GENERATOR_LIMITS.itemCountMax
    ) {
      addError(
        errors,
        'itemCount',
        `Debe estar entre ${GENERATOR_LIMITS.itemCountMin} y ${GENERATOR_LIMITS.itemCountMax}.`,
      );
    }

    if (input.difficulty !== undefined && !isAiDifficulty(input.difficulty)) {
      addError(errors, 'difficulty', 'Usa uno de: Basic, Intermediate, Advanced.');
    }

    const allowedTypes = input.allowedTypes ?? [...ITEM_TYPES];
    if (allowedTypes.length === 0 || allowedTypes.some((type) => !isItemType(type))) {
      addError(errors, 'allowedTypes', 'Incluye al menos un tipo de pregunta válido.');
    }

    const instructions = input.instructions ?? '';
    if (instructions.length > GENERATOR_LIMITS.instructionsMax) {
      addError(errors, 'instructions', `Máximo ${GENERATOR_LIMITS.instructionsMax} caracteres.`);
    }

    const sourceText = input.sourceText ?? '';
    if (sourceText.length > GENERATOR_LIMITS.sourceTextMax) {
      addError(errors, 'sourceText', `Máximo ${GENERATOR_LIMITS.sourceTextMax} caracteres.`);
    }

    const files = input.files ?? [];
    if (files.length > GENERATOR_LIMITS.maxFiles) {
      addError(errors, 'files', `Máximo ${GENERATOR_LIMITS.maxFiles} archivos.`);
    }
    if (Object.keys(errors).length > 0) throw validationError(errors);

    let totalBytes = 0;
    for (const file of files) {
      const extension = extensionOf(file.name);
      if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(extension)) {
        throw apiError(415, 'Unsupported Media Type', `Formato no admitido: ${file.name}.`);
      }
      const limit = isImage(file.name) ? GENERATOR_LIMITS.maxImageBytes : GENERATOR_LIMITS.maxFileBytes;
      if (file.size > limit) {
        throw apiError(413, 'Payload Too Large', `Archivo demasiado pesado: ${file.name}.`);
      }
      totalBytes += file.size;
    }
    if (totalBytes > GENERATOR_LIMITS.maxUploadBytes) {
      throw apiError(413, 'Payload Too Large', 'La carga supera el máximo permitido.');
    }

    return this.buildSampleDraft(input, topic, itemCount, allowedTypes);
  }

  /** Deterministic sample draft: the local demo has no AI behind it. */
  private buildSampleDraft(
    input: GenerateAssessmentDraftInput,
    topic: string,
    itemCount: number,
    allowedTypes: ItemType[],
  ): AssessmentDraftResponse {
    const difficulty: AiDifficulty = input.difficulty ?? 'Intermediate';
    const items: AssessmentDraftItemResponse[] = [];
    for (let index = 0; index < itemCount; index += 1) {
      const type = allowedTypes[index % allowedTypes.length] ?? 'SingleChoice';
      const n = index + 1;
      const base: AssessmentDraftItemResponse = {
        type,
        prompt: DRAFT_PROMPTS[type](n, topic),
        points: 1,
        options: null,
        isTrue: null,
        minWords: null,
        maxWords: null,
        teacherNotes: null,
        assistantEnabled: false,
        studentHint: null,
      };
      if (type === 'SingleChoice' || type === 'MultipleChoice') {
        const correctIndex = index % 4;
        base.options = ['A', 'B', 'C', 'D'].map((key, optionIndex) => ({
          text: `Opción ${key}`,
          isCorrect:
            type === 'SingleChoice'
              ? optionIndex === correctIndex
              : optionIndex === correctIndex || optionIndex === (index + 2) % 4,
        }));
      } else if (type === 'TrueFalse') {
        base.isTrue = index % 2 === 0;
      } else {
        base.minWords = 50;
        base.maxWords = 200;
      }
      items.push(base);
    }

    return {
      title: topic,
      instructions: input.instructions?.trim() || null,
      items,
      notices: [
        'Contenido de ejemplo: la demo local no usa IA, las preguntas son de muestra.',
        `Se generaron ${itemCount} preguntas sobre «${topic}» con dificultad ${difficulty}.`,
      ],
      aiGenerated: false,
    };
  }

  // Assessments

  async getAssessments(query?: GetAssessmentsQuery): Promise<AssessmentSummaryResponse[]> {
    const user = await this.requireUser();
    if (query?.status !== undefined && !isAssessmentStatus(query.status)) {
      throw validationError({ status: ['Usa uno de: Draft, Published, Archived.'] });
    }
    const db = await this.db();
    const records = await db.getAllFromIndex('assessments', 'by-user', user.id);
    const filtered = query?.status ? records.filter((r) => r.status === query.status) : records;
    return Promise.all(filtered.map((record) => this.buildAssessmentSummary(record)));
  }

  private async buildAssessmentSummary(record: AssessmentRecord): Promise<AssessmentSummaryResponse> {
    const items = await this.itemsOf(record.id);
    return {
      id: record.id,
      title: record.title,
      status: record.status,
      itemCount: items.length,
      totalPoints: items.reduce((sum, item) => sum + item.points, 0),
      generatedWithAi: record.generatedWithAi,
      updatedAt: record.updatedAt,
      publishedAt: record.publishedAt,
    };
  }

  private async buildAssessment(record: AssessmentRecord): Promise<AssessmentResponse> {
    const items = await this.itemsOf(record.id);
    return {
      id: record.id,
      title: record.title,
      instructions: record.instructions,
      status: record.status,
      generatedWithAi: record.generatedWithAi,
      itemCount: items.length,
      totalPoints: items.reduce((sum, item) => sum + item.points, 0),
      publishedAt: record.publishedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      items: items.map((item) => toItemResponse(item)),
    };
  }

  async createAssessment(body: CreateAssessmentRequest): Promise<AssessmentResponse> {
    const user = await this.requireUser();
    const title = (body.title ?? '').trim();
    const errors: Record<string, string[]> = {};
    if (title === '') addError(errors, 'title', 'El título es obligatorio.');
    const items = body.items ?? [];
    items.forEach((item, index) => this.validateItemRequest(item, `items[${index}]`, errors));
    if (Object.keys(errors).length > 0) throw validationError(errors);

    const db = await this.db();
    const at = nowIso();
    const record: AssessmentRecord = {
      id: newId(),
      userId: user.id,
      title,
      instructions: body.instructions ?? null,
      status: 'Draft',
      generatedWithAi: body.generatedWithAi ?? false,
      publishedAt: null,
      createdAt: at,
      updatedAt: at,
    };
    await db.put('assessments', record);
    await this.writeItems(record.id, items);
    return this.buildAssessment(record);
  }

  private async writeItems(assessmentId: string, items: AssessmentItemRequest[]): Promise<void> {
    const db = await this.db();
    for (const [index, item] of items.entries()) {
      const record: ItemRecord = {
        id: newId(),
        assessmentId,
        position: index + 1,
        type: (item.type ?? 'SingleChoice') as ItemType,
        prompt: (item.prompt ?? '').trim(),
        points: item.points ?? 0,
        options: toChoiceOptions(item.options),
        isTrue: item.isTrue,
        minWords: item.minWords,
        maxWords: item.maxWords,
        teacherNotes: item.teacherNotes,
        assistantEnabled: item.assistantEnabled ?? false,
        studentHint: item.studentHint,
      };
      await db.put('items', record);
    }
  }

  async getAssessmentById(id: string): Promise<AssessmentResponse> {
    const user = await this.requireUser();
    const record = await this.requireAssessment(user.id, id);
    return this.buildAssessment(record);
  }

  async updateAssessment(id: string, body: UpdateAssessmentRequest): Promise<AssessmentResponse> {
    const user = await this.requireUser();
    const record = await this.requireAssessment(user.id, id);
    if (record.status !== 'Draft') {
      throw apiError(400, 'Bad Request', 'Solo los borradores se pueden editar.');
    }
    const title = (body.title ?? '').trim();
    if (title === '') throw validationError({ title: ['El título es obligatorio.'] });
    const db = await this.db();
    record.title = title;
    record.instructions = body.instructions ?? null;
    record.updatedAt = nowIso();
    await db.put('assessments', record);
    return this.buildAssessment(record);
  }

  async deleteAssessment(id: string): Promise<void> {
    const user = await this.requireUser();
    const record = await this.requireAssessment(user.id, id);
    const db = await this.db();
    if (record.status !== 'Draft') {
      record.status = 'Archived';
      record.updatedAt = nowIso();
      await db.put('assessments', record);
      return;
    }
    const items = await this.itemsOf(record.id);
    for (const item of items) await db.delete('items', item.id);
    await db.delete('assessments', record.id);
  }

  async publishAssessment(id: string): Promise<AssessmentResponse> {
    const user = await this.requireUser();
    const record = await this.requireAssessment(user.id, id);
    if (record.status !== 'Draft') {
      throw apiError(400, 'Bad Request', 'Solo se pueden publicar borradores.');
    }
    const items = await this.itemsOf(record.id);
    if (items.length === 0) {
      throw apiError(400, 'Bad Request', 'La evaluación necesita al menos una pregunta.');
    }
    const db = await this.db();
    const at = nowIso();
    record.status = 'Published';
    record.publishedAt = at;
    record.updatedAt = at;
    await db.put('assessments', record);
    return this.buildAssessment(record);
  }

  async archiveAssessment(id: string): Promise<AssessmentResponse> {
    const user = await this.requireUser();
    const record = await this.requireAssessment(user.id, id);
    if (record.status === 'Archived') {
      throw apiError(400, 'Bad Request', 'La evaluación ya está archivada.');
    }
    const db = await this.db();
    record.status = 'Archived';
    record.updatedAt = nowIso();
    await db.put('assessments', record);
    return this.buildAssessment(record);
  }

  async duplicateAssessment(id: string): Promise<AssessmentResponse> {
    const user = await this.requireUser();
    const record = await this.requireAssessment(user.id, id);
    const items = await this.itemsOf(record.id);
    const db = await this.db();
    const at = nowIso();
    const copy: AssessmentRecord = {
      id: newId(),
      userId: user.id,
      title: `${record.title} (copia)`,
      instructions: record.instructions,
      status: 'Draft',
      generatedWithAi: record.generatedWithAi,
      publishedAt: null,
      createdAt: at,
      updatedAt: at,
    };
    await db.put('assessments', copy);
    for (const item of items) {
      const itemCopy: ItemRecord = { ...item, id: newId(), assessmentId: copy.id };
      await db.put('items', itemCopy);
    }
    return this.buildAssessment(copy);
  }

  async previewAssessment(id: string): Promise<StudentAssessmentResponse> {
    const user = await this.requireUser();
    const record = await this.requireAssessment(user.id, id);
    const items = await this.itemsOf(record.id);
    return {
      id: record.id,
      title: record.title,
      instructions: record.instructions,
      itemCount: items.length,
      totalPoints: items.reduce((sum, item) => sum + item.points, 0),
      items: items.map((item) => toStudentItem(item)),
    };
  }

  // Assessment items

  async createAssessmentItem(id: string, body: AssessmentItemRequest): Promise<AssessmentItemResponse> {
    const user = await this.requireUser();
    const assessment = await this.requireAssessment(user.id, id);
    this.assertEditable(assessment);
    this.assertItemValid(body);
    const db = await this.db();
    const items = await this.itemsOf(id);
    const record: ItemRecord = {
      id: newId(),
      assessmentId: id,
      position: items.length + 1,
      type: (body.type ?? 'SingleChoice') as ItemType,
      prompt: (body.prompt ?? '').trim(),
      points: body.points ?? 0,
      options: toChoiceOptions(body.options),
      isTrue: body.isTrue,
      minWords: body.minWords,
      maxWords: body.maxWords,
      teacherNotes: body.teacherNotes,
      assistantEnabled: body.assistantEnabled ?? false,
      studentHint: body.studentHint,
    };
    await db.put('items', record);
    assessment.updatedAt = nowIso();
    await db.put('assessments', assessment);
    return toItemResponse(record);
  }

  private assertEditable(assessment: AssessmentRecord): void {
    if (assessment.status !== 'Draft') {
      throw apiError(400, 'Bad Request', 'Solo los borradores se pueden editar.');
    }
  }

  async getAssessmentItemById(id: string, itemId: string): Promise<AssessmentItemResponse> {
    const user = await this.requireUser();
    await this.requireAssessment(user.id, id);
    const item = await this.requireItem(id, itemId);
    return toItemResponse(item);
  }

  async updateAssessmentItem(
    id: string,
    itemId: string,
    body: AssessmentItemRequest,
  ): Promise<AssessmentItemResponse> {
    const user = await this.requireUser();
    const assessment = await this.requireAssessment(user.id, id);
    this.assertEditable(assessment);
    this.assertItemValid(body);
    const item = await this.requireItem(id, itemId);
    const db = await this.db();
    item.type = (body.type ?? item.type) as ItemType;
    item.prompt = (body.prompt ?? '').trim();
    item.points = body.points ?? 0;
    item.options = toChoiceOptions(body.options);
    item.isTrue = body.isTrue;
    item.minWords = body.minWords;
    item.maxWords = body.maxWords;
    item.teacherNotes = body.teacherNotes;
    item.assistantEnabled = body.assistantEnabled ?? false;
    item.studentHint = body.studentHint;
    await db.put('items', item);
    assessment.updatedAt = nowIso();
    await db.put('assessments', assessment);
    return toItemResponse(item);
  }

  async deleteAssessmentItem(id: string, itemId: string): Promise<void> {
    const user = await this.requireUser();
    const assessment = await this.requireAssessment(user.id, id);
    this.assertEditable(assessment);
    const item = await this.requireItem(id, itemId);
    const db = await this.db();
    await db.delete('items', item.id);
    const remaining = (await this.itemsOf(id)).filter((entry) => entry.position > item.position);
    for (const entry of remaining) {
      entry.position -= 1;
      await db.put('items', entry);
    }
    assessment.updatedAt = nowIso();
    await db.put('assessments', assessment);
  }

  async reorderAssessmentItems(id: string, body: ReorderItemsRequest): Promise<AssessmentItemResponse[]> {
    const user = await this.requireUser();
    const assessment = await this.requireAssessment(user.id, id);
    this.assertEditable(assessment);
    const items = await this.itemsOf(id);
    const itemIds = body.itemIds ?? null;
    const currentIds = new Set(items.map((item) => item.id));
    const valid =
      itemIds !== null &&
      itemIds.length === items.length &&
      new Set(itemIds).size === items.length &&
      itemIds.every((itemId) => currentIds.has(itemId));
    if (!valid) {
      throw validationError({ itemIds: ['La lista debe incluir cada pregunta exactamente una vez.'] });
    }
    const db = await this.db();
    const order = new Map((itemIds ?? []).map((itemId, index) => [itemId, index]));
    for (const item of items) {
      item.position = (order.get(item.id) ?? 0) + 1;
      await db.put('items', item);
    }
    assessment.updatedAt = nowIso();
    await db.put('assessments', assessment);
    return (await this.itemsOf(id)).map((item) => toItemResponse(item));
  }

  // Assignments

  async getAssignments(query?: GetAssignmentsQuery): Promise<AssignmentSummaryResponse[]> {
    const user = await this.requireUser();
    if (query?.availability !== undefined && !isAvailability(query.availability)) {
      throw validationError({ availability: ['Usa uno de: Scheduled, Open, Closed.'] });
    }
    const db = await this.db();
    const records = await db.getAll('assignments');
    const filtered = records.filter(
      (record) =>
        record.userId === user.id &&
        (query?.workspaceId === undefined || record.workspaceId === query.workspaceId) &&
        (query?.assessmentId === undefined || record.assessmentId === query.assessmentId),
    );
    const summaries = await Promise.all(filtered.map((record) => this.buildAssignmentSummary(record)));
    return query?.availability
      ? summaries.filter((summary) => summary.availability === query.availability)
      : summaries;
  }

  async createAssignment(body: CreateAssignmentRequest): Promise<AssignmentResponse> {
    const user = await this.requireUser();
    const errors: Record<string, string[]> = {};
    const assessmentId = body.assessmentId ?? '';
    const workspaceId = body.workspaceId ?? '';
    if (assessmentId === '') addError(errors, 'assessmentId', 'La evaluación es obligatoria.');
    if (workspaceId === '') addError(errors, 'workspaceId', 'El espacio es obligatorio.');
    if (Object.keys(errors).length > 0) throw validationError(errors);

    const assessment = await this.requireAssessment(user.id, assessmentId);
    if (assessment.status !== 'Published') {
      throw validationError({ assessmentId: ['La evaluación debe estar publicada.'] });
    }
    const workspace = await this.requireWorkspace(user.id, workspaceId);
    if (workspace.status !== 'Active') {
      throw validationError({ workspaceId: ['El espacio debe estar activo.'] });
    }
    const window = this.validateAssignmentWindow(
      body.opensAt,
      body.dueAt,
      body.durationMinutes,
      body.maxHelpLevel,
    );
    const db = await this.db();
    const record: AssignmentRecord = {
      id: newId(),
      userId: user.id,
      assessmentId,
      workspaceId,
      shareToken: await this.freeShareToken(),
      status: 'Open',
      opensAt: window.opensAt,
      dueAt: window.dueAt,
      durationMinutes: window.durationMinutes,
      assistantEnabled: body.assistantEnabled ?? false,
      maxHelpLevel: window.maxHelpLevel,
      assistantInstructions: body.assistantInstructions ?? null,
      resultsVisible: body.resultsVisible ?? false,
      createdAt: nowIso(),
    };
    await db.put('assignments', record);
    return this.buildAssignment(record);
  }

  async getAssignmentById(id: string): Promise<AssignmentResponse> {
    const user = await this.requireUser();
    const assignment = await this.requireAssignment(user.id, id);
    return this.buildAssignment(assignment);
  }

  async updateAssignment(id: string, body: UpdateAssignmentRequest): Promise<AssignmentResponse> {
    const user = await this.requireUser();
    const assignment = await this.requireAssignment(user.id, id);
    const window = this.validateAssignmentWindow(
      body.opensAt ?? assignment.opensAt,
      body.dueAt ?? assignment.dueAt,
      body.durationMinutes ?? assignment.durationMinutes,
      body.maxHelpLevel ?? assignment.maxHelpLevel,
    );
    assignment.opensAt = window.opensAt;
    assignment.dueAt = window.dueAt;
    assignment.durationMinutes = window.durationMinutes;
    assignment.maxHelpLevel = window.maxHelpLevel;
    if (body.assistantEnabled !== null) assignment.assistantEnabled = body.assistantEnabled;
    if (body.assistantInstructions !== null) {
      assignment.assistantInstructions = body.assistantInstructions;
    }
    await (await this.db()).put('assignments', assignment);
    return this.buildAssignment(assignment);
  }

  async deleteAssignment(id: string): Promise<void> {
    const user = await this.requireUser();
    const assignment = await this.requireAssignment(user.id, id);
    const db = await this.db();
    const submissions = await db.countFromIndex('submissions', 'by-assignment', assignment.id);
    if (submissions > 0) {
      throw apiError(400, 'Bad request', 'No se puede eliminar una actividad que ya tiene respuestas.');
    }
    await db.delete('assignments', assignment.id);
  }

  async closeAssignment(id: string): Promise<AssignmentResponse> {
    const user = await this.requireUser();
    const assignment = await this.requireAssignment(user.id, id);
    if (assignment.status === 'Closed') {
      throw apiError(400, 'Bad request', 'La actividad ya está cerrada.');
    }
    assignment.status = 'Closed';
    await (await this.db()).put('assignments', assignment);
    return this.buildAssignment(assignment);
  }

  async reopenAssignment(id: string, body?: ReopenAssignmentRequest | null): Promise<AssignmentResponse> {
    const user = await this.requireUser();
    const assignment = await this.requireAssignment(user.id, id);
    if (assignment.status === 'Open') {
      throw apiError(400, 'Bad request', 'La actividad ya está abierta.');
    }
    const dueAt = body?.dueAt ?? null;
    if (dueAt !== null) {
      if (!isValidIso(dueAt)) {
        throw validationError({ dueAt: ['Ingresa una fecha de cierre válida.'] });
      }
      if (new Date(dueAt).getTime() <= Date.now()) {
        throw validationError({ dueAt: ['La nueva fecha de cierre debe estar en el futuro.'] });
      }
      assignment.dueAt = dueAt;
    }
    assignment.status = 'Open';
    await (await this.db()).put('assignments', assignment);
    return this.buildAssignment(assignment);
  }

  async setAssignmentResultsVisibility(
    id: string,
    body: ResultsVisibilityRequest,
  ): Promise<AssignmentResponse> {
    const user = await this.requireUser();
    const assignment = await this.requireAssignment(user.id, id);
    const visible = body.visible ?? null;
    if (visible === null) {
      throw validationError({ visible: ['Indica si los resultados serán visibles.'] });
    }
    assignment.resultsVisible = visible;
    await (await this.db()).put('assignments', assignment);
    return this.buildAssignment(assignment);
  }

  async regenerateAssignmentShareToken(id: string): Promise<ShareTokenResponse> {
    const user = await this.requireUser();
    const assignment = await this.requireAssignment(user.id, id);
    assignment.shareToken = await this.freeShareToken();
    await (await this.db()).put('assignments', assignment);
    return { shareToken: assignment.shareToken };
  }

  // Public assignments

  async getPublicAssignment(shareToken: string): Promise<PublicAssignmentResponse> {
    const db = await this.db();
    const assignment = await db.getFromIndex('assignments', 'by-share-token', shareToken);
    if (!assignment) throw apiError(404, 'Assignment not found.');
    const assessment = await db.get('assessments', assignment.assessmentId);
    const workspace = await db.get('workspaces', assignment.workspaceId);
    const owner = await db.get('users', assignment.userId);
    const items = await this.itemsOf(assignment.assessmentId);
    return {
      assessmentTitle: assessment?.title ?? '',
      instructions: assessment?.instructions ?? null,
      workspaceName: workspace?.name ?? '',
      teacherName: owner?.name ?? '',
      itemCount: items.length,
      durationMinutes: assignment.durationMinutes,
      opensAt: assignment.opensAt,
      dueAt: assignment.dueAt,
      availability: computeAvailability(assignment, Date.now()),
      metisAvailable: assignment.assistantEnabled,
    };
  }

  // Submissions

  async getAssignmentSubmissions(id: string): Promise<SubmissionRosterResponse[]> {
    const user = await this.requireUser();
    const assignment = await this.requireAssignment(user.id, id);
    const db = await this.db();
    const students = await db.getAllFromIndex('students', 'by-workspace', assignment.workspaceId);
    const submissions = await db.getAllFromIndex('submissions', 'by-assignment', assignment.id);
    const byStudent = new Map(submissions.map((submission) => [submission.studentId, submission] as const));
    const pendingBySubmission = new Map<string, number>();
    for (const submission of submissions) {
      const records = await db.getAllFromIndex('responses', 'by-submission', submission.id);
      pendingBySubmission.set(
        submission.id,
        records.filter((record) => record.gradingStatus === 'PendingReview').length,
      );
    }
    return [...students]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((student) => {
        const submission = byStudent.get(student.id);
        if (!submission) {
          return {
            studentId: student.id,
            studentName: student.name,
            studentEmail: student.email,
            submissionId: null,
            status: 'NotStarted' as const,
            score: null,
            isScoreProvisional: null,
            maxScore: null,
            startedAt: null,
            submittedAt: null,
            deadline: null,
            pendingReviewCount: 0,
            resumeAllowed: false,
          };
        }
        return {
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          submissionId: submission.id,
          status: submission.status,
          score: submission.score,
          isScoreProvisional: submission.isScoreProvisional,
          maxScore: submission.maxScore,
          startedAt: submission.startedAt,
          submittedAt: submission.submittedAt,
          deadline: submission.deadline,
          pendingReviewCount: pendingBySubmission.get(submission.id) ?? 0,
          resumeAllowed: submission.resumeAllowed,
        };
      });
  }

  async getSubmissionById(id: string): Promise<SubmissionDetailResponse> {
    const user = await this.requireUser();
    const submission = await this.requireSubmission(user.id, id);
    return this.buildSubmissionDetail(submission);
  }

  async reviewSubmissionItem(
    id: string,
    itemId: string,
    body: ReviewItemRequest,
  ): Promise<SubmissionDetailResponse> {
    const user = await this.requireUser();
    const submission = await this.requireSubmission(user.id, id);
    if (submission.status === 'InProgress') {
      throw apiError(400, 'Bad request', 'La actividad aún no ha sido enviada.');
    }
    const db = await this.db();
    const assignment = await db.get('assignments', submission.assignmentId);
    const item = await this.requireItem(assignment?.assessmentId ?? '', itemId);
    const score = body.score ?? null;
    const errors: Record<string, string[]> = {};
    if (score === null || !Number.isInteger(score) || score < 0 || score > item.points) {
      addError(errors, 'score', `El puntaje debe ser un entero entre 0 y ${item.points}.`);
    }
    if (Object.keys(errors).length > 0) throw validationError(errors);

    const at = nowIso();
    const record: ResponseRecord = (await this.findResponse(submission.id, itemId)) ?? {
      id: newId(),
      submissionId: submission.id,
      itemId,
      response: null,
      updatedAt: null,
      score: null,
      gradingStatus: null,
      feedback: null,
      gradedAt: null,
    };
    record.score = score;
    record.feedback = body.feedback ?? null;
    record.gradingStatus = 'Reviewed';
    record.gradedAt = at;
    await db.put('responses', record);
    await this.gradeAndRecompute(submission.id, at);
    const updated = (await db.get('submissions', submission.id)) ?? submission;
    return this.buildSubmissionDetail(updated);
  }

  async allowSubmissionResume(id: string): Promise<SubmissionDetailResponse> {
    const user = await this.requireUser();
    const submission = await this.requireSubmission(user.id, id);
    const errors: Record<string, string[]> = {};
    if (submission.status !== 'InProgress') {
      addError(errors, 'status', 'La actividad ya fue enviada.');
    }
    if (submission.resumeAllowed) {
      addError(errors, 'resumeAllowed', 'La reanudación ya está permitida.');
    }
    if (Object.keys(errors).length > 0) throw validationError(errors);
    submission.resumeAllowed = true;
    await (await this.db()).put('submissions', submission);
    return this.buildSubmissionDetail(submission);
  }

  // Public submissions

  async startSubmission(shareToken: string, body: StartSubmissionRequest): Promise<AccessKeyResponse> {
    const db = await this.db();
    const assignment = await db.getFromIndex('assignments', 'by-share-token', shareToken);
    if (!assignment) throw apiError(404, 'Assignment not found.');
    if (computeAvailability(assignment, Date.now()) !== 'Open') {
      throw apiError(403, 'Forbidden', 'La actividad no está disponible en este momento.');
    }
    const email = (body.email ?? '').trim().toLowerCase();
    const errors: Record<string, string[]> = {};
    if (email === '') addError(errors, 'email', 'El correo es obligatorio.');
    else if (!EMAIL_PATTERN.test(email)) addError(errors, 'email', 'Ingresa un correo válido.');
    if (Object.keys(errors).length > 0) throw validationError(errors);

    const student = await db.getFromIndex('students', 'by-workspace-email', [assignment.workspaceId, email]);
    if (!student) {
      throw apiError(404, 'Student not found.', 'No estás inscrito en este espacio.');
    }

    const existing = await db.getFromIndex('submissions', 'by-assignment-student', [
      assignment.id,
      student.id,
    ]);
    if (existing) {
      if (existing.status !== 'InProgress' || !existing.resumeAllowed) {
        throw conflictError(409, 'Conflict', 'alreadyStarted', 'La actividad ya fue iniciada.');
      }
      existing.accessKey = randomToken();
      existing.resumeAllowed = false;
      await db.put('submissions', existing);
      return { accessKey: existing.accessKey };
    }

    const startedAt = nowIso();
    const record: SubmissionRecord = {
      id: newId(),
      assignmentId: assignment.id,
      studentId: student.id,
      accessKey: randomToken(),
      status: 'InProgress',
      startedAt,
      submittedAt: null,
      deadline: new Date(new Date(startedAt).getTime() + assignment.durationMinutes * 60_000).toISOString(),
      score: null,
      isScoreProvisional: false,
      maxScore: null,
      gradedAt: null,
      resumeAllowed: false,
    };
    await db.put('submissions', record);
    return { accessKey: record.accessKey };
  }

  async getPublicSubmission(accessKey: string): Promise<StudentSubmissionResponse> {
    const db = await this.db();
    const submission = await this.findSubmissionByAccessKey(accessKey);
    const assignment = await db.get('assignments', submission.assignmentId);
    const assessment = assignment ? await db.get('assessments', assignment.assessmentId) : undefined;
    const items = assignment ? await this.itemsOf(assignment.assessmentId) : [];
    const records = await db.getAllFromIndex('responses', 'by-submission', submission.id);
    return {
      status: submission.status,
      assessmentTitle: assessment?.title ?? '',
      instructions: assessment?.instructions ?? null,
      items: items.map((item) => ({
        ...toStudentItem(item),
        metisAvailable: (assignment?.assistantEnabled ?? false) && item.assistantEnabled,
      })),
      responses: responseEntries(items, records),
      startedAt: submission.startedAt,
      deadline: submission.deadline,
      serverNow: nowIso(),
      submittedAt: submission.submittedAt,
    };
  }

  async saveSubmissionResponses(
    accessKey: string,
    body: SaveResponsesRequest,
  ): Promise<SaveResponsesResponse> {
    const db = await this.db();
    const submission = await this.findSubmissionByAccessKey(accessKey);
    const now = nowIso();
    if (submission.status !== 'InProgress' || Date.now() > Date.parse(submission.deadline)) {
      throw conflictError(409, 'Conflict', 'submissionClosed', 'El tiempo para responder terminó.');
    }
    const assignment = await db.get('assignments', submission.assignmentId);
    const items = assignment ? await this.itemsOf(assignment.assessmentId) : [];
    const itemById = new Map(items.map((item) => [item.id, item] as const));
    const errors: Record<string, string[]> = {};
    const changes = body.responses ?? [];
    changes.forEach((change, index) => {
      const item = change.itemId === null ? undefined : itemById.get(change.itemId);
      if (!item) {
        addError(errors, `responses[${index}].itemId`, 'La pregunta no existe.');
        return;
      }
      if (change.response !== null) {
        this.validateAnswer(item, change.response, `responses[${index}].response`, errors);
      }
    });
    if (Object.keys(errors).length > 0) throw validationError(errors);

    for (const change of changes) {
      const item = change.itemId === null ? undefined : itemById.get(change.itemId);
      if (!item) continue;
      const existing = await this.findResponse(submission.id, item.id);
      if (change.response === null) {
        if (existing) await db.delete('responses', existing.id);
        continue;
      }
      const record: ResponseRecord = {
        id: existing?.id ?? newId(),
        submissionId: submission.id,
        itemId: item.id,
        response: this.normalizeAnswer(change.response),
        updatedAt: now,
        score: null,
        gradingStatus: null,
        feedback: null,
        gradedAt: null,
      };
      await db.put('responses', record);
    }
    const records = await db.getAllFromIndex('responses', 'by-submission', submission.id);
    return {
      status: submission.status,
      deadline: submission.deadline,
      serverNow: now,
      responses: responseEntries(items, records),
    };
  }

  async submitSubmission(accessKey: string): Promise<SubmitResponse> {
    const db = await this.db();
    const submission = await this.findSubmissionByAccessKey(accessKey);
    if (submission.status === 'InProgress') {
      submission.submittedAt = nowIso();
      await db.put('submissions', submission);
      await this.gradeAndRecompute(submission.id, submission.submittedAt);
    }
    const updated = (await db.get('submissions', submission.id)) ?? submission;
    return { status: updated.status, submittedAt: updated.submittedAt };
  }

  async getSubmissionResult(accessKey: string): Promise<StudentResultResponse> {
    const db = await this.db();
    const submission = await this.findSubmissionByAccessKey(accessKey);
    const assignment = await db.get('assignments', submission.assignmentId);
    const items = assignment ? await this.itemsOf(assignment.assessmentId) : [];
    const records = await db.getAllFromIndex('responses', 'by-submission', submission.id);
    const submitted = submission.status !== 'InProgress';
    const resultsVisible = submitted && (assignment?.resultsVisible ?? false);
    if (!resultsVisible) {
      return {
        status: submission.status,
        submittedAt: submission.submittedAt,
        resultsVisible: false,
        result: null,
      };
    }
    const byItem = new Map(records.map((record) => [record.itemId, record] as const));
    const detailItems: StudentResultItemResponse[] = items.map((item) => {
      const record = byItem.get(item.id);
      return {
        itemId: item.id,
        position: item.position,
        type: item.type,
        prompt: item.prompt,
        points: item.points,
        options: toStudentChoiceOptions(item.options),
        minWords: item.minWords,
        maxWords: item.maxWords,
        response: record?.response ?? null,
        score: record?.score ?? null,
        gradingStatus: record?.gradingStatus ?? null,
        feedback: record?.feedback ?? null,
      };
    });
    const score = submission.score ?? 0;
    const maxScore = submission.maxScore ?? items.reduce((sum, item) => sum + item.points, 0);
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;
    return {
      status: submission.status,
      submittedAt: submission.submittedAt,
      resultsVisible: true,
      result: {
        score,
        maxScore,
        percentage,
        isProvisional: submission.isScoreProvisional,
        items: detailItems,
      },
    };
  }

  private async requireSubmission(userId: string, id: string): Promise<SubmissionRecord> {
    const db = await this.db();
    const submission = await db.get('submissions', id);
    if (!submission) throw apiError(404, 'Submission not found.');
    const assignment = await db.get('assignments', submission.assignmentId);
    if (!assignment || assignment.userId !== userId) {
      throw apiError(404, 'Submission not found.');
    }
    return submission;
  }

  private async findSubmissionByAccessKey(accessKey: string): Promise<SubmissionRecord> {
    const db = await this.db();
    const submission = await db.getFromIndex('submissions', 'by-access-key', accessKey);
    if (!submission) throw apiError(404, 'Submission not found.');
    return submission;
  }

  private validateAssignmentWindow(
    opensAt: string | null,
    dueAt: string | null,
    durationMinutes: number | null,
    maxHelpLevel: number | null,
  ): {
    opensAt: string;
    dueAt: string | null;
    durationMinutes: number;
    maxHelpLevel: number;
  } {
    const errors: Record<string, string[]> = {};
    const start = opensAt;
    const end = dueAt;
    if (start === null || !isValidIso(start)) {
      addError(errors, 'opensAt', 'Ingresa una fecha de inicio válida.');
    }
    if (end !== null && !isValidIso(end)) {
      addError(errors, 'dueAt', 'Ingresa una fecha de cierre válida.');
    }
    if (
      start !== null &&
      end !== null &&
      isValidIso(start) &&
      isValidIso(end) &&
      Date.parse(end) <= Date.parse(start)
    ) {
      addError(errors, 'dueAt', 'El cierre debe ser posterior al inicio.');
    }
    if (durationMinutes === null || !Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      addError(errors, 'durationMinutes', 'La duración debe ser un entero de minutos mayor que cero.');
    }
    if (maxHelpLevel !== null && (!Number.isInteger(maxHelpLevel) || maxHelpLevel < 1 || maxHelpLevel > 3)) {
      addError(errors, 'maxHelpLevel', 'El nivel de ayuda debe ser un entero entre 1 y 3.');
    }
    if (Object.keys(errors).length > 0) throw validationError(errors);
    const validDuration = durationMinutes;
    if (start === null || validDuration === null) {
      throw validationError(errors);
    }
    return {
      opensAt: start,
      dueAt: end,
      durationMinutes: validDuration,
      maxHelpLevel: maxHelpLevel ?? 3,
    };
  }

  private async freeShareToken(): Promise<string> {
    const db = await this.db();
    for (;;) {
      const token = randomToken();
      const existing = await db.getFromIndex('assignments', 'by-share-token', token);
      if (!existing) return token;
    }
  }
}

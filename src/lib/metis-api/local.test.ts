/*
 * LocalMetisApi behavior tests: the local implementation must fail the way metis-api does, so the UI can
 * rely on the same error handling in both modes. The suite covers auth persistence, per-user scoping,
 * roster and bulk rules, publish rules, availability computation, the submission lifecycle (start,
 * resume, save, submit, review, results visibility) and the deterministic sample AI draft, plus the
 * HttpMetisApi stubs and the createMetisApi() factory.
 */

import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openMetisDb, STORE_NAMES } from './db';
import { fieldErrorsOf, MetisApiError, NotImplementedError } from './errors';
import { HttpMetisApi } from './http';
import { createMetisApi } from './index';
import { LocalMetisApi } from './local';
import type { WorkspaceStatus } from './constants';
import type {
  AnswerRequest,
  AssessmentItemRequest,
  AssessmentResponse,
  AssignmentResponse,
  CreateAssessmentRequest,
  CreateAssignmentRequest,
  ProblemDetails,
} from './types';

let api: LocalMetisApi;

beforeEach(async () => {
  const db = await openMetisDb();
  for (const store of STORE_NAMES) await db.clear(store);
  localStorage.clear();
  api = new LocalMetisApi();
});

async function expectMetisError(action: Promise<unknown>, status: number): Promise<MetisApiError> {
  try {
    await action;
  } catch (error) {
    expect(error).toBeInstanceOf(MetisApiError);
    const apiError = error as MetisApiError;
    expect(apiError.status).toBe(status);
    return apiError;
  }
  throw new Error(`Expected a MetisApiError with status ${status}, but the call resolved.`);
}

function conflictCode(error: MetisApiError): string | undefined {
  return (error.body as ProblemDetails & { code?: string }).code;
}

const pastIso = (): string => new Date(Date.now() - 3_600_000).toISOString();
const futureIso = (ms = 3_600_000): string => new Date(Date.now() + ms).toISOString();

function answer(partial: Partial<AnswerRequest>): AnswerRequest {
  return { selectedKey: null, selectedKeys: null, value: null, text: null, ...partial };
}

function singleChoiceItem(overrides: Partial<AssessmentItemRequest> = {}): AssessmentItemRequest {
  return {
    type: 'SingleChoice',
    prompt: 'Elige la alternativa correcta.',
    points: 2,
    options: [
      { text: 'Alternativa A', isCorrect: true },
      { text: 'Alternativa B', isCorrect: false },
    ],
    isTrue: null,
    minWords: null,
    maxWords: null,
    teacherNotes: null,
    assistantEnabled: false,
    studentHint: null,
    ...overrides,
  };
}

function multipleChoiceItem(overrides: Partial<AssessmentItemRequest> = {}): AssessmentItemRequest {
  return {
    type: 'MultipleChoice',
    prompt: 'Elige todas las alternativas correctas.',
    points: 3,
    options: [
      { text: 'Alternativa A', isCorrect: true },
      { text: 'Alternativa B', isCorrect: true },
      { text: 'Alternativa C', isCorrect: false },
    ],
    isTrue: null,
    minWords: null,
    maxWords: null,
    teacherNotes: null,
    assistantEnabled: false,
    studentHint: null,
    ...overrides,
  };
}

function trueFalseItem(overrides: Partial<AssessmentItemRequest> = {}): AssessmentItemRequest {
  return {
    type: 'TrueFalse',
    prompt: 'Indica si la afirmación es verdadera o falsa.',
    points: 1,
    options: null,
    isTrue: true,
    minWords: null,
    maxWords: null,
    teacherNotes: null,
    assistantEnabled: false,
    studentHint: null,
    ...overrides,
  };
}

function essayItem(overrides: Partial<AssessmentItemRequest> = {}): AssessmentItemRequest {
  return {
    type: 'Essay',
    prompt: 'Desarrolla por escrito tu respuesta.',
    points: 4,
    options: null,
    isTrue: null,
    minWords: 10,
    maxWords: 100,
    teacherNotes: null,
    assistantEnabled: false,
    studentHint: null,
    ...overrides,
  };
}

function assignmentBody(
  assessmentId: string,
  workspaceId: string,
  overrides: Partial<CreateAssignmentRequest> = {},
): CreateAssignmentRequest {
  return {
    assessmentId,
    workspaceId,
    opensAt: pastIso(),
    dueAt: futureIso(),
    durationMinutes: 30,
    assistantEnabled: false,
    maxHelpLevel: 3,
    assistantInstructions: null,
    resultsVisible: false,
    ...overrides,
  };
}

async function seedPublishedAssessment(items: AssessmentItemRequest[]): Promise<AssessmentResponse> {
  const draft = await api.createAssessment({
    title: 'Prueba de historia',
    instructions: null,
    generatedWithAi: false,
    items,
  } satisfies CreateAssessmentRequest);
  return api.publishAssessment(draft.id);
}

describe('auth', () => {
  it('registers a user and persists the current user across instances', async () => {
    const tokens = await api.register({ name: 'Ana Pérez', email: 'ana@mail.cl', password: 'secret' });
    expect(tokens.tokenType).toBe('Bearer');
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.expiresIn).toBe(3600);

    // A fresh instance simulates a page reload: the token lives in localStorage.
    const reloaded = new LocalMetisApi();
    const user = await reloaded.getCurrentUser();
    expect(user.name).toBe('Ana Pérez');
    expect(user.email).toBe('ana@mail.cl');
  });

  it('rejects a duplicate registration with 409 and validates fields with 400', async () => {
    await api.register({ name: 'Ana', email: 'ana@mail.cl', password: 'secret' });
    await expectMetisError(api.register({ name: 'Otra Ana', email: 'ana@mail.cl', password: 'otra' }), 409);

    const error = await expectMetisError(
      api.register({ name: '', email: 'no-es-correo', password: '' }),
      400,
    );
    const errors = fieldErrorsOf(error);
    expect(errors.name).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });

  it('rejects wrong credentials with 401 and requires a session for instructor calls', async () => {
    await api.register({ name: 'Ana', email: 'ana@mail.cl', password: 'secret' });
    await expectMetisError(api.login({ email: 'ana@mail.cl', password: 'mala' }), 401);
    await expectMetisError(api.login({ email: 'nadie@mail.cl', password: 'secret' }), 401);

    localStorage.clear();
    await expectMetisError(api.getCurrentUser(), 401);
    await expectMetisError(api.createWorkspace({ name: 'Curso' }), 401);
  });
});

describe('ownership scoping', () => {
  it('answers 404 for resources that belong to another user', async () => {
    await api.register({ name: 'Ana', email: 'ana@mail.cl', password: 'secret' });
    const workspace = await api.createWorkspace({ name: 'Curso de Ana' });
    const assessment = await seedPublishedAssessment([singleChoiceItem()]);

    await api.register({ name: 'Beto', email: 'beto@mail.cl', password: 'secret' });
    await expectMetisError(api.getWorkspaceById(workspace.id), 404);
    await expectMetisError(api.getAssessmentById(assessment.id), 404);
    await expectMetisError(api.getStudents(workspace.id), 404);
  });

  it('answers 404 for unknown ids', async () => {
    await api.register({ name: 'Ana', email: 'ana@mail.cl', password: 'secret' });
    await expectMetisError(api.getWorkspaceById('no-existe'), 404);
    await expectMetisError(api.getSubmissionById('no-existe'), 404);
  });
});

describe('workspaces', () => {
  beforeEach(async () => {
    await api.register({ name: 'Ana', email: 'ana@mail.cl', password: 'secret' });
  });

  it('validates the name and the status query filter', async () => {
    await expectMetisError(api.createWorkspace({ name: '   ' }), 400);
    const error = await expectMetisError(api.getWorkspaces({ status: 'NoExiste' as WorkspaceStatus }), 400);
    expect(fieldErrorsOf(error).status).toBeDefined();
  });

  it('filters by status and archives instead of deleting when the workspace has assignments', async () => {
    const assessment = await seedPublishedAssessment([singleChoiceItem()]);
    const workspace = await api.createWorkspace({ name: 'Curso' });
    await api.createAssignment(assignmentBody(assessment.id, workspace.id));

    await api.deleteWorkspace(workspace.id);
    const kept = await api.getWorkspaceById(workspace.id);
    expect(kept.status).toBe('Archived');

    const active = await api.getWorkspaces({ status: 'Active' });
    const archived = await api.getWorkspaces({ status: 'Archived' });
    expect(active).toHaveLength(0);
    expect(archived.map((entry) => entry.id)).toEqual([workspace.id]);
  });

  it('computes the join code and lets students join by code', async () => {
    const workspace = await api.createWorkspace({ name: 'Curso' });
    expect(workspace.joinCode).toHaveLength(8);

    const info = await api.getJoinInfo(workspace.joinCode.toLowerCase());
    expect(info.workspaceName).toBe('Curso');
    expect(info.teacherName).toBe('Ana');

    // Joining enrolls unknown emails into the roster; repeating it is idempotent.
    await api.joinWorkspace({ joinCode: workspace.joinCode, name: 'Caro', email: 'caro@mail.cl' });
    await api.joinWorkspace({ joinCode: workspace.joinCode, name: 'Caro Ruiz', email: 'caro@mail.cl' });
    const students = await api.getStudents(workspace.id);
    expect(students).toHaveLength(1);
    expect(students[0]?.email).toBe('caro@mail.cl');

    await expectMetisError(api.getJoinInfo('CODIGO99'), 404);
  });
});

describe('students roster', () => {
  let workspaceId: string;

  beforeEach(async () => {
    await api.register({ name: 'Ana', email: 'ana@mail.cl', password: 'secret' });
    const workspace = await api.createWorkspace({ name: 'Curso' });
    workspaceId = workspace.id;
  });

  it('rejects duplicate emails in the roster with 409', async () => {
    await api.createStudent(workspaceId, { name: 'Ana Soto', email: 'soto@mail.cl' });
    await expectMetisError(api.createStudent(workspaceId, { name: 'Otra', email: 'SOTO@mail.cl' }), 409);
  });

  it('adds new students in bulk and reports the already enrolled ones', async () => {
    await api.createStudent(workspaceId, { name: 'Vieja', email: 'vieja@mail.cl' });
    const result = await api.createStudentsBulk(workspaceId, {
      students: [
        { name: 'Nueva Uno', email: 'uno@mail.cl' },
        { name: 'Vieja Dos', email: 'vieja@mail.cl' },
        { name: 'Nueva Dos', email: 'dos@mail.cl' },
      ],
    });
    expect(result.added.map((student) => student.email)).toEqual(['uno@mail.cl', 'dos@mail.cl']);
    expect(result.alreadyEnrolled).toEqual(['vieja@mail.cl']);
  });

  it('validates every bulk entry and rejects duplicates inside the payload', async () => {
    const error = await expectMetisError(
      api.createStudentsBulk(workspaceId, {
        students: [
          { name: 'Buena', email: 'buena@mail.cl' },
          { name: '   ', email: 'repetida@mail.cl' },
          { name: 'Repetida', email: 'repetida@mail.cl' },
        ],
      }),
      400,
    );
    const errors = fieldErrorsOf(error);
    expect(errors['students[1].name']).toBeDefined();
    expect(errors['students[2].email']).toBeDefined();

    await expectMetisError(api.createStudentsBulk(workspaceId, { students: null }), 400);
    const tooMany = Array.from({ length: 101 }, (_, index) => ({
      name: `Estudiante ${index}`,
      email: `e${index}@mail.cl`,
    }));
    const sizeError = await expectMetisError(api.createStudentsBulk(workspaceId, { students: tooMany }), 400);
    expect(fieldErrorsOf(sizeError).students).toBeDefined();
  });

  it('refuses to delete a student that has submissions', async () => {
    const student = await api.createStudent(workspaceId, { name: 'Ana Soto', email: 'soto@mail.cl' });
    const assessment = await seedPublishedAssessment([singleChoiceItem()]);
    const assignment = await api.createAssignment(assignmentBody(assessment.id, workspaceId));
    await api.startSubmission(assignment.shareToken, { email: 'soto@mail.cl' });

    await expectMetisError(api.deleteStudent(workspaceId, student.id), 400);
  });
});

describe('assessments', () => {
  beforeEach(async () => {
    await api.register({ name: 'Ana', email: 'ana@mail.cl', password: 'secret' });
  });

  it('validates items on creation with per-field errors', async () => {
    const error = await expectMetisError(
      api.createAssessment({
        title: '',
        instructions: null,
        generatedWithAi: false,
        items: [singleChoiceItem({ prompt: '' })],
      }),
      400,
    );
    const errors = fieldErrorsOf(error);
    expect(errors.title).toBeDefined();
    expect(errors['items[0].prompt']).toBeDefined();

    const optionsError = await expectMetisError(
      api.createAssessment({
        title: 'Con opciones malas',
        instructions: null,
        generatedWithAi: false,
        items: [
          singleChoiceItem({
            options: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: true },
            ],
          }),
        ],
      }),
      400,
    );
    expect(fieldErrorsOf(optionsError)['items[0].options']).toBeDefined();
  });

  it('only publishes drafts that have items', async () => {
    const empty = await api.createAssessment({
      title: 'Vacía',
      instructions: null,
      generatedWithAi: false,
      items: [],
    });
    await expectMetisError(api.publishAssessment(empty.id), 400);

    const assessment = await seedPublishedAssessment([singleChoiceItem()]);
    expect(assessment.status).toBe('Published');
    expect(assessment.publishedAt).toBeTruthy();
    await expectMetisError(api.publishAssessment(assessment.id), 400);
    await expectMetisError(
      api.updateAssessment(assessment.id, { title: 'Nuevo título', instructions: null }),
      400,
    );
  });

  it('duplicates an assessment as a fresh draft and validates status filters', async () => {
    const assessment = await seedPublishedAssessment([singleChoiceItem(), essayItem()]);
    const copy = await api.duplicateAssessment(assessment.id);
    expect(copy.title).toBe('Prueba de historia (copia)');
    expect(copy.status).toBe('Draft');
    expect(copy.items).toHaveLength(2);

    const error = await expectMetisError(
      api.getAssessments({ status: 'NoExiste' as AssessmentResponse['status'] }),
      400,
    );
    expect(fieldErrorsOf(error).status).toBeDefined();
  });
});

describe('assignments', () => {
  let workspaceId: string;
  let assessment: AssessmentResponse;

  beforeEach(async () => {
    await api.register({ name: 'Ana', email: 'ana@mail.cl', password: 'secret' });
    const workspace = await api.createWorkspace({ name: 'Curso' });
    workspaceId = workspace.id;
    assessment = await seedPublishedAssessment([singleChoiceItem()]);
  });

  it('requires a published assessment and an active workspace', async () => {
    const draft = await api.createAssessment({
      title: 'Borrador',
      instructions: null,
      generatedWithAi: false,
      items: [singleChoiceItem()],
    });
    const draftError = await expectMetisError(
      api.createAssignment(assignmentBody(draft.id, workspaceId)),
      400,
    );
    expect(fieldErrorsOf(draftError).assessmentId).toBeDefined();

    const archived = await api.createWorkspace({ name: 'Archivado' });
    await api.archiveWorkspace(archived.id);
    const workspaceError = await expectMetisError(
      api.createAssignment(assignmentBody(assessment.id, archived.id)),
      400,
    );
    expect(fieldErrorsOf(workspaceError).workspaceId).toBeDefined();
  });

  it('validates the assignment window', async () => {
    const bad = await expectMetisError(
      api.createAssignment(
        assignmentBody(assessment.id, workspaceId, {
          opensAt: futureIso(),
          dueAt: pastIso(),
          durationMinutes: 0,
          maxHelpLevel: 9,
        }),
      ),
      400,
    );
    const errors = fieldErrorsOf(bad);
    expect(errors.dueAt).toBeDefined();
    expect(errors.durationMinutes).toBeDefined();
    expect(errors.maxHelpLevel).toBeDefined();
  });

  it('computes availability from the window and the Open/Closed state', async () => {
    const scheduled = await api.createAssignment(
      assignmentBody(assessment.id, workspaceId, {
        opensAt: futureIso(),
        dueAt: new Date(Date.now() + 7_200_000).toISOString(),
      }),
    );
    expect(scheduled.availability).toBe('Scheduled');

    const expired = await api.createAssignment(
      assignmentBody(assessment.id, workspaceId, {
        opensAt: new Date(Date.now() - 7_200_000).toISOString(),
        dueAt: pastIso(),
      }),
    );
    expect(expired.availability).toBe('Closed');

    const open = await api.createAssignment(assignmentBody(assessment.id, workspaceId));
    expect(open.availability).toBe('Open');
    expect(open.status).toBe('Open');

    const closed = await api.closeAssignment(open.id);
    expect(closed.availability).toBe('Closed');
    await expectMetisError(api.closeAssignment(open.id), 400);
    const reopened = await api.reopenAssignment(open.id);
    expect(reopened.availability).toBe('Open');
    await expectMetisError(api.reopenAssignment(open.id), 400);
    await expectMetisError(api.reopenAssignment(expired.id, { dueAt: pastIso() }), 400);

    const openList = await api.getAssignments({ availability: 'Open' });
    expect(openList.map((entry) => entry.id)).toEqual([reopened.id]);
  });

  it('manages the share token and the results visibility', async () => {
    const assignment = await api.createAssignment(assignmentBody(assessment.id, workspaceId));
    const token = await api.regenerateAssignmentShareToken(assignment.id);
    expect(token.shareToken).not.toBe(assignment.shareToken);

    const visibilityError = await expectMetisError(
      api.setAssignmentResultsVisibility(assignment.id, { visible: null }),
      400,
    );
    expect(fieldErrorsOf(visibilityError).visible).toBeDefined();

    const hidden = await api.setAssignmentResultsVisibility(assignment.id, { visible: false });
    expect(hidden.resultsVisible).toBe(false);
  });

  it('exposes the public assignment view and 404s unknown tokens', async () => {
    const assignment = await api.createAssignment(
      assignmentBody(assessment.id, workspaceId, { assistantEnabled: true }),
    );
    await expectMetisError(api.getPublicAssignment('token-desconocido'), 404);

    const publicView = await api.getPublicAssignment(assignment.shareToken);
    expect(publicView.assessmentTitle).toBe('Prueba de historia');
    expect(publicView.teacherName).toBe('Ana');
    expect(publicView.availability).toBe('Open');
    expect(publicView.metisAvailable).toBe(true);
    expect(publicView.itemCount).toBe(1);
  });
});

describe('submission lifecycle', () => {
  let workspaceId: string;
  let assessment: AssessmentResponse;
  let assignment: AssignmentResponse;

  beforeEach(async () => {
    await api.register({ name: 'Ana Pérez', email: 'ana@mail.cl', password: 'secret' });
    const workspace = await api.createWorkspace({ name: 'Curso' });
    workspaceId = workspace.id;
    await api.createStudentsBulk(workspaceId, {
      students: [
        { name: 'Ana Soto', email: 'soto@mail.cl' },
        { name: 'Bea Rojas', email: 'bea@mail.cl' },
        { name: 'Cee Muñoz', email: 'cee@mail.cl' },
      ],
    });
    assessment = await seedPublishedAssessment([
      singleChoiceItem(),
      multipleChoiceItem(),
      trueFalseItem(),
      essayItem(),
    ]);
    assignment = await api.createAssignment(assignmentBody(assessment.id, workspaceId));
  });

  it('guards the start of a submission', async () => {
    await expectMetisError(api.startSubmission('token-falso', { email: 'soto@mail.cl' }), 404);

    const scheduled = await api.createAssignment(
      assignmentBody(assessment.id, workspaceId, {
        opensAt: futureIso(),
        dueAt: futureIso(7_200_000),
      }),
    );
    await expectMetisError(api.startSubmission(scheduled.shareToken, { email: 'soto@mail.cl' }), 403);

    await expectMetisError(api.startSubmission(assignment.shareToken, { email: 'no-es-correo' }), 400);
    await expectMetisError(api.startSubmission(assignment.shareToken, { email: 'fuera@mail.cl' }), 404);
  });

  it('grades auto-graded items, keeps essays pending and computes the result', async () => {
    const start = await api.startSubmission(assignment.shareToken, { email: 'soto@mail.cl' });
    const items = assessment.items;

    // The instructor cannot review an item before the student submits.
    await expectMetisError(api.getSubmissionById('no-existe'), 404);
    const rosterBefore = await api.getAssignmentSubmissions(assignment.id);
    const anaRow = rosterBefore.find((row) => row.studentEmail === 'soto@mail.cl');
    expect(anaRow?.status).toBe('InProgress');
    await expectMetisError(
      api.reviewSubmissionItem(anaRow?.submissionId ?? '', items[3]?.id ?? '', {
        score: 1,
        feedback: null,
      }),
      400,
    );

    const invalid = await expectMetisError(
      api.saveSubmissionResponses(start.accessKey, {
        responses: [{ itemId: items[0]?.id ?? null, response: answer({ selectedKey: 'Z' }) }],
      }),
      400,
    );
    expect(fieldErrorsOf(invalid)['responses[0].response']).toBeDefined();

    const saved = await api.saveSubmissionResponses(start.accessKey, {
      responses: [
        { itemId: items[0]?.id ?? null, response: answer({ selectedKey: 'A' }) },
        { itemId: items[1]?.id ?? null, response: answer({ selectedKeys: ['A', 'B'] }) },
        { itemId: items[2]?.id ?? null, response: answer({ value: true }) },
        {
          itemId: items[3]?.id ?? null,
          response: answer({ text: 'Un ensayo de ejemplo con suficientes palabras.' }),
        },
      ],
    });
    expect(saved.responses).toHaveLength(4);

    const submitted = await api.submitSubmission(start.accessKey);
    expect(submitted.status).toBe('Submitted');
    expect(submitted.submittedAt).toBeTruthy();
    // Submitting twice is idempotent.
    expect(await api.submitSubmission(start.accessKey)).toEqual(submitted);

    // Once submitted the window is closed.
    const closed = await expectMetisError(
      api.saveSubmissionResponses(start.accessKey, { responses: [] }),
      409,
    );
    expect(conflictCode(closed)).toBe('submissionClosed');

    // The roster shows one row per student, including those who never started.
    const roster = await api.getAssignmentSubmissions(assignment.id);
    expect(roster.map((row) => row.studentName)).toEqual(['Ana Soto', 'Bea Rojas', 'Cee Muñoz']);
    expect(roster[0]?.status).toBe('Submitted');
    expect(roster[0]?.pendingReviewCount).toBe(1);
    expect(roster[2]?.status).toBe('NotStarted');
    expect(roster[2]?.submissionId).toBeNull();

    // Reviewing the essay resolves the provisional score.
    const essayId = items[3]?.id ?? '';
    const reviewError = await expectMetisError(
      api.reviewSubmissionItem(roster[0]?.submissionId ?? '', essayId, { score: 99, feedback: null }),
      400,
    );
    expect(fieldErrorsOf(reviewError).score).toBeDefined();

    const detail = await api.reviewSubmissionItem(roster[0]?.submissionId ?? '', essayId, {
      score: 3,
      feedback: 'Buen argumento.',
    });
    expect(detail.status).toBe('Graded');
    expect(detail.score).toBe(9);
    expect(detail.maxScore).toBe(10);
    expect(detail.isScoreProvisional).toBe(false);
    expect(detail.pendingReviewCount).toBe(0);

    // Results stay hidden until the teacher turns them on.
    const hidden = await api.getSubmissionResult(start.accessKey);
    expect(hidden.resultsVisible).toBe(false);
    expect(hidden.result).toBeNull();

    await api.setAssignmentResultsVisibility(assignment.id, { visible: true });
    const result = await api.getSubmissionResult(start.accessKey);
    expect(result.resultsVisible).toBe(true);
    expect(result.result?.score).toBe(9);
    expect(result.result?.maxScore).toBe(10);
    expect(result.result?.percentage).toBe(90);
    expect(result.result?.isProvisional).toBe(false);

    // Another user cannot read the submission.
    await api.register({ name: 'Beto', email: 'beto@mail.cl', password: 'secret' });
    await expectMetisError(api.getSubmissionById(roster[0]?.submissionId ?? ''), 404);
  });

  it('lets the teacher reopen a submission once and reissues the access key', async () => {
    const first = await api.startSubmission(assignment.shareToken, { email: 'bea@mail.cl' });

    // A second start is refused while the attempt is in progress.
    const conflict = await expectMetisError(
      api.startSubmission(assignment.shareToken, { email: 'bea@mail.cl' }),
      409,
    );
    expect(conflictCode(conflict)).toBe('alreadyStarted');

    const roster = await api.getAssignmentSubmissions(assignment.id);
    const beaRow = roster.find((row) => row.studentEmail === 'bea@mail.cl');
    const allowed = await api.allowSubmissionResume(beaRow?.submissionId ?? '');
    expect(allowed.resumeAllowed).toBe(true);

    const resumed = await api.startSubmission(assignment.shareToken, { email: 'bea@mail.cl' });
    expect(resumed.accessKey).not.toBe(first.accessKey);

    // The resume is single-use: without another allowance it is a conflict again.
    const again = await expectMetisError(
      api.startSubmission(assignment.shareToken, { email: 'bea@mail.cl' }),
      409,
    );
    expect(conflictCode(again)).toBe('alreadyStarted');

    // A blank submission is graded immediately with zero points.
    const submitted = await api.submitSubmission(resumed.accessKey);
    expect(submitted.status).toBe('Graded');

    await api.setAssignmentResultsVisibility(assignment.id, { visible: true });
    const result = await api.getSubmissionResult(resumed.accessKey);
    expect(result.result?.score).toBe(0);
    expect(result.result?.percentage).toBe(0);

    await expectMetisError(api.allowSubmissionResume(beaRow?.submissionId ?? ''), 400);
  });

  it('refuses to delete assignments and students that already have submissions', async () => {
    await api.startSubmission(assignment.shareToken, { email: 'cee@mail.cl' });
    await expectMetisError(api.deleteAssignment(assignment.id), 400);
    const roster = await api.getAssignmentSubmissions(assignment.id);
    const cee = roster.find((row) => row.studentEmail === 'cee@mail.cl');
    await expectMetisError(api.deleteStudent(workspaceId, cee?.studentId ?? ''), 400);
  });
});

describe('AI draft', () => {
  beforeEach(async () => {
    await api.register({ name: 'Ana', email: 'ana@mail.cl', password: 'secret' });
  });

  it('reports that AI is unavailable', async () => {
    await expect(api.getAiStatus()).resolves.toEqual({ isAiAvailable: false });
  });

  it('returns a deterministic sample draft marked as not AI generated', async () => {
    const input = {
      topic: 'Fracciones',
      level: 'Octavo básico',
      itemCount: 3,
      difficulty: 'Basic' as const,
      allowedTypes: ['SingleChoice' as const, 'Essay' as const],
      instructions: 'Usa ejemplos simples.',
    };
    const draft = await api.generateAssessmentDraft(input);
    expect(draft.aiGenerated).toBe(false);
    expect(draft.title).toBe('Fracciones');
    expect(draft.items).toHaveLength(3);
    expect(draft.items.map((item) => item.type)).toEqual(['SingleChoice', 'Essay', 'SingleChoice']);
    expect(draft.items[0]?.prompt).toContain('Fracciones');
    expect(draft.notices.some((notice) => notice.includes('Contenido de ejemplo'))).toBe(true);

    // The same input always produces the same draft.
    await expect(api.generateAssessmentDraft(input)).resolves.toEqual(draft);
  });

  it('validates the input and the uploaded files', async () => {
    const empty = await expectMetisError(api.generateAssessmentDraft({ topic: '   ' }), 400);
    expect(fieldErrorsOf(empty).topic).toBeDefined();

    const count = await expectMetisError(api.generateAssessmentDraft({ topic: 'Tema', itemCount: 0 }), 400);
    expect(fieldErrorsOf(count).itemCount).toBeDefined();

    await expectMetisError(
      api.generateAssessmentDraft({
        topic: 'Tema',
        difficulty: 'Imposible' as 'Basic',
      }),
      400,
    );

    await expectMetisError(
      api.generateAssessmentDraft({
        topic: 'Tema',
        files: [new File(['x'], 'virus.exe')],
      }),
      415,
    );

    await expectMetisError(
      api.generateAssessmentDraft({
        topic: 'Tema',
        files: [new File([new Uint8Array(6 * 1024 * 1024)], 'grande.png')],
      }),
      413,
    );
  });

  it('requires a session to generate a draft', async () => {
    localStorage.clear();
    await expectMetisError(api.generateAssessmentDraft({ topic: 'Tema' }), 401);
  });
});

describe('HttpMetisApi and createMetisApi', () => {
  const originalIsProd = process.env.NEXT_PUBLIC_IS_PROD;

  afterEach(() => {
    if (originalIsProd === undefined) delete process.env.NEXT_PUBLIC_IS_PROD;
    else process.env.NEXT_PUBLIC_IS_PROD = originalIsProd;
  });

  it('throws NotImplementedError naming the operation', () => {
    const http = new HttpMetisApi();
    expect(() => http.getCurrentUser()).toThrow(NotImplementedError);
    expect(() => http.login({ email: 'a@mail.cl', password: 'x' })).toThrow('HttpMetisApi.login');
  });

  it('routes to LocalMetisApi unless NEXT_PUBLIC_IS_PROD is exactly "true"', () => {
    delete process.env.NEXT_PUBLIC_IS_PROD;
    expect(createMetisApi()).toBeInstanceOf(LocalMetisApi);
    process.env.NEXT_PUBLIC_IS_PROD = 'false';
    expect(createMetisApi()).toBeInstanceOf(LocalMetisApi);
  });

  it('routes to HttpMetisApi in production', () => {
    process.env.NEXT_PUBLIC_IS_PROD = 'true';
    expect(createMetisApi()).toBeInstanceOf(HttpMetisApi);
  });
});

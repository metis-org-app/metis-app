import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import type { AnswerResponse, ChoiceOptionResponse } from './types';
import type {
  AssessmentStatus,
  AssignmentStatus,
  GradingStatus,
  ItemType,
  SubmissionStatus,
  WorkspaceStatus,
} from './constants';

export const DB_NAME = 'metis-demo';
export const DB_VERSION = 1;

/** Where the fake bearer token of the signed-in demo user is kept between reloads. */
export const TOKEN_STORAGE_KEY = 'metis-demo-token';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface OrganizationRecord {
  id: string;
  userId: string;
  name: string;
}

export interface WorkspaceRecord {
  id: string;
  userId: string;
  name: string;
  joinCode: string;
  status: WorkspaceStatus;
  createdAt: string;
}

export interface StudentRecord {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AssessmentRecord {
  id: string;
  userId: string;
  title: string;
  instructions: string | null;
  status: AssessmentStatus;
  generatedWithAi: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItemRecord {
  id: string;
  assessmentId: string;
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

export interface AssignmentRecord {
  id: string;
  userId: string;
  assessmentId: string;
  workspaceId: string;
  shareToken: string;
  status: AssignmentStatus;
  opensAt: string;
  dueAt: string | null;
  durationMinutes: number;
  assistantEnabled: boolean;
  maxHelpLevel: number;
  assistantInstructions: string | null;
  resultsVisible: boolean;
  createdAt: string;
}

export interface SubmissionRecord {
  id: string;
  assignmentId: string;
  studentId: string;
  accessKey: string;
  status: SubmissionStatus;
  startedAt: string;
  submittedAt: string | null;
  deadline: string;
  score: number | null;
  isScoreProvisional: boolean;
  maxScore: number | null;
  gradedAt: string | null;
  resumeAllowed: boolean;
}

/**
 * The state of one item inside one submission: the saved answer plus its grading. Rows exist only for
 * items the student answered or that have been graded.
 */
export interface ResponseRecord {
  id: string;
  submissionId: string;
  itemId: string;
  response: AnswerResponse | null;
  updatedAt: string | null;
  score: number | null;
  gradingStatus: GradingStatus | null;
  feedback: string | null;
  gradedAt: string | null;
}

export interface MetisDbSchema extends DBSchema {
  users: {
    key: string;
    value: UserRecord;
    indexes: { 'by-email': string };
  };
  organizations: {
    key: string;
    value: OrganizationRecord;
    indexes: { 'by-user': string };
  };
  workspaces: {
    key: string;
    value: WorkspaceRecord;
    indexes: { 'by-user': string; 'by-join-code': string };
  };
  students: {
    key: string;
    value: StudentRecord;
    indexes: { 'by-workspace': string; 'by-workspace-email': [string, string] };
  };
  assessments: {
    key: string;
    value: AssessmentRecord;
    indexes: { 'by-user': string };
  };
  items: {
    key: string;
    value: ItemRecord;
    indexes: { 'by-assessment': string };
  };
  assignments: {
    key: string;
    value: AssignmentRecord;
    indexes: { 'by-share-token': string; 'by-workspace': string; 'by-assessment': string };
  };
  submissions: {
    key: string;
    value: SubmissionRecord;
    indexes: {
      'by-access-key': string;
      'by-assignment': string;
      'by-assignment-student': [string, string];
    };
  };
  responses: {
    key: string;
    value: ResponseRecord;
    indexes: { 'by-submission': string };
  };
}

export type MetisDb = IDBPDatabase<MetisDbSchema>;

/**
 * Opens (and upgrades) the single demo database: one object store per aggregate, plus the indexes the
 * endpoints need (join code, share token, access key, workspaceId, assessmentId, student email per workspace).
 */
export function openMetisDb(): Promise<MetisDb> {
  return openDB<MetisDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const users = db.createObjectStore('users', { keyPath: 'id' });
      users.createIndex('by-email', 'email', { unique: true });

      const organizations = db.createObjectStore('organizations', { keyPath: 'id' });
      organizations.createIndex('by-user', 'userId');

      const workspaces = db.createObjectStore('workspaces', { keyPath: 'id' });
      workspaces.createIndex('by-user', 'userId');
      workspaces.createIndex('by-join-code', 'joinCode', { unique: true });

      const students = db.createObjectStore('students', { keyPath: 'id' });
      students.createIndex('by-workspace', 'workspaceId');
      students.createIndex('by-workspace-email', ['workspaceId', 'email'], { unique: true });

      const assessments = db.createObjectStore('assessments', { keyPath: 'id' });
      assessments.createIndex('by-user', 'userId');

      const items = db.createObjectStore('items', { keyPath: 'id' });
      items.createIndex('by-assessment', 'assessmentId');

      const assignments = db.createObjectStore('assignments', { keyPath: 'id' });
      assignments.createIndex('by-share-token', 'shareToken', { unique: true });
      assignments.createIndex('by-workspace', 'workspaceId');
      assignments.createIndex('by-assessment', 'assessmentId');

      const submissions = db.createObjectStore('submissions', { keyPath: 'id' });
      submissions.createIndex('by-access-key', 'accessKey', { unique: true });
      submissions.createIndex('by-assignment', 'assignmentId');
      submissions.createIndex('by-assignment-student', ['assignmentId', 'studentId'], {
        unique: true,
      });

      const responses = db.createObjectStore('responses', { keyPath: 'id' });
      responses.createIndex('by-submission', 'submissionId');
    },
  });
}

/** Names of the stores, kept in one place so tests can clear the database between cases. */
export const STORE_NAMES = [
  'users',
  'organizations',
  'workspaces',
  'students',
  'assessments',
  'items',
  'assignments',
  'submissions',
  'responses',
] as const;

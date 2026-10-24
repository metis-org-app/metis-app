import { z } from 'zod';
import type { HelpLevel } from './contract';

/*
 * Input of the assignment form. The limits mirror metis-api (docs/domain-model.md › assignments) only to give good
 * messages before the request; metis-api decides. Dates arrive as ISO 8601 with offset: the form converts what the
 * teacher typed in their zone before submitting (dates.ts), because the server does not know the browser's zone.
 */

export const DURATION_MIN = 5;
export const DURATION_MAX = 240;
export const DURATION_SUGGESTED = 45;
export const DEFAULT_HELP_LEVEL: HelpLevel = 2;
export const INSTRUCTIONS_MAX = 2000;

export const FIELD_COPY = {
  workspaceId: 'Elige un curso.',
  assessmentId: 'Elige una evaluación.',
  opensAt: 'Elige la fecha y hora de apertura.',
  dueAt: 'Elige la fecha y hora de cierre.',
  dueAfterOpen: 'El cierre tiene que ser después de la apertura.',
  dueInFuture: 'El cierre tiene que ser una fecha y hora futura.',
  durationMinutes: `La duración va de ${DURATION_MIN} a ${DURATION_MAX} minutos, en números enteros.`,
  maxHelpLevel: 'Elige cuánto puede ayudar Metis.',
  assistantInstructions: `Las indicaciones para Metis pueden tener hasta ${INSTRUCTIONS_MAX} caracteres.`,
} as const;

const isoDate = z.iso.datetime({ offset: true });

/** The fields of the form, as strings (FormData), echoed back so the form keeps what the teacher typed. */
export type AssignmentFormValues = {
  workspaceId?: string;
  assessmentId?: string;
  opensMode?: 'now' | 'at';
  opensAt?: string;
  dueMode?: 'none' | 'at';
  dueAt?: string;
  durationMinutes?: string;
  assistantEnabled?: boolean;
  maxHelpLevel?: string;
  assistantInstructions?: string;
  resultsVisible?: boolean;
};

export type AssignmentField =
  | 'workspaceId'
  | 'assessmentId'
  | 'opensAt'
  | 'dueAt'
  | 'durationMinutes'
  | 'maxHelpLevel'
  | 'assistantInstructions';

export type AssignmentFormState = {
  message?: string;
  fieldErrors?: Partial<Record<AssignmentField, string[]>>;
  values?: AssignmentFormValues;
  /** Set after a successful edit, so the dialog can close. */
  ok?: boolean;
};

export type AssignmentSettings = {
  /** Omitted: now when creating. */
  opensAt?: string;
  dueAt: string | null;
  durationMinutes: number;
  assistantEnabled: boolean;
  maxHelpLevel: HelpLevel;
  assistantInstructions: string | null;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

/** Reads the form. Switches send "on" when checked and nothing otherwise. */
export function readAssignmentForm(formData: FormData): AssignmentFormValues {
  return {
    workspaceId: text(formData, 'workspaceId'),
    assessmentId: text(formData, 'assessmentId'),
    opensMode: text(formData, 'opensMode') === 'at' ? 'at' : 'now',
    opensAt: text(formData, 'opensAt'),
    dueMode: text(formData, 'dueMode') === 'at' ? 'at' : 'none',
    dueAt: text(formData, 'dueAt'),
    durationMinutes: text(formData, 'durationMinutes'),
    assistantEnabled: formData.get('assistantEnabled') === 'on',
    maxHelpLevel: text(formData, 'maxHelpLevel'),
    assistantInstructions: text(formData, 'assistantInstructions'),
    resultsVisible: formData.get('resultsVisible') === 'on',
  };
}

type SettingsOptions = {
  now: Date;
  /** When editing: the current close date, which may stay as it is even if it already passed. */
  currentDueAt?: string | null;
};

type SettingsResult =
  | { success: true; data: AssignmentSettings }
  | { success: false; fieldErrors: Partial<Record<AssignmentField, string[]>> };

/** Validates the window, the time limit and the Metis settings. */
export function parseSettings(
  values: AssignmentFormValues,
  { now, currentDueAt }: SettingsOptions,
): SettingsResult {
  const errors: Partial<Record<AssignmentField, string[]>> = {};

  let opensAt: string | undefined;
  if (values.opensMode === 'at') {
    if (isoDate.safeParse(values.opensAt).success) opensAt = values.opensAt;
    else errors.opensAt = [FIELD_COPY.opensAt];
  }

  let dueAt: string | null = null;
  if (values.dueMode === 'at') {
    const parsed = isoDate.safeParse(values.dueAt);
    if (!parsed.success) {
      errors.dueAt = [FIELD_COPY.dueAt];
    } else {
      dueAt = parsed.data;
      const due = new Date(dueAt).getTime();
      const opens = opensAt ? new Date(opensAt).getTime() : now.getTime();
      const unchanged = currentDueAt != null && new Date(currentDueAt).getTime() === due;
      if (!unchanged && due <= now.getTime()) errors.dueAt = [FIELD_COPY.dueInFuture];
      else if (!errors.opensAt && due <= opens) errors.dueAt = [FIELD_COPY.dueAfterOpen];
    }
  }

  const durationText = values.durationMinutes?.trim() ?? '';
  const duration = Number(durationText);
  if (!/^\d+$/.test(durationText) || duration < DURATION_MIN || duration > DURATION_MAX) {
    errors.durationMinutes = [FIELD_COPY.durationMinutes];
  }

  const level = Number(values.maxHelpLevel);
  if (level !== 1 && level !== 2 && level !== 3) errors.maxHelpLevel = [FIELD_COPY.maxHelpLevel];

  const instructions = values.assistantInstructions?.trim() ?? '';
  if (instructions.length > INSTRUCTIONS_MAX)
    errors.assistantInstructions = [FIELD_COPY.assistantInstructions];

  if (Object.keys(errors).length > 0) return { success: false, fieldErrors: errors };

  return {
    success: true,
    data: {
      ...(opensAt ? { opensAt } : {}),
      dueAt,
      durationMinutes: duration,
      assistantEnabled: values.assistantEnabled ?? false,
      maxHelpLevel: level as HelpLevel,
      assistantInstructions: instructions || null,
    },
  };
}

const idSchema = z.uuid();

/** The assessment and the course of a new assignment: one comes fixed by the page, the other from the form. */
export function parseTarget(values: AssignmentFormValues) {
  const errors: Partial<Record<AssignmentField, string[]>> = {};
  if (!idSchema.safeParse(values.assessmentId).success) errors.assessmentId = [FIELD_COPY.assessmentId];
  if (!idSchema.safeParse(values.workspaceId).success) errors.workspaceId = [FIELD_COPY.workspaceId];
  return Object.keys(errors).length > 0
    ? ({ success: false, fieldErrors: errors } as const)
    : ({
        success: true,
        data: { assessmentId: values.assessmentId!, workspaceId: values.workspaceId! },
      } as const);
}

/** Result of actions triggered by a button (close, reopen, regenerate, delete, results visibility). */
export type ActionResult = { ok: true } | { ok: false; message: string; fieldError?: string };

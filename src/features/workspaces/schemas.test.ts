import { z } from 'zod';
import { joinCodeParamSchema, rosterResultSchema, workspaceSchema } from './api';
import { joinSchema, rosterSchema, studentSchema, workspaceNameSchema } from './schemas';

describe('workspaces input schemas', () => {
  it('trims the course name and reports a missing one in Spanish', () => {
    expect(workspaceNameSchema.parse({ name: '  Matemática 7° A ' }).name).toBe('Matemática 7° A');
    const result = workspaceNameSchema.safeParse({ name: '   ' });
    expect(result.error && z.flattenError(result.error).fieldErrors.name).toEqual([
      'Escribe el nombre del curso.',
    ]);
  });

  it('normalizes the student email and rejects invalid ones', () => {
    expect(studentSchema.parse({ name: 'Camila', email: ' Camila@Colegio.CL ' }).email).toBe(
      'camila@colegio.cl',
    );
    const result = studentSchema.safeParse({ name: '', email: 'camila' });
    const errors = result.error && z.flattenError(result.error).fieldErrors;
    expect(errors?.name).toEqual(['Escribe el nombre.']);
    expect(errors?.email?.[0]).toMatch(/formato del email/);
  });

  it('speaks to the student in the join form', () => {
    const result = joinSchema.safeParse({ name: ' ', email: '' });
    const errors = result.error && z.flattenError(result.error).fieldErrors;
    expect(errors?.name).toEqual(['Escribe tu nombre.']);
    expect(errors?.email?.[0]).toBe('Escribe tu email.');
  });

  it('accepts a roster of 1 to 100 students', () => {
    const student = { name: 'A', email: 'a@colegio.cl' };
    expect(rosterSchema.safeParse([]).success).toBe(false);
    expect(rosterSchema.safeParse(Array(100).fill(student)).success).toBe(true);
    expect(rosterSchema.safeParse(Array(101).fill(student)).success).toBe(false);
  });
});

describe('workspaces response schemas', () => {
  it('parses a workspace from metis-api', () => {
    const workspace = workspaceSchema.parse({
      id: '01a1608e-4564-7254-818a-24fc8cc2990d',
      name: 'Matemática 7° A',
      joinCode: 'TFR5PFJA',
      status: 'Active',
      studentCount: 3,
      createdAt: '2026-10-21T22:21:39.044448+00:00',
    });
    expect(workspace.status).toBe('Active');
  });

  it('fails loudly on a contract drift', () => {
    expect(() =>
      workspaceSchema.parse({
        id: 'x',
        name: 'A',
        joinCode: 'B',
        status: 'Deleted',
        studentCount: -1,
        createdAt: '',
      }),
    ).toThrow();
  });

  it('parses the bulk upload result', () => {
    expect(
      rosterResultSchema.parse({ added: [], alreadyEnrolled: ['camila@colegio.cl'] }).alreadyEnrolled,
    ).toEqual(['camila@colegio.cl']);
  });

  it('only lets well-formed join codes reach the API path', () => {
    expect(joinCodeParamSchema.parse(' tfr5pfja ')).toBe('TFR5PFJA');
    for (const code of ['TFR5PFJ', 'TFR5PFJAA', 'OIL01234', '../auth1', 'TFR5PFJ%']) {
      expect(joinCodeParamSchema.safeParse(code).success).toBe(false);
    }
  });
});

import { emailField, NAME_MAX, ROSTER_MAX, type StudentInput } from './schemas';

export type RosterLine = {
  /** 1-based line number in the pasted text, so the teacher can find it. */
  line: number;
  name: string;
  email: string;
  /** Why the line cannot be loaded, in Spanish. Absent when the line is valid. */
  error?: string;
};

export type ParsedRoster = {
  lines: RosterLine[];
  students: StudentInput[];
  invalidCount: number;
  /** More valid students than metis-api accepts in one upload. */
  tooMany: boolean;
};

const HEADER_EMAIL = /^(e-?mail|correo( electr[oó]nico)?|mail)$/i;

/**
 * Parses a roster pasted by the teacher: one student per line, "Name, email" or "Name<TAB>email" (a copy from Excel or
 * Google Sheets). With more than two cells the last one is the email and the others form the name, so "First<TAB>Last
 * <TAB>email" works too. Blank lines and a header row ("Nombre, Email") are skipped. Pure: no I/O, safe to run on every
 * keystroke.
 */
export function parseRoster(text: string): ParsedRoster {
  const lines: RosterLine[] = [];
  const firstLineByEmail = new Map<string, number>();
  let seenContent = false;

  text.split(/\r?\n/).forEach((raw, index) => {
    const content = raw.trim();
    if (!content) return;

    const cells = (content.includes('\t') ? content.split('\t') : splitAtLastComma(content)).map((cell) =>
      cell.trim(),
    );
    const emailCell = cells.length > 1 ? (cells.at(-1) ?? '') : '';
    const name = cells
      .slice(0, cells.length > 1 ? -1 : undefined)
      .filter(Boolean)
      .join(' ');

    if (!seenContent && HEADER_EMAIL.test(emailCell)) {
      seenContent = true;
      return;
    }
    seenContent = true;

    const line = index + 1;
    const parsedEmail = emailField.safeParse(emailCell);
    const email = parsedEmail.success ? parsedEmail.data : emailCell;

    let error: string | undefined;
    if (cells.length < 2) error = 'Falta el email. Usa "Nombre, email".';
    else if (!name) error = 'Falta el nombre.';
    else if (name.length > NAME_MAX) error = 'El nombre es demasiado largo.';
    else if (!parsedEmail.success) error = 'El email no es válido.';
    else if (firstLineByEmail.has(email))
      error = `Email repetido (también en la línea ${firstLineByEmail.get(email)}).`;

    if (parsedEmail.success && !firstLineByEmail.has(email)) firstLineByEmail.set(email, line);

    lines.push(error ? { line, name, email, error } : { line, name, email });
  });

  const students = lines.filter((line) => !line.error).map(({ name, email }) => ({ name, email }));
  return {
    lines,
    students,
    invalidCount: lines.length - students.length,
    tooMany: students.length > ROSTER_MAX,
  };
}

function splitAtLastComma(content: string): string[] {
  const at = content.lastIndexOf(',');
  return at === -1 ? [content] : [content.slice(0, at), content.slice(at + 1)];
}

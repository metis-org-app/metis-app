import { parseRoster } from './roster-parser';

describe('parseRoster', () => {
  it('reads "Name, email" and tab-separated lines, normalizing emails', () => {
    const result = parseRoster('Camila Rojas, Camila.Rojas@Colegio.CL\nDiego Soto\tdiego@colegio.cl');
    expect(result.students).toEqual([
      { name: 'Camila Rojas', email: 'camila.rojas@colegio.cl' },
      { name: 'Diego Soto', email: 'diego@colegio.cl' },
    ]);
    expect(result.invalidCount).toBe(0);
  });

  it('joins name columns copied from a sheet and skips its header row and blank lines', () => {
    const result = parseRoster('Nombre\tApellido\tCorreo\n\nElena\tPaz\telena@colegio.cl\r\n');
    expect(result.lines).toEqual([{ line: 3, name: 'Elena Paz', email: 'elena@colegio.cl' }]);
  });

  it('uses the last comma, so a name with a comma still works', () => {
    expect(parseRoster('Rojas, Camila, camila@colegio.cl').students).toEqual([
      { name: 'Rojas, Camila', email: 'camila@colegio.cl' },
    ]);
  });

  it('marks invalid lines with the line number and the reason', () => {
    const result = parseRoster(
      [
        'Ana Díaz, ana@colegio.cl',
        'Solo un nombre',
        ', sin-nombre@colegio.cl',
        'Beto, no-es-email',
        'Ana Otra, ANA@colegio.cl',
      ].join('\n'),
    );
    expect(result.students).toEqual([{ name: 'Ana Díaz', email: 'ana@colegio.cl' }]);
    expect(result.invalidCount).toBe(4);
    expect(result.lines.map((line) => [line.line, line.error])).toEqual([
      [1, undefined],
      [2, 'Falta el email. Usa "Nombre, email".'],
      [3, 'Falta el nombre.'],
      [4, 'El email no es válido.'],
      [5, 'Email repetido (también en la línea 1).'],
    ]);
  });

  it('flags more than 100 students as too many for one upload', () => {
    const text = Array.from({ length: 101 }, (_, i) => `Estudiante ${i}, e${i}@colegio.cl`).join('\n');
    const result = parseRoster(text);
    expect(result.students).toHaveLength(101);
    expect(result.tooMany).toBe(true);
    expect(parseRoster(text.split('\n').slice(0, 100).join('\n')).tooMany).toBe(false);
  });

  it('returns nothing for empty text', () => {
    expect(parseRoster('  \n\n')).toEqual({ lines: [], students: [], invalidCount: 0, tooMany: false });
  });
});

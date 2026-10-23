import { addFiles, FILE_MESSAGES, formatFileSize } from './files';

const MB = 1024 * 1024;

/** A File of the given size without allocating it: only `size` matters to the checks. */
function fakeFile(name: string, size: number, lastModified = 1) {
  const file = new File(['x'], name, { lastModified });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('addFiles', () => {
  it('accepts every supported format', () => {
    const names = ['a.pdf', 'b.PNG', 'c.jpeg', 'd.docx', 'e.pptx'];
    const { files, problems } = addFiles(
      [],
      names.map((name) => fakeFile(name, 1000)),
    );

    expect(files.map((file) => file.name)).toEqual(names);
    expect(problems).toEqual([]);
  });

  it('rejects formats metis-api cannot read, empty files and oversized files, naming each one', () => {
    const { files, problems } = addFiles(
      [],
      [
        fakeFile('clase.mp3', 1000),
        fakeFile('instalador.exe', 1000),
        fakeFile('vacio.txt', 0),
        fakeFile('libro.pdf', 15 * MB + 1),
        fakeFile('foto.jpg', 5 * MB + 1),
        fakeFile('apuntes.pdf', 15 * MB),
        fakeFile('diagrama.png', 5 * MB),
      ],
    );

    expect(files.map((file) => file.name)).toEqual(['apuntes.pdf', 'diagrama.png']);
    expect(problems).toEqual([
      { fileName: 'clase.mp3', message: FILE_MESSAGES.format },
      { fileName: 'instalador.exe', message: FILE_MESSAGES.format },
      { fileName: 'vacio.txt', message: FILE_MESSAGES.empty },
      { fileName: 'libro.pdf', message: FILE_MESSAGES.tooLarge },
      { fileName: 'foto.jpg', message: FILE_MESSAGES.imageTooLarge },
    ]);
  });

  it('allows at most 5 files and 40 MB in total', () => {
    const four = ['1.pdf', '2.pdf', '3.pdf', '4.pdf'].map((name) => fakeFile(name, 10 * MB));

    const afterFour = addFiles([], four);
    expect(afterFour.files).toHaveLength(4);

    const overTotal = addFiles(afterFour.files, [fakeFile('5.pdf', 1 * MB)]);
    expect(overTotal.problems).toEqual([{ fileName: '5.pdf', message: FILE_MESSAGES.totalTooLarge }]);

    const five = addFiles(
      [],
      [...['1', '2', '3', '4', '5'].map((n) => fakeFile(`${n}.txt`, 100)), fakeFile('6.txt', 100)],
    );
    expect(five.files).toHaveLength(5);
    expect(five.problems).toEqual([{ fileName: '6.txt', message: FILE_MESSAGES.tooMany }]);
  });

  it('skips a file that is already in the list', () => {
    const file = fakeFile('guia.pdf', 1000);
    const { files, problems } = addFiles([file], [fakeFile('guia.pdf', 1000)]);

    expect(files).toEqual([file]);
    expect(problems).toEqual([]);
  });
});

describe('formatFileSize', () => {
  it('shows KB below one megabyte and MB with a decimal comma above', () => {
    expect(formatFileSize(300)).toBe('1 KB');
    expect(formatFileSize(820 * 1024)).toBe('820 KB');
    expect(formatFileSize(1.25 * MB)).toBe('1,3 MB');
    expect(formatFileSize(15 * MB)).toBe('15 MB');
  });
});

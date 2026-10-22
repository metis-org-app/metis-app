import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { StudentItem } from '../../contract';
import { StudentQuestion, type StudentAnswer } from './student-question';

const base = {
  id: '0190a000-0000-7000-8000-000000000001',
  position: 2,
  points: 1.5,
  minWords: null,
  maxWords: null,
};

function Harness({ item, onAnswer }: { item: StudentItem; onAnswer?: (answer: StudentAnswer) => void }) {
  const [answer, setAnswer] = useState<StudentAnswer>(null);
  return (
    <StudentQuestion
      item={item}
      answer={answer}
      onAnswer={(next) => {
        setAnswer(next);
        onAnswer?.(next);
      }}
    />
  );
}

describe('StudentQuestion', () => {
  it('answers a single choice item with one key, by click or keyboard', async () => {
    const answers: StudentAnswer[] = [];
    const user = userEvent.setup();
    render(
      <Harness
        item={{
          ...base,
          type: 'SingleChoice',
          prompt: '¿Cuál es la capital de Chile?',
          options: [
            { key: 'a', text: 'Santiago' },
            { key: 'b', text: 'Valparaíso' },
          ],
        }}
        onAnswer={(answer) => answers.push(answer)}
      />,
    );

    expect(screen.getByText('Pregunta 2 · 1,5 puntos')).toBeVisible();
    const group = screen.getByRole('group', { name: '¿Cuál es la capital de Chile?' });
    expect(group).toBeVisible();

    await user.click(screen.getByRole('radio', { name: 'Valparaíso' }));
    expect(screen.getByRole('radio', { name: 'Valparaíso' })).toBeChecked();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('radio', { name: 'Santiago' })).toBeChecked();
    expect(answers).toEqual(['b', 'a']);
  });

  it('toggles several keys in a multiple choice item', async () => {
    const answers: StudentAnswer[] = [];
    const user = userEvent.setup();
    render(
      <Harness
        item={{
          ...base,
          type: 'MultipleChoice',
          prompt: '¿Cuáles son países?',
          options: [
            { key: 'a', text: 'Chile' },
            { key: 'b', text: 'Perú' },
            { key: 'c', text: 'Europa' },
          ],
        }}
        onAnswer={(answer) => answers.push(answer)}
      />,
    );

    expect(screen.getByText('Marca todas las que correspondan.')).toBeVisible();
    await user.click(screen.getByRole('checkbox', { name: 'Chile' }));
    await user.click(screen.getByRole('checkbox', { name: 'Perú' }));
    await user.click(screen.getByRole('checkbox', { name: 'Chile' }));
    expect(answers).toEqual([['a'], ['a', 'b'], ['b']]);
  });

  it('offers true and false as two options', async () => {
    const user = userEvent.setup();
    render(
      <Harness item={{ ...base, type: 'TrueFalse', prompt: 'Chile limita con Bolivia.', options: null }} />,
    );

    await user.click(screen.getByRole('radio', { name: 'Falso' }));
    expect(screen.getByRole('radio', { name: 'Falso' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Verdadero' })).not.toBeChecked();
  });

  it('counts the words of an open answer against its range', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        item={{ ...base, type: 'Essay', prompt: 'Explica.', options: null, minWords: 3, maxWords: 5 }}
      />,
    );

    const textarea = screen.getByLabelText('Tu respuesta');
    expect(textarea).toHaveAccessibleDescription('0 palabras · Entre 3 y 5 palabras.');
    await user.type(textarea, 'Una idea  clara');
    expect(textarea).toHaveAccessibleDescription('3 palabras · Entre 3 y 5 palabras.');
  });

  it('shows nothing about the answer key', () => {
    render(
      <Harness
        item={{
          ...base,
          type: 'SingleChoice',
          prompt: 'p',
          options: [
            { key: 'a', text: 'Uno' },
            { key: 'b', text: 'Dos' },
          ],
        }}
      />,
    );
    expect(screen.queryByText(/correcta/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked)).toBe(true);
  });
});

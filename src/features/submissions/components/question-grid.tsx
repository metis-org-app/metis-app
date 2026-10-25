import { cn } from '@/lib/cn';

type QuestionGridProps = {
  items: { id: string; position: number }[];
  answered: ReadonlySet<string>;
  current: number;
  onSelect: (index: number) => void;
};

/** Every question by number, marking the answered ones and the current one. Each target is 48 px for thumbs. */
export function QuestionGrid({ items, answered, current, onSelect }: QuestionGridProps) {
  return (
    <ol className="grid grid-cols-5 gap-2" aria-label="Preguntas">
      {items.map((item, index) => {
        const done = answered.has(item.id);
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-current={index === current ? 'step' : undefined}
              aria-label={`Pregunta ${item.position}, ${done ? 'respondida' : 'sin responder'}`}
              className={cn(
                'grid size-12 place-items-center rounded-control border text-sm font-semibold transition-colors',
                done ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink hover:border-ink-soft',
                index === current && 'outline-2 outline-offset-2 outline-gold-ink',
              )}
            >
              {item.position}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

'use client';

import { ChevronDown, Plus } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useRef } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { ITEM_TYPES, type ItemType } from '../../contract';
import { ITEM_TYPE_LABELS } from '../../item-draft';

const DESCRIPTIONS: Record<ItemType, string> = {
  SingleChoice: 'Una alternativa correcta.',
  MultipleChoice: 'Varias alternativas correctas.',
  TrueFalse: 'Una afirmación para juzgar.',
  Essay: 'El estudiante escribe; tú corriges.',
};

/** "Agregar pregunta": a menu with the four item types (keyboard: arrows, Enter, Escape). */
export function AddItemMenu({ onAdd, disabled }: { onAdd: (type: ItemType) => void; disabled: boolean }) {
  // After choosing a type the focus goes to the new item's prompt, not back to this button.
  const chosen = useRef(false);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={buttonVariants({ variant: 'secondary', size: 'lg' })}
        disabled={disabled}
      >
        <Plus aria-hidden />
        Agregar pregunta
        <ChevronDown aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          onCloseAutoFocus={(event) => {
            if (chosen.current) event.preventDefault();
            chosen.current = false;
          }}
          className="z-50 grid min-w-64 gap-1 rounded-control border border-line bg-paper p-1.5 shadow-[0_16px_32px_-16px_rgb(34_27_16/0.45)]"
        >
          {ITEM_TYPES.map((type) => (
            <DropdownMenu.Item
              key={type}
              onSelect={() => {
                chosen.current = true;
                onAdd(type);
              }}
              className="grid cursor-pointer gap-0.5 rounded-[0.6rem] px-3 py-2.5 outline-none data-highlighted:bg-cream-deep"
            >
              <span className="font-semibold">{ITEM_TYPE_LABELS[type]}</span>
              <span className="text-sm text-ink-soft">{DESCRIPTIONS[type]}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

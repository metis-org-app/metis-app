'use client';

import { Eye, Send, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { AlertDialog, AlertDialogContent, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { deleteAssessmentAction, publishAssessmentAction } from '../../actions';
import { editorApi } from '../../client-api';
import type { Assessment, ItemType } from '../../contract';
import { MESSAGES } from '../../errors';
import { itemCountLabel, pointsLabel } from '../../format';
import {
  copyDraft,
  draftFromItem,
  draftPoints,
  emptyDraft,
  LIMITS,
  toRequest,
  type ItemDraft,
} from '../../item-draft';
import type { AutosaveStatus, SaveOutcome } from '../../use-autosave';
import { AddItemMenu } from './add-item-menu';
import { DetailsEditor } from './details-editor';
import { ItemCard, type MoveDirection } from './item-card';

type EditorItem = {
  key: string;
  draft: ItemDraft;
  /** The server has it (loaded, or created in this session). */
  stored: boolean;
};

let nextKey = 0;
const newKey = () => `new-${++nextKey}`;

/** Moves the focus to the prompt of a card once it is rendered (a new or duplicated item). */
function focusPrompt(key: string) {
  requestAnimationFrame(() =>
    document.querySelector<HTMLTextAreaElement>(`[data-card="${key}"] textarea[id$="-prompt"]`)?.focus(),
  );
}

const outcome = (result: { ok: true } | SaveOutcome): SaveOutcome => (result.ok ? { ok: true } : result);

/*
 * The draft editor. Each card autosaves its own item (PUT, or POST the first time). Operations that change the list
 * (create, delete, reorder) run one at a time through a queue, so the order sent to metis-api always names exactly the
 * items it has. Unsaved new items can be moved freely; the server order is synced each time it differs from the
 * screen's order of the items the server has.
 */
export function AssessmentEditor({ assessment }: { assessment: Assessment }) {
  const assessmentId = assessment.id;
  const router = useRouter();

  const [items, setItems] = useState<EditorItem[]>(() =>
    assessment.items.map((item) => ({ key: item.id, draft: draftFromItem(item), stored: true })),
  );
  // Source of truth for async work: state updates are not visible to code that runs before the next render.
  const itemsRef = useRef(items);
  const update = useCallback((next: EditorItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const ids = useRef(new Map(assessment.items.map((item) => [item.id, item.id])));
  const serverOrder = useRef(assessment.items.map((item) => item.id));
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [orderError, setOrderError] = useState<string>();
  const [statuses, setStatuses] = useState<Record<string, AutosaveStatus['state']>>({});
  const [announcement, setAnnouncement] = useState('');

  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = queue.current.then(task, task);
    queue.current = run.catch(() => undefined);
    return run;
  }, []);

  /** Runs inside the queue. Sends the screen's order of stored items when it differs from the server's. */
  const syncOrder = useCallback(async () => {
    const local = itemsRef.current.flatMap((item) => ids.current.get(item.key) ?? []);
    if (
      local.length === serverOrder.current.length &&
      local.every((id, index) => id === serverOrder.current[index])
    ) {
      setOrderError(undefined);
      return;
    }
    const result = await editorApi.reorderItems(assessmentId, local);
    if (result.ok) {
      serverOrder.current = local;
      setOrderError(undefined);
    } else {
      setOrderError(result.message ?? MESSAGES.invalid);
    }
  }, [assessmentId]);

  const saveItem = useCallback(
    async (key: string, draft: ItemDraft): Promise<SaveOutcome> => {
      const request = toRequest(draft);
      const id = ids.current.get(key);
      if (id) return outcome(await editorApi.updateItem(assessmentId, id, request));

      return enqueue(async () => {
        // Created by an earlier queued save of this same card.
        const created = ids.current.get(key);
        if (created) return outcome(await editorApi.updateItem(assessmentId, created, request));
        if (!itemsRef.current.some((item) => item.key === key)) return { ok: true }; // deleted before saving

        const result = await editorApi.createItem(assessmentId, request);
        if (!result.ok) return result;
        ids.current.set(key, result.data.id);
        serverOrder.current = [...serverOrder.current, result.data.id];
        update(itemsRef.current.map((item) => (item.key === key ? { ...item, stored: true } : item)));
        await syncOrder();
        return { ok: true };
      });
    },
    [assessmentId, enqueue, syncOrder, update],
  );

  const reportStatus = useCallback((key: string, status: AutosaveStatus) => {
    setStatuses((previous) =>
      previous[key] === status.state ? previous : { ...previous, [key]: status.state },
    );
  }, []);

  function add(type: ItemType) {
    const key = newKey();
    update([...itemsRef.current, { key, draft: emptyDraft(type), stored: false }]);
    focusPrompt(key);
  }

  function duplicate(key: string) {
    const index = itemsRef.current.findIndex((item) => item.key === key);
    const original = itemsRef.current[index];
    if (!original) return;
    const next = [...itemsRef.current];
    next.splice(index + 1, 0, { key: newKey(), draft: copyDraft(original.draft), stored: false });
    update(next);
    setAnnouncement(`Duplicaste la pregunta ${index + 1}. La copia es la pregunta ${index + 2}.`);
    focusPrompt(next[index + 1]!.key);
  }

  function move(key: string, direction: MoveDirection) {
    const index = itemsRef.current.findIndex((item) => item.key === key);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= itemsRef.current.length) return;
    const next = [...itemsRef.current];
    [next[index], next[target]] = [next[target]!, next[index]!];
    update(next);
    setAnnouncement(`Pregunta movida a la posición ${target + 1} de ${next.length}.`);
    void enqueue(syncOrder);

    // Keep the keyboard on the moved card: the same button, or the other one at the ends of the list.
    requestAnimationFrame(() => {
      const card = document.querySelector<HTMLElement>(`[data-card="${key}"]`);
      const same = card?.querySelector<HTMLButtonElement>(`[data-move="${direction}"]`);
      const other = card?.querySelector<HTMLButtonElement>(
        `[data-move="${direction === 'up' ? 'down' : 'up'}"]`,
      );
      (same && !same.disabled ? same : other)?.focus();
    });
  }

  async function remove(key: string): Promise<string | undefined> {
    const message = await enqueue(async () => {
      const id = ids.current.get(key);
      if (id) {
        const result = await editorApi.deleteItem(assessmentId, id);
        // 404: it was already gone, which is what the teacher wants.
        if (!result.ok && result.status !== 404) return result.message ?? MESSAGES.invalid;
        serverOrder.current = serverOrder.current.filter((stored) => stored !== id);
        ids.current.delete(key);
      }
      update(itemsRef.current.filter((item) => item.key !== key));
      setStatuses(({ [key]: _removed, ...rest }) => rest);
      return undefined;
    });
    if (!message) setAnnouncement('Pregunta eliminada.');
    return message;
  }

  const [detailsState, setDetailsState] = useState<AutosaveStatus['state']>('saved');
  const onDetailsStatus = useCallback((status: AutosaveStatus) => setDetailsState(status.state), []);

  const allSaved =
    detailsState === 'saved' &&
    !orderError &&
    items.every((item) => statuses[item.key] === 'saved' && item.stored);
  const totalPoints = items.reduce((sum, item) => sum + draftPoints(item.draft), 0);

  // Leaving with changes still on their way to the server would lose them.
  useEffect(() => {
    if (allSaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [allSaved]);

  return (
    <div className="grid gap-6">
      <EditorToolbar
        assessmentId={assessmentId}
        itemCount={items.length}
        totalPoints={totalPoints}
        allSaved={allSaved}
        onPublished={() => router.refresh()}
      />

      <DetailsEditor
        assessmentId={assessmentId}
        initial={{ title: assessment.title, instructions: assessment.instructions ?? '' }}
        onStatus={onDetailsStatus}
      />

      {orderError && (
        <Alert>
          <p>No pudimos guardar el nuevo orden. {orderError}</p>
          <Button variant="link" className="text-danger" onClick={() => void enqueue(syncOrder)}>
            Reintentar
          </Button>
        </Alert>
      )}

      <section aria-labelledby="preguntas-titulo" className="grid gap-4">
        <h2 id="preguntas-titulo" className="sr-only">
          Preguntas
        </h2>
        {items.length === 0 ? (
          <p className="rounded-surface border border-dashed border-line bg-paper p-6 text-ink-soft">
            Todavía no hay preguntas. Agrega la primera: puedes combinar selección única, selección múltiple,
            verdadero o falso y respuestas abiertas.
          </p>
        ) : (
          <ol className="grid gap-4">
            {items.map((item, index) => (
              <li key={item.key}>
                <ItemCard
                  cardKey={item.key}
                  number={index + 1}
                  total={items.length}
                  draft={item.draft}
                  stored={item.stored}
                  onChange={(draft) =>
                    update(
                      itemsRef.current.map((other) => (other.key === item.key ? { ...other, draft } : other)),
                    )
                  }
                  save={(draft) => saveItem(item.key, draft)}
                  onStatus={(status) => reportStatus(item.key, status)}
                  onMove={(direction) => move(item.key, direction)}
                  onDuplicate={() => duplicate(item.key)}
                  onDelete={() => remove(item.key)}
                  canDuplicate={items.length < LIMITS.itemsMax}
                />
              </li>
            ))}
          </ol>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <AddItemMenu onAdd={add} disabled={items.length >= LIMITS.itemsMax} />
          {items.length >= LIMITS.itemsMax && (
            <p className="text-sm text-ink-soft">Llegaste al máximo de {LIMITS.itemsMax} preguntas.</p>
          )}
        </div>
      </section>

      <p role="status" className="sr-only">
        {announcement}
      </p>

      <footer className="border-t border-line pt-6">
        <DeleteDraftButton assessmentId={assessmentId} />
      </footer>
    </div>
  );
}

function EditorToolbar({
  assessmentId,
  itemCount,
  totalPoints,
  allSaved,
  onPublished,
}: {
  assessmentId: string;
  itemCount: number;
  totalPoints: number;
  allSaved: boolean;
  onPublished: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const canPublish = allSaved && itemCount > 0;
  const reason =
    itemCount === 0
      ? 'Agrega al menos una pregunta para publicar.'
      : !allSaved
        ? 'Esperando a que se guarden los cambios…'
        : null;

  function confirm() {
    startTransition(async () => {
      const result = await publishAssessmentAction(assessmentId);
      if (result.ok) {
        setOpen(false);
        onPublished();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="sticky top-0 z-20 -mx-5 grid gap-2 border-b border-line bg-cream/95 px-5 py-3 backdrop-blur-sm sm:-mx-10 sm:px-10 lg:-mx-14 lg:px-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">
          {itemCountLabel(itemCount)} <span className="text-ink-soft">· {pointsLabel(totalPoints)}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {allSaved ? (
            <Button variant="secondary" asChild>
              <Link href={`/evaluaciones/${assessmentId}/vista-previa`}>
                <Eye aria-hidden />
                Vista previa
              </Link>
            </Button>
          ) : (
            <Button variant="secondary" disabled>
              <Eye aria-hidden />
              Vista previa
            </Button>
          )}
          <AlertDialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setError(undefined);
            }}
          >
            <AlertDialogTrigger asChild>
              <Button disabled={!canPublish} aria-describedby={reason ? 'publicar-motivo' : undefined}>
                <Send aria-hidden />
                Publicar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              title="¿Publicar esta evaluación?"
              description="Una vez publicada ya no se puede editar: así todos tus cursos reciben la misma versión. Si después necesitas cambiarla, puedes duplicarla y editar la copia."
              confirmLabel="Publicar evaluación"
              pendingLabel="Publicando…"
              onConfirm={confirm}
              pending={pending}
              error={error && <Alert>{error}</Alert>}
            />
          </AlertDialog>
        </div>
      </div>
      {reason && (
        <p id="publicar-motivo" className="text-sm text-ink-soft">
          {reason}
        </p>
      )}
    </div>
  );
}

function DeleteDraftButton({ assessmentId }: { assessmentId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      // On success the action navigates to the list.
      const result = await deleteAssessmentAction(assessmentId);
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(undefined);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="secondary">
          <Trash2 aria-hidden />
          Eliminar borrador
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title="¿Eliminar este borrador?"
        description="Se borran la evaluación y todas sus preguntas. No se puede deshacer."
        confirmLabel="Eliminar borrador"
        pendingLabel="Eliminando…"
        destructive
        onConfirm={confirm}
        pending={pending}
        error={error && <Alert>{error}</Alert>}
      />
    </AlertDialog>
  );
}

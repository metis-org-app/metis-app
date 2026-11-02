'use client';

import { useEffect, useReducer, useRef, useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import { Alert } from '@/components/ui/alert';
import { addFiles, type FileProblem } from '../../generator/files';
import { requestDraft, GENERATE_MESSAGES, type GenerateDraft } from '../../generator/request';
import { generatorReducer, initialState } from '../../generator/state';
import {
  buildGenerateFormData,
  DEFAULT_VALUES,
  validateValues,
  type GeneratorFieldErrors,
  type GeneratorValues,
} from '../../generator/values';
import { titleField, type ActionResult, type DraftToSave } from '../../schemas';
import { DraftReview } from './draft-review';
import { GeneratingScreen } from './generating-screen';
import { GeneratorForm } from './generator-form';

type DraftGeneratorProps = {
  /** From GET /api/ai/status; false shows that drafts come from the sample generator, null that it is unknown. */
  aiAvailable: boolean | null;
  /** Creates the assessment from the reviewed draft and opens the editor (a server action). */
  save: (draft: DraftToSave) => Promise<ActionResult>;
  /** Asks metis-api for the draft; replaced in tests. */
  generate?: GenerateDraft;
  /** Page heading and introduction, shown with the start form (and hidden once the flow is running). */
  intro?: ReactNode;
  /** Page content below the start form (e.g. the home of /inicio), hidden once the flow is running. */
  below?: ReactNode;
};

/**
 * The creation flow: prompt → wait → review → create. The start screen is one prompt like an AI chat
 * tool: materials attach to it as chips and the settings fold away; the review adds the questions as
 * animated cards the teacher reorders or removes. The form values and the files survive an error, a
 * cancellation and "Volver a generar". The draft lives only in this component until it is created, so
 * leaving the page with a draft under review asks for confirmation.
 */
export function DraftGenerator({
  aiAvailable,
  save,
  generate = requestDraft,
  intro,
  below,
}: DraftGeneratorProps) {
  const [state, dispatch] = useReducer(generatorReducer, initialState);
  const [values, setValues] = useState<GeneratorValues>(DEFAULT_VALUES);
  const [fieldErrors, setFieldErrors] = useState<GeneratorFieldErrors>({});
  const [files, setFiles] = useState<File[]>([]);
  const [fileProblems, setFileProblems] = useState<FileProblem[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [titleError, setTitleError] = useState<string>();
  const [saving, startSaving] = useTransition();
  const controllerRef = useRef<AbortController | null>(null);

  // Leaving the page aborts a generation in progress.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const reviewing = state.status === 'review';
  // No warning while "Crear borrador" runs: the save's redirect to the editor is the teacher leaving on purpose.
  useEffect(() => {
    if (!reviewing || saving) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers need returnValue set to show the prompt.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [reviewing, saving]);

  // A field that failed validation opens its panel, so the error is never hidden inside a folded one.
  // Materials need no panel: their errors show under the prompt, next to the chips.
  function openPanelsFor(errors: GeneratorFieldErrors) {
    if (errors.level || errors.itemCount || errors.allowedTypes || errors.instructions) setSettingsOpen(true);
  }

  async function submit() {
    const errors = validateValues(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      openPanelsFor(errors);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setFileProblems([]);
    dispatch({ type: 'submit' });

    const result = await generate(buildGenerateFormData(values, files), controller.signal);
    // Cancelled, or replaced by a newer request: this answer no longer belongs to the screen.
    if (controllerRef.current !== controller) return;
    controllerRef.current = null;

    if (result.ok) {
      setSaveError(undefined);
      setTitleError(undefined);
      dispatch({ type: 'succeeded', draft: result.draft });
    } else if (result.aborted) {
      dispatch({ type: 'cancelled' });
    } else {
      setFieldErrors(result.fieldErrors);
      openPanelsFor(result.fieldErrors);
      dispatch({ type: 'failed', failure: result });
    }
  }

  function cancel() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    dispatch({ type: 'cancelled' });
  }

  function createAssessment() {
    if (state.status !== 'review') return;
    const { draft } = state;
    const title = titleField.safeParse(draft.title);
    if (!title.success) {
      setTitleError(title.error.issues[0]?.message);
      return;
    }
    setTitleError(undefined);
    setSaveError(undefined);
    startSaving(async () => {
      // On success the action redirects to the editor; it only returns when it failed.
      const result = await save({
        title: draft.title,
        instructions: draft.instructions,
        items: draft.items.map((entry) => entry.item),
      });
      if (!result.ok) setSaveError(result.message);
    });
  }

  if (state.status === 'generating') {
    return <GeneratingScreen onCancel={cancel} />;
  }

  if (state.status === 'review') {
    return (
      <DraftReview
        draft={state.draft}
        saving={saving}
        saveError={saveError}
        titleError={titleError}
        onTitleChange={(title) => dispatch({ type: 'editTitle', title })}
        onInstructionsChange={(instructions) => dispatch({ type: 'editInstructions', instructions })}
        onRemoveItem={(key) => dispatch({ type: 'removeItem', key })}
        onMoveItem={(key, direction) => dispatch({ type: 'moveItem', key, direction })}
        onRegenerate={() => dispatch({ type: 'regenerate' })}
        onSave={createAssessment}
      />
    );
  }

  const banner = (
    <>
      {aiAvailable === false && (
        <p className="rounded-control border border-line bg-cream-deep px-4 py-3 text-sm text-ink-soft">
          Metis está en modo de ejemplo: el borrador no se basará en tus materiales.
        </p>
      )}
      {state.status === 'error' && <Alert>{state.failure.message}</Alert>}
      {state.status === 'cancelled' && (
        <p role="status" className="rounded-control border border-line bg-paper px-4 py-3 text-sm">
          {GENERATE_MESSAGES.cancelled}
        </p>
      )}
    </>
  );

  return (
    <div className="grid gap-8">
      {intro}
      <GeneratorForm
        values={values}
        fieldErrors={fieldErrors}
        files={files}
        fileProblems={fileProblems}
        rejectedFileName={state.status === 'error' ? state.failure.fileName : undefined}
        banner={banner}
        settingsOpen={settingsOpen}
        onChange={setValues}
        onAddFiles={(incoming) => {
          const result = addFiles(files, incoming);
          setFiles(result.files);
          setFileProblems(result.problems);
        }}
        onRemoveFile={(file) => {
          setFiles(files.filter((existing) => existing !== file));
          setFileProblems([]);
        }}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
        onSubmit={() => void submit()}
      />
      {below}
    </div>
  );
}

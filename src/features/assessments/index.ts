// Public entry of the assessments feature ("evaluaciones" in the UI) for client and server components.
export { AssessmentActions } from './components/assessment-actions';
export { AssessmentList } from './components/assessment-list';
export { AssessmentReadOnly } from './components/assessment-read-only';
export { CreateAssessmentDialog } from './components/create-assessment-dialog';
export { AssessmentEditor } from './components/editor/assessment-editor';
export { DraftGenerator } from './components/generator/draft-generator';
export { StatusTabs, tabFor } from './components/status-tabs';
// Server action passed to DraftGenerator by its page.
export { createAssessmentFromDraftAction } from './actions';
// Student mode, reused by the real submission (features/submissions).
export { StudentAssessment } from './components/student/student-assessment';
export { StudentPreview } from './components/student/student-preview';
export { countWords, StudentQuestion, type StudentAnswer } from './components/student/student-question';
export { studentItemSchema, type StudentItem } from './contract';
export { formatPoints } from './item-draft';

// Public entry of the assessments feature ("evaluaciones" in the UI) for client and server components.
export { AssessmentActions } from './components/assessment-actions';
export { AssessmentList } from './components/assessment-list';
export { AssessmentReadOnly } from './components/assessment-read-only';
export { CreateAssessmentDialog } from './components/create-assessment-dialog';
export { AssessmentEditor } from './components/editor/assessment-editor';
export { StatusTabs, tabFor } from './components/status-tabs';
// Student mode, reused by the real submission in step 6.
export { StudentAssessment } from './components/student/student-assessment';
export { StudentPreview } from './components/student/student-preview';
export { countWords, StudentQuestion, type StudentAnswer } from './components/student/student-question';

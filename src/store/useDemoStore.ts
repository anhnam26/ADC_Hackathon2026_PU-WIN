import { create } from "zustand";
import type {
  Category,
  Issue,
  Session,
  Task,
  TaskStatus,
} from "../types/domain";
import { loadSession, seedSession, STORAGE_KEY } from "../lib/persistence";
import { createTasks, transitionTask } from "../lib/taskRules";
import type { MobilityProfile, Pose } from '../types/simulator';

type IssueInput = Pick<
  Issue,
  | "stepId"
  | "locationId"
  | "category"
  | "kind"
  | "impact"
  | "description"
  | "requestedSupport"
  | "checklistId"
  | "objectId"
  | "objectName"
  | "measurementNote"
>;
interface DemoState {
  session: Session;
  notice: string;
  persistenceBlocked: boolean;
  start: (needs: Category[]) => void;
  setMobility: (profile: MobilityProfile) => void;
  inspectObject: (id: string) => void;
  setOpenDoors: (ids: string[]) => void;
  savePose: (pose: Pose) => void;
  selectStep: (step: number) => void;
  setStepStatus: (status: Session["stepStatuses"][number]) => void;
  setAnswer: (id: string, value: Session["answers"][string]) => void;
  setReducedMotion: (value: boolean) => void;
  saveIssue: (input: IssueInput, id?: string) => void;
  deleteIssue: (id: string) => void;
  submitIssues: () => void;
  transition: (
    id: string,
    status: TaskStatus,
    actor: "HR/Facilities" | "Nhân viên",
    note?: string,
  ) => void;
  assignTask: (id: string, team: Task["ownerTeam"], assignee: string) => void;
  reset: () => void;
}
const initial = loadSession();
export const useDemoStore = create<DemoState>((set) => ({
  session: initial.session,
  notice: initial.notice,
  persistenceBlocked: initial.blocked,
  setMobility: mobility => set(s => ({ session: { ...s.session, mobility } })),
  inspectObject: id => set(s => s.session.inspectedIds.includes(id) ? {} : ({ session: { ...s.session, inspectedIds: [...s.session.inspectedIds, id] } })),
  setOpenDoors: openDoors => set(s => ({ session: { ...s.session, openDoors } })),
  savePose: playerPose => set(s => ({ session: { ...s.session, playerPose: { ...playerPose } } })),
  start: (selectedNeeds) =>
    set((s) => ({ session: { ...s.session, started: true, selectedNeeds } })),
  selectStep: (currentStep) =>
    set((s) => ({ session: { ...s.session, currentStep } })),
  setStepStatus: (status) =>
    set((s) => ({
      session: {
        ...s.session,
        stepStatuses: s.session.stepStatuses.map((v, i) =>
          i === s.session.currentStep ? status : v,
        ),
      },
    })),
  setAnswer: (id, value) =>
    set((s) => ({
      session: { ...s.session, answers: { ...s.session.answers, [id]: value } },
    })),
  setReducedMotion: (reducedMotion) =>
    set((s) => ({ session: { ...s.session, reducedMotion } })),
  saveIssue: (input, id) =>
    set((s) => {
      const previous = s.session.issues.find((i) => i.id === id);
      if (previous?.state === "submitted") return {};
      const now = new Date().toISOString();
      const issue: Issue = {
        ...input,
        id: previous?.id ?? crypto.randomUUID(),
        sessionId: s.session.id,
        state: "draft",
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
      const answers = { ...s.session.answers };
      if (issue.checklistId)
        answers[issue.checklistId] =
          issue.kind === "barrier" ? "barrier" : "needs_verification";
      return {
        session: {
          ...s.session,
          answers,
          issues: previous
            ? s.session.issues.map((i) => (i.id === id ? issue : i))
            : [...s.session.issues, issue],
        },
      };
    }),
  deleteIssue: (id) =>
    set((s) => {
      const issue = s.session.issues.find(
        (i) => i.id === id && i.state === "draft",
      );
      if (!issue) return {};
      const issues = s.session.issues.filter((i) => i.id !== id);
      const answers = { ...s.session.answers };
      if (
        issue.checklistId &&
        !issues.some((i) => i.checklistId === issue.checklistId)
      )
        delete answers[issue.checklistId];
      return { session: { ...s.session, issues, answers } };
    }),
  submitIssues: () =>
    set((s) => ({
      session: {
        ...s.session,
        tasks: createTasks(
          s.session.issues,
          s.session.tasks,
          s.session.startDate,
        ),
        issues: s.session.issues.map((i) => ({
          ...i,
          state: "submitted" as const,
        })),
      },
    })),
  transition: (id, status, actor, note) =>
    set((s) => ({
      session: {
        ...s.session,
        tasks: s.session.tasks.map((t) =>
          t.id === id ? transitionTask(t, status, actor, note) : t,
        ),
      },
    })),
  assignTask: (id, ownerTeam, assignee) =>
    set((s) => ({
      session: {
        ...s.session,
        tasks: s.session.tasks.map((t) =>
          t.id === id && t.status !== "done"
            ? {
                ...t,
                ownerTeam,
                assignee: assignee.trim(),
                history: [
                  ...t.history,
                  {
                    at: new Date().toISOString(),
                    actor: "HR/Facilities",
                    message: `Phân công: ${ownerTeam}${assignee.trim() ? ` · ${assignee.trim()}` : ""}`,
                  },
                ],
              }
            : t,
        ),
      },
    })),
  reset: () =>
    set({ session: seedSession(), notice: "", persistenceBlocked: false }),
}));
useDemoStore.subscribe((state, previous) => {
  if (state.session === previous.session || state.persistenceBlocked) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.session));
  } catch {
    useDemoStore.setState({
      notice:
        "Trình duyệt không cho phép lưu. Phiên hiện tại vẫn dùng được nhưng sẽ mất khi tải lại trang.",
      persistenceBlocked: true,
    });
  }
});

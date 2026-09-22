import type { Issue, Task, TaskStatus } from "../types/domain";

export function officeDate(now = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return `${p.find((x) => x.type === "year")!.value}-${p.find((x) => x.type === "month")!.value}-${p.find((x) => x.type === "day")!.value}`;
}
export function addDays(date: string, amount: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}
export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(date + "T12:00:00Z"));
}
export function ownerFor(issue: Issue): Task["ownerTeam"] {
  return ["entrance", "furniture", "restroom", "quiet"].includes(issue.category)
    ? "Facilities"
    : "HR";
}
export function createTasks(
  issues: Issue[],
  existing: Task[],
  startDate: string,
  now = new Date().toISOString(),
): Task[] {
  const linked = new Set(existing.flatMap((t) => t.issueIds));
  const tasks = [...existing];
  for (const issue of issues) {
    if (linked.has(issue.id)) continue;
    linked.add(issue.id);
    tasks.push({
      id: `task-${issue.id}`,
      issueIds: [issue.id],
      title: issue.description,
      locationId: issue.locationId,
      ownerTeam: ownerFor(issue),
      assignee: "",
      priority: issue.impact,
      dueDate: addDays(startDate, -1),
      status: "todo",
      resolutionNote: "",
      employeeResponse: "",
      history: [
        {
          at: now,
          actor: "Nhân viên",
          message: "Tạo nhiệm vụ từ tổng kết trải nghiệm.",
        },
      ],
    });
  }
  return tasks;
}
export function transitionTask(
  task: Task,
  status: TaskStatus,
  actor: "HR/Facilities" | "Nhân viên",
  note = "",
  now = new Date().toISOString(),
): Task {
  const allowed =
    actor === "Nhân viên"
      ? task.status === "ready_for_review" &&
        ["done", "in_progress"].includes(status)
      : (task.status === "todo" && status === "in_progress") ||
        (task.status === "in_progress" && status === "ready_for_review");
  if (!allowed) throw new Error("This status transition is not allowed.");
  if (status === "ready_for_review" && note.trim().length < 3)
    throw new Error("Please enter a preparation plan.");
  if (
    actor === "Nhân viên" &&
    status === "in_progress" &&
    note.trim().length < 3
  )
    throw new Error("Please describe what needs to be reviewed.");
  return {
    ...task,
    status,
    resolutionNote:
      status === "ready_for_review" ? note.trim() : task.resolutionNote,
    employeeResponse:
      actor === "Nhân viên"
        ? note.trim() || "Tôi xác nhận phương án này."
        : task.employeeResponse,
    history: [
      ...task.history,
      {
        at: now,
        actor,
        message:
          status === "in_progress"
            ? actor === "Nhân viên"
              ? `Yêu cầu xem lại: ${note.trim()}`
              : "Bắt đầu chuẩn bị."
            : status === "done"
              ? "Nhân viên xác nhận phương án."
              : `Phương án: ${note.trim()}`,
      },
    ],
  };
}

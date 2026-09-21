import { sessionSchema, type Session } from "../types/domain";
import { locations } from "../data/office";
import { journey } from "../data/journey";
import { addDays, officeDate } from "./taskRules";

export const STORAGE_KEY = "dayzero.session.v1";
export function seedSession(): Session {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    started: false,
    startDate: addDays(officeDate(), 7),
    selectedNeeds: [],
    currentStep: 0,
    stepStatuses: Array.from({ length: 7 }, () => "pending"),
    answers: {},
    issues: [],
    tasks: [],
    reducedMotion:
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}
export function parseSession(raw: string): Session {
  const data = sessionSchema.parse(JSON.parse(raw));
  const locationIds = new Set(locations.map((l) => l.id));
  const checklistIds = new Set(
    journey.flatMap((s) => s.checklist.map((c) => c.id)),
  );
  const issueIds = new Set(data.issues.map((i) => i.id));
  const taskIds = new Set(data.tasks.map((t) => t.id));
  const references = data.tasks.flatMap((t) => t.issueIds);
  if (
    issueIds.size !== data.issues.length ||
    taskIds.size !== data.tasks.length ||
    new Set(references).size !== references.length ||
    Object.keys(data.answers).some((id) => !checklistIds.has(id)) ||
    data.issues.some(
      (i) =>
        i.sessionId !== data.id ||
        !locationIds.has(i.locationId) ||
        (i.checklistId &&
          !journey[i.stepId].checklist.some((c) => c.id === i.checklistId)),
    ) ||
    data.tasks.some(
      (t) =>
        !locationIds.has(t.locationId) ||
        t.issueIds.some((id) => !issueIds.has(id)),
    ) ||
    data.issues.some(
      (i) => (i.state === "submitted") !== references.includes(i.id),
    )
  ) {
    throw new Error("Dữ liệu liên kết không hợp lệ.");
  }
  return data;
}
export function loadSession(): {
  session: Session;
  notice: string;
  blocked: boolean;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return {
      session: raw ? parseSession(raw) : seedSession(),
      notice: "",
      blocked: false,
    };
  } catch {
    return {
      session: seedSession(),
      notice:
        "Không thể khôi phục dữ liệu đã lưu. Phiên tạm vẫn dùng được; dữ liệu cũ được giữ nguyên. Chọn “Đặt lại demo” khi muốn thay thế.",
      blocked: true,
    };
  }
}

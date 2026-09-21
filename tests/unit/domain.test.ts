import { describe, it, expect } from "vitest";
import {
  addDays,
  createTasks,
  officeDate,
  ownerFor,
  transitionTask,
} from "../../src/lib/taskRules";
import { parseSession, seedSession } from "../../src/lib/persistence";
import { locations, routeFor } from "../../src/data/office";
import { journey } from "../../src/data/journey";
import type { Issue } from "../../src/types/domain";

it('migrates old language and letters, preserves messages and rejects unknown recipients', () => {
  const session=seedSession();
  const {language, letters, ...legacy}=session;
  const migrated=parseSession(JSON.stringify(legacy));
  expect(migrated.language).toBe('vi');expect(migrated.letters).toEqual([]);
  session.language='en';session.playerPose={x:10,z:-8,yaw:0};
  session.letters=[{id:'letter-1',recipientId:'colleague-linh',body:'Xin chào!',createdAt:new Date().toISOString()}];
  expect(parseSession(JSON.stringify(session))).toEqual(session);
  session.letters[0].recipientId='unknown';
  expect(()=>parseSession(JSON.stringify(session))).toThrow();
});

function sample(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "issue-1",
    sessionId: "session-1",
    stepId: 0,
    locationId: "side-entry",
    category: "entrance",
    kind: "verification",
    impact: "normal",
    description: "Xác minh giờ mở lối bên hông.",
    requestedSupport: "",
    state: "draft",
    createdAt: "2026-09-21T12:00:00Z",
    updatedAt: "2026-09-21T12:00:00Z",
    ...overrides,
  };
}
describe("assignments and idempotency", () => {
  it("assigns physical barriers to Facilities and meeting support to HR", () => {
    expect(ownerFor(sample())).toBe("Facilities");
    expect(ownerFor(sample({ category: "captions" }))).toBe("HR");
    expect(ownerFor(sample({ category: "quiet" }))).toBe("Facilities");
    expect(
      ownerFor(sample({ category: "guidance", locationId: "quiet" })),
    ).toBe("HR");
  });
  it("preserves distinct issues at one location and does not duplicate resubmissions", () => {
    const issues = [
      sample(),
      sample({
        id: "issue-2",
        impact: "high",
        description: "Cần xác minh độ rộng cửa.",
      }),
    ];
    const tasks = createTasks(issues, [], "2026-10-01");
    expect(tasks).toHaveLength(2);
    expect(tasks[1].priority).toBe("high");
    expect(tasks[0].dueDate).toBe("2026-09-30");
    expect(createTasks(issues, tasks, "2026-10-01")).toEqual(tasks);
    expect(createTasks([sample(), sample()], [], "2026-10-01")).toHaveLength(1);
  });
  it("uses office timezone and handles month/year/leap boundaries without silently extending overdue dates", () => {
    expect(officeDate(new Date("2026-09-21T18:00:00Z"))).toBe("2026-09-22");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(createTasks([sample()], [], "2020-01-01")[0].dueDate).toBe(
      "2019-12-31",
    );
  });
});
describe("preparation lifecycle", () => {
  const task = createTasks([sample()], [], "2026-10-01")[0];
  it("requires preparation and employee review, with history preserved", () => {
    expect(() => transitionTask(task, "done", "HR/Facilities")).toThrow();
    expect(() =>
      transitionTask(task, "ready_for_review", "HR/Facilities", "Sẵn sàng"),
    ).toThrow();
    const started = transitionTask(task, "in_progress", "HR/Facilities");
    expect(() =>
      transitionTask(started, "ready_for_review", "HR/Facilities", "  "),
    ).toThrow();
    const review = transitionTask(
      started,
      "ready_for_review",
      "HR/Facilities",
      "Mở cửa từ 08:00, lễ tân hỗ trợ.",
    );
    expect(() => transitionTask(review, "done", "HR/Facilities")).toThrow();
    expect(() =>
      transitionTask(review, "in_progress", "Nhân viên", ""),
    ).toThrow();
    const reopened = transitionTask(
      review,
      "in_progress",
      "Nhân viên",
      "Tôi cần đến lúc 07:30.",
    );
    expect(reopened.employeeResponse).toContain("07:30");
    const revised = transitionTask(
      reopened,
      "ready_for_review",
      "HR/Facilities",
      "Đã bố trí mở từ 07:15.",
    );
    const done = transitionTask(revised, "done", "Nhân viên");
    expect(done.status).toBe("done");
    expect(done.history).toHaveLength(6);
    expect(() =>
      transitionTask(done, "in_progress", "HR/Facilities"),
    ).toThrow();
  });
});
describe("saved sessions and route references", () => {
  it("round-trips a complete linked session", () => {
    const s = seedSession();
    s.issues = [sample({ sessionId: s.id, state: "submitted" })];
    s.tasks = createTasks(s.issues, [], s.startDate);
    expect(parseSession(JSON.stringify(s))).toEqual(s);
  });
  it("rejects malformed, outdated, invalid dates and broken references", () => {
    const s = seedSession();
    expect(() => parseSession("not-json")).toThrow();
    expect(() =>
      parseSession(JSON.stringify({ ...s, schemaVersion: 99 })),
    ).toThrow();
    expect(() =>
      parseSession(JSON.stringify({ ...s, startDate: "2026-02-31" })),
    ).toThrow();
    expect(() =>
      parseSession(
        JSON.stringify({
          ...s,
          issues: [sample({ sessionId: s.id, locationId: "missing" })],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseSession(
        JSON.stringify({
          ...s,
          tasks: createTasks([sample()], [], s.startDate),
        }),
      ),
    ).toThrow();
    expect(() =>
      parseSession(JSON.stringify({ ...s, answers: { missing: "barrier" } })),
    ).toThrow();
  });
  it("every journey and hotspot has an available destination and finite route", () => {
    expect(locations.length).toBeGreaterThanOrEqual(10);
    for (const step of journey)
      expect(locations.some((l) => l.id === step.locationId)).toBe(true);
    for (const location of locations)
      for (const stepFree of [false, true]) {
        const route = routeFor(location.id, stepFree);
        expect(route.length).toBeGreaterThan(1);
        expect(route.flat().every(Number.isFinite)).toBe(true);
        expect(route.at(-1)?.[0]).toBe(location.position[0]);
        expect(route.at(-1)?.[2]).toBe(location.position[2]);
      }
  });
});

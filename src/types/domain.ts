import { z } from 'zod';

export type Point = [number, number, number];
export type Floor = 'ground' | 'office';
export const categories = ['entrance', 'furniture', 'restroom', 'captions', 'quiet', 'guidance'] as const;
export type Category = typeof categories[number];
export const categoryLabels: Record<Category, string> = {
  entrance: 'Lối đi không có bậc thang', furniture: 'Bàn làm việc & lối đi',
  restroom: 'Nhà vệ sinh phù hợp', captions: 'Phụ đề & tài liệu họp',
  quiet: 'Không gian ít tiếng ồn', guidance: 'Hướng dẫn & người hỗ trợ',
};
export interface Location {
  id: string; floor: Floor; name: string; shortName: string; position: Point;
  category: Category; description: string; fact: string; contact: string; step: number;
}
export interface JourneyStep {
  id: number; time: string; title: string; subtitle: string; locationId: string;
  instructions: string[]; checklist: { id: string; label: string; category: Category; suggestion: string }[];
}
export const taskStatuses = ['todo', 'in_progress', 'ready_for_review', 'done'] as const;
export type TaskStatus = typeof taskStatuses[number];
export const statusLabels: Record<TaskStatus, string> = {
  todo: 'Cần xử lý', in_progress: 'Đang chuẩn bị', ready_for_review: 'Chờ xác nhận', done: 'Đã hoàn tất',
};
export const priorityLabels = { normal: 'Thông thường', medium: 'Trung bình', high: 'Cao' };
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const parsed = new Date(v + 'T12:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
});
const id = z.string().min(1);
export const issueSchema = z.object({
  id, sessionId: id, stepId: z.number().int().min(0).max(6), locationId: id,
  checklistId: z.string().optional(), category: z.enum(categories),
  kind: z.enum(['verification', 'barrier']), impact: z.enum(['normal', 'medium', 'high']),
  description: z.string().trim().min(3).max(1000), requestedSupport: z.string().max(1000),
  state: z.enum(['draft', 'submitted']), createdAt: z.string(), updatedAt: z.string(),
});
export type Issue = z.infer<typeof issueSchema>;
export const taskSchema = z.object({
  id, issueIds: z.array(id).min(1), title: z.string(), locationId: id,
  ownerTeam: z.enum(['HR', 'Facilities']), assignee: z.string(),
  priority: z.enum(['normal', 'medium', 'high']), dueDate: date,
  status: z.enum(taskStatuses), resolutionNote: z.string(), employeeResponse: z.string(),
  history: z.array(z.object({ at: z.string(), actor: z.string(), message: z.string() })),
});
export type Task = z.infer<typeof taskSchema>;
export const sessionSchema = z.object({
  schemaVersion: z.literal(1), id, started: z.boolean(), startDate: date,
  selectedNeeds: z.array(z.enum(categories)), currentStep: z.number().int().min(0).max(6),
  stepStatuses: z.array(z.enum(['pending', 'completed', 'skipped'])).length(7),
  answers: z.record(z.string(), z.enum(['looks_suitable', 'needs_verification', 'barrier'])),
  issues: z.array(issueSchema), tasks: z.array(taskSchema), reducedMotion: z.boolean(),
});
export type Session = z.infer<typeof sessionSchema>;

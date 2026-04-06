import { z } from 'zod';

export const taskFormSchema = z.object({
  taskName: z.string().min(1, '任务名称不能为空').max(200, '任务名称不能超过200字符'),
  taskType: z.enum(['survey', 'design', 'development', 'testing', 'deployment', 'training', 'other']),
  description: z.string().max(2000, '描述不能超过2000字符').optional(),
  assigneeId: z.number().int().positive().optional().nullable(),
  estimatedHours: z.number().min(0).max(9999).optional().nullable(),
  actualHours: z.number().min(0).max(9999).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  parentId: z.number().int().positive().optional().nullable(),
});

export type TaskFormSchema = z.infer<typeof taskFormSchema>;

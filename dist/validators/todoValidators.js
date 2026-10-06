"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTodoSchema = exports.createTodoSchema = void 0;
const zod_1 = require("zod");
exports.createTodoSchema = zod_1.z.object({
    title: zod_1.z
        .string({ required_error: 'Task title is required' })
        .trim()
        .min(1, 'Task title cannot be empty')
        .max(200, 'Task title cannot exceed 200 characters'),
    description: zod_1.z.string().trim().max(1000).optional().default(''),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
    dueTimeSlot: zod_1.z.enum(['MORNING', 'EVENING', 'NIGHT']).optional().default('MORNING'),
    dueDate: zod_1.z
        .string()
        .optional()
        .nullable()
        .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid due date format' })
});
exports.updateTodoSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(1).max(200).optional(),
    description: zod_1.z.string().trim().max(1000).optional().nullable(),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    dueTimeSlot: zod_1.z.enum(['MORNING', 'EVENING', 'NIGHT']).optional(),
    isCompleted: zod_1.z.boolean().optional(),
    dueDate: zod_1.z
        .string()
        .optional()
        .nullable()
        .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid due date format' })
});

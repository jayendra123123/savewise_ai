"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expenseQuerySchema = exports.updateExpenseSchema = exports.createExpenseSchema = void 0;
const zod_1 = require("zod");
const Expense_1 = require("../models/Expense");
exports.createExpenseSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('Amount must be greater than zero'),
    category: zod_1.z.enum(Expense_1.EXPENSE_CATEGORIES, {
        errorMap: () => ({ message: 'Invalid expense category' })
    }),
    date: zod_1.z
        .string()
        .optional()
        .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Invalid date format'
    }),
    description: zod_1.z.string().min(1, 'Description is required').max(150),
    note: zod_1.z.string().max(500).optional()
});
exports.updateExpenseSchema = exports.createExpenseSchema.partial();
exports.expenseQuerySchema = zod_1.z.object({
    category: zod_1.z.enum(Expense_1.EXPENSE_CATEGORIES).optional(),
    month: zod_1.z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format')
        .optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.string().regex(/^\d+$/).default('1'),
    limit: zod_1.z.string().regex(/^\d+$/).default('50')
});

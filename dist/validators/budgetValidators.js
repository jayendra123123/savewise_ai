"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBudgetsQuerySchema = exports.setBudgetSchema = void 0;
const zod_1 = require("zod");
const Expense_1 = require("../models/Expense");
exports.setBudgetSchema = zod_1.z.object({
    category: zod_1.z.enum(Expense_1.EXPENSE_CATEGORIES, {
        errorMap: () => ({ message: 'Invalid category for budget' })
    }),
    budgetAmount: zod_1.z.number().min(0, 'Budget amount must be positive or zero'),
    monthYear: zod_1.z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format')
});
exports.getBudgetsQuerySchema = zod_1.z.object({
    month: zod_1.z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format')
        .optional()
});

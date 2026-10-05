"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGoalSchema = exports.createGoalSchema = void 0;
const zod_1 = require("zod");
const FinancialGoal_1 = require("../models/FinancialGoal");
exports.createGoalSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Goal title is required').max(100),
    category: zod_1.z.enum(FinancialGoal_1.GOAL_CATEGORIES, {
        errorMap: () => ({ message: 'Invalid goal category' })
    }),
    targetAmount: zod_1.z.number().positive('Target amount must be greater than zero'),
    currentAmount: zod_1.z.number().min(0).default(0),
    monthlyContribution: zod_1.z.number().min(0, 'Monthly contribution must be positive or zero'),
    targetDate: zod_1.z.string().optional()
});
exports.updateGoalSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(100).optional(),
    category: zod_1.z.enum(FinancialGoal_1.GOAL_CATEGORIES).optional(),
    targetAmount: zod_1.z.number().positive().optional(),
    currentAmount: zod_1.z.number().min(0).optional(),
    monthlyContribution: zod_1.z.number().min(0).optional(),
    status: zod_1.z.enum(['IN_PROGRESS', 'COMPLETED', 'PAUSED']).optional(),
    targetDate: zod_1.z.string().optional(),
    addContribution: zod_1.z.number().positive().optional()
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiCoachResponseSchema = void 0;
const zod_1 = require("zod");
exports.AiCoachResponseSchema = zod_1.z.object({
    summary: zod_1.z.string().min(10),
    financialSummary: zod_1.z
        .object({
        earnedText: zod_1.z.string(),
        spentText: zod_1.z.string(),
        savedText: zod_1.z.string(),
        targetStatusText: zod_1.z.string(),
        momChangeText: zod_1.z.string()
    })
        .optional(),
    spendingAnalysis: zod_1.z
        .object({
        overview: zod_1.z.string(),
        topCategoryInsights: zod_1.z.array(zod_1.z.string()).default([]),
        unnecessarySpending: zod_1.z.array(zod_1.z.string()).default([])
    })
        .optional(),
    warnings: zod_1.z.array(zod_1.z.string()).default([]),
    saveMoreOpportunities: zod_1.z
        .array(zod_1.z.object({
        category: zod_1.z.string(),
        insight: zod_1.z.string(),
        suggestedCut: zod_1.z.number().optional(),
        potentialSavings: zod_1.z.number().optional(),
        projectedSavingsTotal: zod_1.z.number().optional()
    }))
        .default([]),
    goalProgress: zod_1.z
        .array(zod_1.z.object({
        goalTitle: zod_1.z.string(),
        progressText: zod_1.z.string(),
        advice: zod_1.z.string()
    }))
        .default([]),
    actionPlan: zod_1.z.array(zod_1.z.string()).default([]),
    insights: zod_1.z.array(zod_1.z.string()).default([]),
    recommendations: zod_1.z.array(zod_1.z.string()).default([]),
    goalAdvice: zod_1.z.array(zod_1.z.string()).default([]),
    disclaimer: zod_1.z
        .string()
        .default('SaveWise AI Financial Coach insights are for educational and informational purposes only and do not constitute certified financial advice.')
});

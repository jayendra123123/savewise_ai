"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiCoachResponseSchema = void 0;
const zod_1 = require("zod");
exports.AiCoachResponseSchema = zod_1.z.object({
    summary: zod_1.z.string().min(10),
    insights: zod_1.z.array(zod_1.z.string()).min(1),
    warnings: zod_1.z.array(zod_1.z.string()),
    recommendations: zod_1.z.array(zod_1.z.string()).min(1),
    goalAdvice: zod_1.z.array(zod_1.z.string()),
    disclaimer: zod_1.z
        .string()
        .default('AI insights are for educational and informational purposes only and are not professional financial advice.')
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    monthlyIncome: zod_1.z.number().min(0, 'Monthly income must be greater than or equal to 0'),
    monthlySavingsTarget: zod_1.z.number().min(0, 'Monthly savings target must be greater than or equal to 0'),
    currency: zod_1.z.string().min(1).max(5).default('₹'),
    fullName: zod_1.z.string().min(2).optional()
});

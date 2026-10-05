"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Please provide a valid email address'),
    password: zod_1.z
        .string()
        .min(6, 'Password must be at least 6 characters long')
        .max(100, 'Password is too long'),
    fullName: zod_1.z.string().min(2, 'Full name must be at least 2 characters').trim()
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Please provide a valid email address'),
    password: zod_1.z.string().min(1, 'Password is required')
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required')
});

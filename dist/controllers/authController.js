"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const authService_1 = require("../services/authService");
const authValidators_1 = require("../validators/authValidators");
const apiResponse_1 = require("../utils/apiResponse");
class AuthController {
    static async register(req, res, next) {
        try {
            const validated = authValidators_1.registerSchema.parse(req.body);
            const result = await authService_1.AuthService.register(validated.email, validated.password, validated.fullName);
            (0, apiResponse_1.sendSuccess)(res, result, 'User registered successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    static async login(req, res, next) {
        try {
            const validated = authValidators_1.loginSchema.parse(req.body);
            const result = await authService_1.AuthService.login(validated.email, validated.password);
            (0, apiResponse_1.sendSuccess)(res, result, 'Logged in successfully');
        }
        catch (err) {
            if (err.message === 'Invalid email or password.') {
                (0, apiResponse_1.sendError)(res, err.message, 401);
                return;
            }
            next(err);
        }
    }
    static async refresh(req, res, next) {
        try {
            const validated = authValidators_1.refreshTokenSchema.parse(req.body);
            const tokens = await authService_1.AuthService.refreshToken(validated.refreshToken);
            (0, apiResponse_1.sendSuccess)(res, { tokens }, 'Tokens refreshed successfully');
        }
        catch (err) {
            (0, apiResponse_1.sendError)(res, err.message || 'Failed to refresh token', 401);
        }
    }
    static async logout(req, res, next) {
        try {
            if (req.user?.userId) {
                await authService_1.AuthService.logout(req.user.userId);
            }
            (0, apiResponse_1.sendSuccess)(res, null, 'Logged out successfully');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AuthController = AuthController;

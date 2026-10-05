"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
const FinancialProfile_1 = require("../models/FinancialProfile");
const jwt_1 = require("../utils/jwt");
class AuthService {
    static async register(email, password, fullName) {
        const existing = await User_1.User.findOne({ email: email.toLowerCase() });
        if (existing) {
            throw new Error('An account with this email address already exists.');
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const user = await User_1.User.create({
            email: email.toLowerCase(),
            passwordHash,
            fullName
        });
        // Create an initial empty financial profile for the user
        await FinancialProfile_1.FinancialProfile.create({
            userId: user._id,
            monthlyIncome: 0,
            monthlySavingsTarget: 0,
            availableSpendingBudget: 0,
            currency: '₹',
            onboardingCompleted: false
        });
        const tokens = await this.issueTokens(user);
        return {
            user: {
                id: user._id.toString(),
                email: user.email,
                fullName: user.fullName
            },
            tokens,
            onboardingCompleted: false
        };
    }
    static async login(email, password) {
        const user = await User_1.User.findOne({ email: email.toLowerCase() });
        if (!user) {
            throw new Error('Invalid email or password.');
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            throw new Error('Invalid email or password.');
        }
        const profile = await FinancialProfile_1.FinancialProfile.findOne({ userId: user._id });
        const tokens = await this.issueTokens(user);
        return {
            user: {
                id: user._id.toString(),
                email: user.email,
                fullName: user.fullName
            },
            tokens,
            onboardingCompleted: profile?.onboardingCompleted ?? false
        };
    }
    static async refreshToken(refreshToken) {
        try {
            const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
            const user = await User_1.User.findById(decoded.userId);
            if (!user || !user.refreshTokenHash) {
                throw new Error('Invalid refresh token session.');
            }
            const isTokenMatch = await bcryptjs_1.default.compare(refreshToken, user.refreshTokenHash);
            if (!isTokenMatch) {
                throw new Error('Invalid refresh token.');
            }
            return await this.issueTokens(user);
        }
        catch (err) {
            throw new Error('Refresh token is expired or invalid.');
        }
    }
    static async logout(userId) {
        await User_1.User.findByIdAndUpdate(userId, { refreshTokenHash: null });
    }
    static async issueTokens(user) {
        const payload = { userId: user._id.toString(), email: user.email };
        const accessToken = (0, jwt_1.generateAccessToken)(payload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(payload);
        // Store bcrypt hash of refresh token for secure revocation
        const tokenSalt = await bcryptjs_1.default.genSalt(10);
        const refreshTokenHash = await bcryptjs_1.default.hash(refreshToken, tokenSalt);
        user.refreshTokenHash = refreshTokenHash;
        await user.save();
        return { accessToken, refreshToken };
    }
}
exports.AuthService = AuthService;

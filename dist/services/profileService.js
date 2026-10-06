"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const FinancialProfile_1 = require("../models/FinancialProfile");
const User_1 = require("../models/User");
const financialEngine_1 = require("../calculations/financialEngine");
class ProfileService {
    static async getProfile(userId) {
        const user = await User_1.User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        let profile = await FinancialProfile_1.FinancialProfile.findOne({ userId });
        if (!profile) {
            profile = await FinancialProfile_1.FinancialProfile.create({
                userId,
                monthlyIncome: 0,
                monthlySavingsTarget: 0,
                availableSpendingBudget: 0,
                currency: '₹',
                onboardingCompleted: false
            });
        }
        return {
            user: {
                id: user._id.toString(),
                email: user.email,
                fullName: user.fullName
            },
            financialProfile: {
                monthlyIncome: profile.monthlyIncome,
                monthlySavingsTarget: profile.monthlySavingsTarget,
                availableSpendingBudget: profile.availableSpendingBudget,
                currency: profile.currency,
                onboardingCompleted: profile.onboardingCompleted
            }
        };
    }
    static async updateProfile(userId, data) {
        if (data.fullName) {
            await User_1.User.findByIdAndUpdate(userId, { fullName: data.fullName });
        }
        const availableBudget = (0, financialEngine_1.calculateAvailableSpendingBudget)(data.monthlyIncome, data.monthlySavingsTarget);
        const profile = await FinancialProfile_1.FinancialProfile.findOneAndUpdate({ userId }, {
            monthlyIncome: data.monthlyIncome,
            monthlySavingsTarget: data.monthlySavingsTarget,
            availableSpendingBudget: availableBudget,
            currency: data.currency || '₹',
            onboardingCompleted: true
        }, { new: true, upsert: true });
        const user = await User_1.User.findById(userId);
        if (!user) {
            throw new Error('User not found. Please log in again.');
        }
        return {
            user: {
                id: user._id.toString(),
                email: user.email,
                fullName: user.fullName
            },
            financialProfile: {
                monthlyIncome: profile.monthlyIncome,
                monthlySavingsTarget: profile.monthlySavingsTarget,
                availableSpendingBudget: profile.availableSpendingBudget,
                currency: profile.currency,
                onboardingCompleted: profile.onboardingCompleted
            }
        };
    }
}
exports.ProfileService = ProfileService;

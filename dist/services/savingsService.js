"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavingsService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const SavingsRecord_1 = require("../models/SavingsRecord");
const FinancialProfile_1 = require("../models/FinancialProfile");
const Expense_1 = require("../models/Expense");
const financialEngine_1 = require("../calculations/financialEngine");
class SavingsService {
    static async getSavingsSummary(userId, targetMonthYear) {
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const now = new Date();
        const currentMonth = targetMonthYear ||
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        // 1. Get user profile
        const profile = await FinancialProfile_1.FinancialProfile.findOne({ userId: userObjectId });
        const monthlyIncome = profile?.monthlyIncome || 0;
        const monthlySavingsTarget = profile?.monthlySavingsTarget || 0;
        // 2. Calculate expenses for current month
        const [yearStr, monthStr] = currentMonth.split('-');
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1;
        const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
        const expenseAgg = await Expense_1.Expense.aggregate([
            {
                $match: {
                    userId: userObjectId,
                    date: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);
        const totalExpenses = expenseAgg[0]?.total || 0;
        const actualSavings = (0, financialEngine_1.calculateActualSavings)(monthlyIncome, totalExpenses);
        const savingsRate = (0, financialEngine_1.calculateSavingsRate)(actualSavings, monthlyIncome);
        const targetAchieved = actualSavings >= monthlySavingsTarget && monthlySavingsTarget > 0;
        const annualTargetProjection = (0, financialEngine_1.calculateAnnualTargetProjection)(monthlySavingsTarget);
        // Save or update current month record in database
        await SavingsRecord_1.SavingsRecord.findOneAndUpdate({ userId: userObjectId, monthYear: currentMonth }, {
            income: monthlyIncome,
            targetSavings: monthlySavingsTarget,
            actualSavings,
            totalExpenses,
            savingsRate,
            targetAchieved
        }, { upsert: true, new: true });
        // 3. Fetch past 12 months history
        const pastRecords = await SavingsRecord_1.SavingsRecord.find({ userId: userObjectId })
            .sort({ monthYear: -1 })
            .limit(12);
        return {
            currentMonth,
            monthlySavingsTarget,
            actualSavings,
            savingsRate,
            totalExpenses,
            monthlyIncome,
            annualTargetProjection,
            targetAchieved,
            history: pastRecords.map((r) => ({
                monthYear: r.monthYear,
                income: r.income,
                targetSavings: r.targetSavings,
                actualSavings: r.actualSavings,
                totalExpenses: r.totalExpenses,
                savingsRate: r.savingsRate,
                targetAchieved: r.targetAchieved
            }))
        };
    }
}
exports.SavingsService = SavingsService;

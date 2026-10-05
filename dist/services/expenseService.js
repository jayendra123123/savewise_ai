"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Expense_1 = require("../models/Expense");
class ExpenseService {
    static async createExpense(userId, data) {
        const expenseDate = data.date ? new Date(data.date) : new Date();
        const expense = await Expense_1.Expense.create({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            amount: data.amount,
            category: data.category,
            date: expenseDate,
            description: data.description,
            note: data.note
        });
        return expense;
    }
    static async updateExpense(userId, expenseId, data) {
        const updateData = { ...data };
        if (data.date) {
            updateData.date = new Date(data.date);
        }
        const expense = await Expense_1.Expense.findOneAndUpdate({ _id: expenseId, userId: new mongoose_1.default.Types.ObjectId(userId) }, updateData, { new: true });
        if (!expense) {
            throw new Error('Expense not found or unauthorized to update.');
        }
        return expense;
    }
    static async deleteExpense(userId, expenseId) {
        const result = await Expense_1.Expense.findOneAndDelete({
            _id: expenseId,
            userId: new mongoose_1.default.Types.ObjectId(userId)
        });
        if (!result) {
            throw new Error('Expense not found or unauthorized to delete.');
        }
    }
    static async getExpenses(userId, params) {
        const page = Math.max(1, Number(params.page) || 1);
        const limit = Math.max(1, Math.min(100, Number(params.limit) || 50));
        const skip = (page - 1) * limit;
        const filter = {
            userId: new mongoose_1.default.Types.ObjectId(userId)
        };
        if (params.category) {
            filter.category = params.category;
        }
        if (params.month) {
            // month is 'YYYY-MM'
            const [yearStr, monthStr] = params.month.split('-');
            const year = parseInt(yearStr, 10);
            const monthIndex = parseInt(monthStr, 10) - 1;
            const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
            const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
            filter.date = { $gte: startOfMonth, $lte: endOfMonth };
        }
        else if (params.startDate || params.endDate) {
            filter.date = {};
            if (params.startDate) {
                filter.date.$gte = new Date(params.startDate);
            }
            if (params.endDate) {
                filter.date.$lte = new Date(params.endDate);
            }
        }
        if (params.search && params.search.trim()) {
            const searchRegex = new RegExp(params.search.trim(), 'i');
            filter.$or = [
                { description: searchRegex },
                { note: searchRegex }
            ];
        }
        const [expenses, total, sumResult] = await Promise.all([
            Expense_1.Expense.find(filter)
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Expense_1.Expense.countDocuments(filter),
            Expense_1.Expense.aggregate([
                { $match: filter },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ])
        ]);
        const totalAmount = sumResult[0]?.total || 0;
        return {
            expenses,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
            totalAmount
        };
    }
    static async getCategoryTotals(userId, monthYear // 'YYYY-MM'
    ) {
        const [yearStr, monthStr] = monthYear.split('-');
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1;
        const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
        const result = await Expense_1.Expense.aggregate([
            {
                $match: {
                    userId: new mongoose_1.default.Types.ObjectId(userId),
                    date: { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: '$category',
                    amount: { $sum: '$amount' }
                }
            },
            {
                $sort: { amount: -1 }
            }
        ]);
        return result.map((item) => ({
            category: item._id,
            amount: Math.round(item.amount * 100) / 100
        }));
    }
}
exports.ExpenseService = ExpenseService;

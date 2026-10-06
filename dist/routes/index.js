"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authRoutes_1 = __importDefault(require("./authRoutes"));
const profileRoutes_1 = __importDefault(require("./profileRoutes"));
const expenseRoutes_1 = __importDefault(require("./expenseRoutes"));
const budgetRoutes_1 = __importDefault(require("./budgetRoutes"));
const savingsRoutes_1 = __importDefault(require("./savingsRoutes"));
const goalRoutes_1 = __importDefault(require("./goalRoutes"));
const dashboardRoutes_1 = __importDefault(require("./dashboardRoutes"));
const reportRoutes_1 = __importDefault(require("./reportRoutes"));
const aiRoutes_1 = __importDefault(require("./aiRoutes"));
const analysisRoutes_1 = __importDefault(require("./analysisRoutes"));
const marketRoutes_1 = __importDefault(require("./marketRoutes"));
const todoRoutes_1 = __importDefault(require("./todoRoutes"));
const router = (0, express_1.Router)();
router.use('/auth', authRoutes_1.default);
router.use('/profile', profileRoutes_1.default);
router.use('/expenses', expenseRoutes_1.default);
router.use('/budgets', budgetRoutes_1.default);
router.use('/savings', savingsRoutes_1.default);
router.use('/goals', goalRoutes_1.default);
router.use('/dashboard', dashboardRoutes_1.default);
router.use('/reports', reportRoutes_1.default);
router.use('/ai', aiRoutes_1.default);
router.use('/analysis', analysisRoutes_1.default);
router.use('/market', marketRoutes_1.default);
router.use('/todos', todoRoutes_1.default);
// Health check endpoint
router.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'SaveWise AI Backend',
        timestamp: new Date().toISOString()
    });
});
exports.default = router;

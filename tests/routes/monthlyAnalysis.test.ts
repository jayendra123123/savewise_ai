import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';
import { config } from '../../src/config/env';

const app = createApp();

describe('Monthly Financial Analysis API & Calculations', () => {
  let accessToken: string;
  let otherAccessToken: string;
  const testEmail = `analysis_user_${Date.now()}@savewise.app`;
  const otherEmail = `other_user_${Date.now()}@savewise.app`;

  beforeAll(async () => {
    await mongoose.connect(config.mongodbUri);

    // Register primary user
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: 'Password123!',
        fullName: 'Analysis Test User'
      });
    accessToken = res.body.data.tokens.accessToken;

    // Set profile: Income = 30000, Target = 10000, Spending Budget = 20000
    await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        monthlyIncome: 30000,
        monthlySavingsTarget: 10000,
        currency: '₹'
      });

    // Register second user for user isolation test
    const resOther = await request(app)
      .post('/api/auth/register')
      .send({
        email: otherEmail,
        password: 'Password123!',
        fullName: 'Other Isolation User'
      });
    otherAccessToken = resOther.body.data.tokens.accessToken;

    await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .send({
        monthlyIncome: 50000,
        monthlySavingsTarget: 20000,
        currency: '₹'
      });

    // Create expenses for primary user in October 2026 (2026-10)
    // Total = 13000: Gold=5000, Food=1500, Home=2000, Tablet/Shopping=2000, Daily=1000, Other Food=1500
    const octExpenses = [
      { amount: 5000, category: 'Gold / Investment', description: 'Gold bullion', date: '2026-10-12T10:00:00.000Z' },
      { amount: 2000, category: 'Shopping', description: 'Tablet', date: '2026-10-05T10:00:00.000Z' },
      { amount: 2000, category: 'Home', description: 'Kitchen supplies', date: '2026-10-08T10:00:00.000Z' },
      { amount: 1500, category: 'Food', description: 'Restaurant dinner', date: '2026-10-15T10:00:00.000Z' },
      { amount: 1500, category: 'Food', description: 'Groceries', date: '2026-10-20T10:00:00.000Z' },
      { amount: 1000, category: 'Daily Expenses', description: 'Coffee & snacks', date: '2026-10-02T10:00:00.000Z' }
    ];

    for (const exp of octExpenses) {
      await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(exp);
    }

    // Create expenses for primary user in September 2026 (2026-09)
    // Total = 11000: Gold=3000, Food=1000, Home=2500, Shopping=2500, Daily=2000
    const sepExpenses = [
      { amount: 3000, category: 'Gold / Investment', description: 'Gold coin', date: '2026-09-10T10:00:00.000Z' },
      { amount: 1000, category: 'Food', description: 'Supermarket', date: '2026-09-12T10:00:00.000Z' },
      { amount: 2500, category: 'Home', description: 'Home decor', date: '2026-09-18T10:00:00.000Z' },
      { amount: 2500, category: 'Shopping', description: 'Clothes', date: '2026-09-22T10:00:00.000Z' },
      { amount: 2000, category: 'Daily Expenses', description: 'Transport & snacks', date: '2026-09-28T10:00:00.000Z' }
    ];

    for (const exp of sepExpenses) {
      await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(exp);
    }

    // Set October budgets: Food=3500, Gold=4000
    await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ category: 'Food', budgetAmount: 3500, monthYear: '2026-10' });

    await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ category: 'Gold / Investment', budgetAmount: 4000, monthYear: '2026-10' });
  });

  afterAll(async () => {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
  });

  it('1. Returns accurate monthly summary for selected month (2026-10)', async () => {
    const res = await request(app)
      .get('/api/analysis/monthly?month=2026-10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;

    expect(d.selectedMonth).toBe('2026-10');
    expect(d.monthLabel).toBe('October 2026');
    expect(d.previousMonth).toBe('2026-09');

    // Summary calculations
    expect(d.summary.monthlyIncome).toBe(30000);
    expect(d.summary.savingsTarget).toBe(10000);
    expect(d.summary.totalExpenses).toBe(13000); // 5000+2000+2000+1500+1500+1000
    expect(d.summary.availableSpendingBudget).toBe(20000); // 30000 - 10000
    expect(d.summary.remainingBudget).toBe(7000); // 20000 - 13000
    expect(d.summary.actualSavings).toBe(17000); // 30000 - 13000
    expect(d.summary.savingsRate).toBe(56.7); // (17000 / 30000) * 100 = 56.7%
    expect(d.summary.transactionCount).toBe(6);
    expect(d.summary.isTargetAchieved).toBe(true);
    expect(d.summary.savingsTargetDifference).toBe(7000);
  });

  it('2. Computes MoM comparison accurately (2026-10 vs 2026-09)', async () => {
    const res = await request(app)
      .get('/api/analysis/monthly?month=2026-10')
      .set('Authorization', `Bearer ${accessToken}`);

    const c = res.body.data.comparison;
    expect(c.currentMonthExpenses).toBe(13000);
    expect(c.previousMonthExpenses).toBe(11000);
    expect(c.difference).toBe(2000); // +2000
    expect(c.percentageChange).toBe(18.2); // (2000 / 11000) * 100 = +18.2%
    expect(c.trend).toBe('INCREASED');
    expect(c.indicatorMessage).toContain('You spent ₹2,000 more than last month');
  });

  it('3. Identifies top category and individual highest expenses', async () => {
    const res = await request(app)
      .get('/api/analysis/monthly?month=2026-10')
      .set('Authorization', `Bearer ${accessToken}`);

    const topCat = res.body.data.topCategory;
    expect(topCat).toBeDefined();
    expect(topCat.category).toBe('Gold / Investment');
    expect(topCat.amount).toBe(5000);
    expect(topCat.highlightText).toContain('Gold / Investment');

    const topTxns = res.body.data.topExpenses;
    expect(topTxns.length).toBeGreaterThanOrEqual(1);
    expect(topTxns[0].amount).toBe(5000);
    expect(topTxns[0].description).toBe('Gold bullion');
  });

  it('4. Detects highest daily spending day correctly', async () => {
    const res = await request(app)
      .get('/api/analysis/monthly?month=2026-10')
      .set('Authorization', `Bearer ${accessToken}`);

    const daily = res.body.data.dailySpending;
    expect(daily.highestDay).toBeDefined();
    expect(daily.highestDay.day).toBe(12);
    expect(daily.highestDay.amount).toBe(5000);
    expect(daily.highestDayHighlight).toContain('October 12 was your highest spending day at ₹5,000');
  });

  it('5. Computes budget performance and over-budget status accurately', async () => {
    const res = await request(app)
      .get('/api/analysis/monthly?month=2026-10')
      .set('Authorization', `Bearer ${accessToken}`);

    const bp = res.body.data.budgetPerformance;
    expect(bp.monthlySpendingBudget).toBe(20000);
    expect(bp.actualSpending).toBe(13000);
    expect(bp.remaining).toBe(7000);
    expect(bp.status).toBe('ON_TRACK');

    // Gold was budgeted 4000, spent 5000 -> OVER_BUDGET
    const goldBudget = bp.categories.find((c: any) => c.category === 'Gold / Investment');
    expect(goldBudget).toBeDefined();
    expect(goldBudget.budgetAmount).toBe(4000);
    expect(goldBudget.actualSpent).toBe(5000);
    expect(goldBudget.status).toBe('OVER_BUDGET');
  });

  it('6. Handles empty months with 0 transactions without crashing', async () => {
    const res = await request(app)
      .get('/api/analysis/monthly?month=2025-05')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.summary.totalExpenses).toBe(0);
    expect(d.summary.transactionCount).toBe(0);
    expect(d.summary.remainingBudget).toBe(20000);
    expect(d.comparison.hasPreviousMonthData).toBe(false);
    expect(d.comparison.indicatorMessage).toBe('No previous-month data available for comparison.');
    expect(d.topCategory).toBeNull();
    expect(d.topExpenses).toHaveLength(0);
  });

  it('7. Enforces strict user isolation', async () => {
    const resOther = await request(app)
      .get('/api/analysis/monthly?month=2026-10')
      .set('Authorization', `Bearer ${otherAccessToken}`);

    expect(resOther.status).toBe(200);
    // Other user should have 0 expenses in October 2026
    expect(resOther.body.data.summary.totalExpenses).toBe(0);
    expect(resOther.body.data.summary.transactionCount).toBe(0);
  });

  it('8. Log First Expense in selected month (2026-09) updates September and leaves October untouched', async () => {
    // Before adding: September = 11,000 (5 txns), October = 13,000 (6 txns)
    const addRes = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 1000,
        category: 'Food',
        description: 'September Farmer Market',
        date: '2026-09-01',
        selectedMonth: '2026-09'
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.success).toBe(true);

    // Verify September analysis
    const sepRes = await request(app)
      .get('/api/analysis/monthly?month=2026-09')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(sepRes.status).toBe(200);
    const sepData = sepRes.body.data;
    expect(sepData.summary.totalExpenses).toBe(12000); // 11,000 + 1,000
    expect(sepData.summary.transactionCount).toBe(6);

    // Verify October analysis is UNTOUCHED
    const octRes = await request(app)
      .get('/api/analysis/monthly?month=2026-10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(octRes.status).toBe(200);
    const octData = octRes.body.data;
    expect(octData.summary.totalExpenses).toBe(13000);
    expect(octData.summary.transactionCount).toBe(6);
  });

  it('9. Expense created with selectedMonth but omitting explicit date defaults to 1st of selectedMonth', async () => {
    // Add August expense without date param, only selectedMonth
    const addRes = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 2500,
        category: 'Transport',
        description: 'August Metro Pass',
        selectedMonth: '2026-08'
      });

    expect(addRes.status).toBe(201);
    const createdExp = addRes.body.data;
    expect(createdExp.amount).toBe(2500);

    // Date must be August 2026
    const expDate = new Date(createdExp.date);
    expect(expDate.getUTCFullYear()).toBe(2026);
    expect(expDate.getUTCMonth()).toBe(7); // 7 = August (0-indexed)

    // Verify August analysis
    const augRes = await request(app)
      .get('/api/analysis/monthly?month=2026-08')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(augRes.status).toBe(200);
    expect(augRes.body.data.summary.totalExpenses).toBe(2500);
    expect(augRes.body.data.summary.transactionCount).toBe(1);

    // Verify September and October remain unchanged
    const sepRes = await request(app)
      .get('/api/analysis/monthly?month=2026-09')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(sepRes.body.data.summary.totalExpenses).toBe(12000);
  });

  it('10. Updating expense date from September to October moves the expense between months', async () => {
    // Create an expense in September
    const addRes = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 800,
        category: 'Entertainment',
        description: 'September Cinema',
        date: '2026-09-15',
        selectedMonth: '2026-09'
      });

    const expenseId = addRes.body.data._id;

    // September is now 12,000 + 800 = 12,800
    let sepRes = await request(app)
      .get('/api/analysis/monthly?month=2026-09')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(sepRes.body.data.summary.totalExpenses).toBe(12800);

    // Move expense to October
    const updateRes = await request(app)
      .put(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        date: '2026-10-15',
        selectedMonth: '2026-10'
      });

    expect(updateRes.status).toBe(200);

    // September should decrease back to 12,000
    sepRes = await request(app)
      .get('/api/analysis/monthly?month=2026-09')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(sepRes.body.data.summary.totalExpenses).toBe(12000);

    // October should increase from 13,000 to 13,800
    const octRes = await request(app)
      .get('/api/analysis/monthly?month=2026-10')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(octRes.body.data.summary.totalExpenses).toBe(13800);
  });

  it('11. Home Dashboard Recent Transactions shows ONLY October transactions when viewing October', async () => {
    const res = await request(app)
      .get('/api/dashboard?month=2026-10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.recentTransactions.length).toBeGreaterThan(0);

    // Every transaction in recentTransactions MUST belong to October 2026
    for (const tx of d.recentTransactions) {
      const txDate = new Date(tx.date);
      expect(txDate.getUTCFullYear()).toBe(2026);
      expect(txDate.getUTCMonth()).toBe(9); // 9 = October (0-indexed)
    }
  });

  it('12. Home Dashboard Recent Transactions shows ONLY September transactions when viewing September', async () => {
    const res = await request(app)
      .get('/api/dashboard?month=2026-09')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.recentTransactions.length).toBeGreaterThan(0);

    // Every transaction in recentTransactions MUST belong to September 2026
    for (const tx of d.recentTransactions) {
      const txDate = new Date(tx.date);
      expect(txDate.getUTCFullYear()).toBe(2026);
      expect(txDate.getUTCMonth()).toBe(8); // 8 = September (0-indexed)
    }
  });

  it('13. Home Dashboard Recent Transactions shows empty array for month with 0 transactions without fallback', async () => {
    const res = await request(app)
      .get('/api/dashboard?month=2025-01')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    // Must be empty array, never showing other months' transactions
    expect(d.recentTransactions).toHaveLength(0);
    expect(d.totalExpenses).toBe(0);
  });

  it('14. Expenses API returns only transactions belonging to the requested month', async () => {
    const resSep = await request(app)
      .get('/api/expenses?month=2026-09')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resSep.status).toBe(200);
    for (const exp of resSep.body.data.expenses) {
      const d = new Date(exp.date);
      expect(d.getUTCFullYear()).toBe(2026);
      expect(d.getUTCMonth()).toBe(8); // September
    }

    const resOct = await request(app)
      .get('/api/expenses?month=2026-10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resOct.status).toBe(200);
    for (const exp of resOct.body.data.expenses) {
      const d = new Date(exp.date);
      expect(d.getUTCFullYear()).toBe(2026);
      expect(d.getUTCMonth()).toBe(9); // October
    }
  });

  it('15. Expenses API returns all historical transactions when month=all', async () => {
    const resAll = await request(app)
      .get('/api/expenses?month=all')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resAll.status).toBe(200);
    const allExpenses = resAll.body.data.expenses;
    // Should contain expenses across August, September, and October
    const months = new Set(allExpenses.map((e: any) => new Date(e.date).getUTCMonth()));
    expect(months.has(7)).toBe(true); // August
    expect(months.has(8)).toBe(true); // September
    expect(months.has(9)).toBe(true); // October
  });
});

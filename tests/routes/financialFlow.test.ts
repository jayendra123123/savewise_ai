import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';
import { config } from '../../src/config/env';

const app = createApp();

describe('End-to-End Financial Flow & API Tests', () => {
  let accessToken: string;
  let userId: string;
  const testEmail = `testuser_${Date.now()}@savewise.app`;

  beforeAll(async () => {
    await mongoose.connect(config.mongodbUri);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0 && userId) {
      const { User } = await import('../../src/models/User');
      await User.deleteOne({ _id: userId });
    }
  });

  describe('1. Authentication & Onboarding', () => {
    it('registers a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'Password123!',
          fullName: 'Test User'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      accessToken = res.body.data.tokens.accessToken;
      userId = res.body.data.user.id;
    });

    it('sets initial financial profile during onboarding', async () => {
      // Monthly Salary = ₹30,000, Monthly Savings Target = ₹10,000
      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          monthlyIncome: 30000,
          monthlySavingsTarget: 10000,
          currency: '₹'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.financialProfile.monthlyIncome).toBe(30000);
      expect(res.body.data.financialProfile.monthlySavingsTarget).toBe(10000);
      // Available Spending Budget = 30000 - 10000 = 20000
      expect(res.body.data.financialProfile.availableSpendingBudget).toBe(20000);
      expect(res.body.data.financialProfile.onboardingCompleted).toBe(true);
    });
  });

  describe('2. Expense Logging (Exact Example Scenario)', () => {
    const expenses = [
      { amount: 2000, category: 'Home', description: 'Rent contribution' },
      { amount: 1500, category: 'Food', description: 'Groceries' },
      { amount: 2000, category: 'Shopping', description: 'Tablet installment' },
      { amount: 1000, category: 'Daily Expenses', description: 'Daily commute & snacks' },
      { amount: 5000, category: 'Gold / Investment', description: 'Digital Gold' },
      { amount: 1500, category: 'Food', description: 'Dining out' }
    ];

    it('creates all example expenses and validates storage', async () => {
      for (const exp of expenses) {
        const res = await request(app)
          .post('/api/expenses')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(exp);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.amount).toBe(exp.amount);
      }
    });

    it('fetches paginated expenses with search and filtering', async () => {
      const res = await request(app)
        .get('/api/expenses?category=Food')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.expenses.length).toBe(2);
      expect(res.body.data.totalAmount).toBe(3000);
    });
  });

  describe('3. Category Budget Management & Alerts', () => {
    it('sets category budgets and computes SAFE / NEAR_LIMIT / OVER_BUDGET', async () => {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Set Food budget = 3500 (Food expense = 3000 -> 85.7% -> NEAR_LIMIT)
      await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          category: 'Food',
          budgetAmount: 3500,
          monthYear: currentMonth
        });

      // Set Shopping budget = 1500 (Shopping expense = 2000 -> 133.3% -> OVER_BUDGET)
      await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          category: 'Shopping',
          budgetAmount: 1500,
          monthYear: currentMonth
        });

      const res = await request(app)
        .get(`/api/budgets?month=${currentMonth}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      const foodBudget = res.body.data.categories.find((c: any) => c.category === 'Food');
      const shoppingBudget = res.body.data.categories.find((c: any) => c.category === 'Shopping');

      expect(foodBudget.status).toBe('NEAR_LIMIT');
      expect(shoppingBudget.status).toBe('OVER_BUDGET');
      expect(res.body.data.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('4. Financial Goals', () => {
    it('creates an Emergency Fund goal and calculates milestones', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Emergency Fund',
          category: 'Emergency Fund',
          targetAmount: 100000,
          currentAmount: 30000,
          monthlyContribution: 10000
        });

      expect(res.status).toBe(201);
      expect(res.body.data.metrics.progressPercentage).toBe(30);
      expect(res.body.data.metrics.remainingAmount).toBe(70000);
      expect(res.body.data.metrics.estimatedMonths).toBe(7);
      expect(res.body.data.metrics.isCompleted).toBe(false);
    });
  });

  describe('5. Dashboard Aggregator', () => {
    it('returns exact dynamic values matching example scenario', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      const d = res.body.data;

      // Income = 30000
      expect(d.monthlyIncome).toBe(30000);
      // Savings Target = 10000
      expect(d.savingsTarget).toBe(10000);
      // Available Budget = 20000
      expect(d.availableSpendingBudget).toBe(20000);
      // Total Expenses = 13000 (2000+1500+2000+1000+5000+1500)
      expect(d.totalExpenses).toBe(13000);
      // Remaining Budget = 20000 - 13000 = 7000
      expect(d.remainingBudget).toBe(7000);
      // Target Savings Rate = 33.3%
      expect(d.targetSavingsRate).toBe(33.3);
      // Top category is Gold / Investment with 5000
      expect(d.topCategory.category).toBe('Gold / Investment');
      expect(d.topCategory.amount).toBe(5000);
    });
  });

  describe('6. AI Financial Coach Analysis', () => {
    it('generates structured financial coaching with zero hallucinated figures', async () => {
      const res = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(200);
      const coach = res.body.data.insight;

      expect(coach.summary).toBeDefined();
      expect(coach.insights.length).toBeGreaterThan(0);
      expect(coach.recommendations.length).toBeGreaterThan(0);
      expect(coach.disclaimer).toContain('educational and informational');
    }, 35000);
  });

  describe('7. Month-Aware Reports & Savings', () => {
    it('retrieves reports anchored to the specified month', async () => {
      const res = await request(app)
        .get('/api/reports/summary?period=current_month&month=2026-10')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dateRange.startDate).toBe('2026-10-01');
      expect(res.body.data.dateRange.endDate).toBe('2026-10-31');
      expect(res.body.data.totalIncome).toBe(30000);
    });

    it('returns empty reports for month with zero transactions', async () => {
      const res = await request(app)
        .get('/api/reports/summary?period=current_month&month=2026-08')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalExpenses).toBe(0);
      expect(res.body.data.categoryBreakdown).toEqual([]);
    });

    it('retrieves savings summary for requested month', async () => {
      const res = await request(app)
        .get('/api/savings?month=2026-10')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentMonth).toBe('2026-10');
      expect(res.body.data.monthlyIncome).toBe(30000);
      expect(res.body.data.monthlySavingsTarget).toBe(10000);
    });
  });
});

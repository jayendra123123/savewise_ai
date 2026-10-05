import mongoose from 'mongoose';
import {
  FinancialGoal,
  IFinancialGoal,
  GoalCategory,
  GoalStatus
} from '../models/FinancialGoal';
import {
  calculateGoalMetrics,
  GoalMetricsResult
} from '../calculations/financialEngine';

export interface GoalWithMetrics {
  id: string;
  title: string;
  category: GoalCategory;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  status: GoalStatus;
  targetDate?: Date;
  metrics: GoalMetricsResult;
  createdAt: Date;
  updatedAt: Date;
}

export class GoalService {
  static async createGoal(
    userId: string,
    data: {
      title: string;
      category: GoalCategory;
      targetAmount: number;
      currentAmount?: number;
      monthlyContribution?: number;
      targetDate?: string;
    }
  ): Promise<GoalWithMetrics> {
    const goal = await FinancialGoal.create({
      userId: new mongoose.Types.ObjectId(userId),
      title: data.title,
      category: data.category,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount || 0,
      monthlyContribution: data.monthlyContribution || 0,
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      status: (data.currentAmount || 0) >= data.targetAmount ? 'COMPLETED' : 'IN_PROGRESS'
    });

    return this.formatGoalWithMetrics(goal);
  }

  static async getGoals(userId: string): Promise<GoalWithMetrics[]> {
    const goals = await FinancialGoal.find({
      userId: new mongoose.Types.ObjectId(userId)
    }).sort({ createdAt: -1 });

    return goals.map((g) => this.formatGoalWithMetrics(g));
  }

  static async updateGoal(
    userId: string,
    goalId: string,
    data: {
      title?: string;
      category?: GoalCategory;
      targetAmount?: number;
      currentAmount?: number;
      monthlyContribution?: number;
      status?: GoalStatus;
      targetDate?: string;
      addContribution?: number;
    }
  ): Promise<GoalWithMetrics> {
    const goal = await FinancialGoal.findOne({
      _id: goalId,
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!goal) {
      throw new Error('Goal not found or unauthorized.');
    }

    if (data.title !== undefined) goal.title = data.title;
    if (data.category !== undefined) goal.category = data.category;
    if (data.targetAmount !== undefined) goal.targetAmount = data.targetAmount;
    if (data.monthlyContribution !== undefined)
      goal.monthlyContribution = data.monthlyContribution;
    if (data.targetDate !== undefined)
      goal.targetDate = data.targetDate ? new Date(data.targetDate) : undefined;

    if (data.addContribution !== undefined) {
      goal.currentAmount += data.addContribution;
    } else if (data.currentAmount !== undefined) {
      goal.currentAmount = data.currentAmount;
    }

    if (data.status !== undefined) {
      goal.status = data.status;
    } else if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'COMPLETED';
    }

    await goal.save();
    return this.formatGoalWithMetrics(goal);
  }

  static async deleteGoal(userId: string, goalId: string): Promise<void> {
    const result = await FinancialGoal.findOneAndDelete({
      _id: goalId,
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!result) {
      throw new Error('Goal not found or unauthorized to delete.');
    }
  }

  private static formatGoalWithMetrics(goal: IFinancialGoal): GoalWithMetrics {
    const metrics = calculateGoalMetrics(
      goal.targetAmount,
      goal.currentAmount,
      goal.monthlyContribution
    );

    return {
      id: goal._id.toString(),
      title: goal.title,
      category: goal.category,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      monthlyContribution: goal.monthlyContribution,
      status: goal.status,
      targetDate: goal.targetDate,
      metrics,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt
    };
  }
}

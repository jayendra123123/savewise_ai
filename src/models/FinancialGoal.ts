import mongoose, { Document, Schema, Types } from 'mongoose';

export const GOAL_CATEGORIES = [
  'Emergency Fund',
  'Phone',
  'Laptop',
  'Bike',
  'Education',
  'Travel',
  'House',
  'Other'
] as const;

export type GoalCategory = (typeof GOAL_CATEGORIES)[number];
export type GoalStatus = 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED';

export interface IFinancialGoal extends Document {
  userId: Types.ObjectId;
  title: string;
  category: GoalCategory;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  status: GoalStatus;
  targetDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialGoalSchema = new Schema<IFinancialGoal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    category: {
      type: String,
      required: true,
      enum: GOAL_CATEGORIES,
      default: 'Emergency Fund'
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 1
    },
    currentAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    monthlyContribution: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'COMPLETED', 'PAUSED'],
      default: 'IN_PROGRESS'
    },
    targetDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

FinancialGoalSchema.index({ userId: 1, status: 1 });

export const FinancialGoal = mongoose.model<IFinancialGoal>(
  'FinancialGoal',
  FinancialGoalSchema
);

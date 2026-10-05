import mongoose, { Document, Schema, Types } from 'mongoose';

export const EXPENSE_CATEGORIES = [
  'Food',
  'Home',
  'Transport',
  'Shopping',
  'Bills',
  'Education',
  'Health',
  'Gold / Investment',
  'Entertainment',
  'Daily Expenses',
  'Other'
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface IExpense extends Document {
  userId: Types.ObjectId;
  amount: number;
  category: ExpenseCategory;
  date: Date;
  description: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    category: {
      type: String,
      required: true,
      enum: EXPENSE_CATEGORIES,
      index: true
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  {
    timestamps: true
  }
);

ExpenseSchema.index({ userId: 1, date: -1 });
ExpenseSchema.index({ userId: 1, category: 1 });

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);

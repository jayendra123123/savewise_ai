import mongoose, { Document, Schema, Types } from 'mongoose';
import { EXPENSE_CATEGORIES, ExpenseCategory } from './Expense';

export interface IBudget extends Document {
  userId: Types.ObjectId;
  category: ExpenseCategory;
  budgetAmount: number;
  monthYear: string; // Format 'YYYY-MM'
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    category: {
      type: String,
      required: true,
      enum: EXPENSE_CATEGORIES
    },
    budgetAmount: {
      type: Number,
      required: true,
      min: 0
    },
    monthYear: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/
    }
  },
  {
    timestamps: true
  }
);

BudgetSchema.index({ userId: 1, category: 1, monthYear: 1 }, { unique: true });

export const Budget = mongoose.model<IBudget>('Budget', BudgetSchema);

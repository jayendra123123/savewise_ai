import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFinancialProfile extends Document {
  userId: Types.ObjectId;
  monthlyIncome: number;
  monthlySavingsTarget: number;
  availableSpendingBudget: number;
  currency: string;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialProfileSchema = new Schema<IFinancialProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    monthlyIncome: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    monthlySavingsTarget: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    availableSpendingBudget: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: '₹',
      trim: true
    },
    onboardingCompleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export const FinancialProfile = mongoose.model<IFinancialProfile>(
  'FinancialProfile',
  FinancialProfileSchema
);

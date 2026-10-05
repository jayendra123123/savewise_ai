import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISavingsRecord extends Document {
  userId: Types.ObjectId;
  monthYear: string; // 'YYYY-MM'
  income: number;
  targetSavings: number;
  actualSavings: number;
  totalExpenses: number;
  savingsRate: number;
  targetAchieved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsRecordSchema = new Schema<ISavingsRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    monthYear: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/
    },
    income: {
      type: Number,
      required: true,
      default: 0
    },
    targetSavings: {
      type: Number,
      required: true,
      default: 0
    },
    actualSavings: {
      type: Number,
      required: true,
      default: 0
    },
    totalExpenses: {
      type: Number,
      required: true,
      default: 0
    },
    savingsRate: {
      type: Number,
      required: true,
      default: 0
    },
    targetAchieved: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

SavingsRecordSchema.index({ userId: 1, monthYear: 1 }, { unique: true });

export const SavingsRecord = mongoose.model<ISavingsRecord>(
  'SavingsRecord',
  SavingsRecordSchema
);

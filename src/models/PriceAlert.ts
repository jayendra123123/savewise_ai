import mongoose, { Document, Schema, Types } from 'mongoose';

export type AssetType = 'STOCK' | 'GOLD' | 'SILVER';
export type AlertCondition = 'ABOVE' | 'BELOW';
export type AlertStatus = 'ACTIVE' | 'TRIGGERED' | 'DISABLED';

export interface IPriceAlert extends Document {
  userId: Types.ObjectId;
  assetType: AssetType;
  symbol: string;
  assetName: string;
  targetPrice: number;
  currency: string;
  condition: AlertCondition;
  initialPrice: number;
  currentPrice: number | null;
  status: AlertStatus;
  triggeredAt: Date | null;
  triggeredPrice: number | null;
  notificationMessage: string | null;
  isRead: boolean;
  emailSent: boolean;
  emailSentAt: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const PriceAlertSchema = new Schema<IPriceAlert>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    assetType: {
      type: String,
      enum: ['STOCK', 'GOLD', 'SILVER'],
      required: true
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    assetName: {
      type: String,
      required: true,
      trim: true
    },
    targetPrice: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
      uppercase: true
    },
    condition: {
      type: String,
      enum: ['ABOVE', 'BELOW'],
      required: true
    },
    initialPrice: {
      type: Number,
      required: true,
      min: 0
    },
    currentPrice: {
      type: Number,
      default: null
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'TRIGGERED', 'DISABLED'],
      default: 'ACTIVE',
      index: true
    },
    triggeredAt: {
      type: Date,
      default: null
    },
    triggeredPrice: {
      type: Number,
      default: null
    },
    notificationMessage: {
      type: String,
      default: null
    },
    isRead: {
      type: Boolean,
      default: false
    },
    emailSent: {
      type: Boolean,
      default: false,
      index: true
    },
    emailSentAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: null,
      maxlength: 250
    }
  },
  {
    timestamps: true
  }
);

PriceAlertSchema.index({ userId: 1, status: 1 });
PriceAlertSchema.index({ status: 1, symbol: 1 });

export const PriceAlert = mongoose.model<IPriceAlert>(
  'PriceAlert',
  PriceAlertSchema
);

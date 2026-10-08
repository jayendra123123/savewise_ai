import mongoose, { Document, Schema, Types } from 'mongoose';

export type AssetType = 'STOCK' | 'GOLD' | 'SILVER';
export type AlertCondition = 'ABOVE' | 'BELOW';
export type AlertStatus = 'ACTIVE' | 'TRIGGERED' | 'DISABLED';
export type AlertIntention = 'BUY_ON_FALL' | 'MONITOR_GROWTH' | 'PRICE_THRESHOLD';

export interface IPriceAlertAiAnalysis {
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  summary: string;
  explanation?: string;
  recommendation?: string;
  educationalTakeaway?: string;
  analyzedAt: Date;
}

export interface IPriceAlert extends Document {
  userId: Types.ObjectId;
  assetType: AssetType;
  symbol: string;
  assetName: string;
  targetPrice: number;
  currency: string;
  condition: AlertCondition;
  intention?: AlertIntention;
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
  aiAnalysis?: IPriceAlertAiAnalysis | null;
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
    intention: {
      type: String,
      enum: ['BUY_ON_FALL', 'MONITOR_GROWTH', 'PRICE_THRESHOLD'],
      default: 'PRICE_THRESHOLD'
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
    },
    aiAnalysis: {
      trend: { type: String, enum: ['BULLISH', 'BEARISH', 'NEUTRAL'] },
      summary: { type: String },
      explanation: { type: String },
      recommendation: { type: String },
      educationalTakeaway: { type: String },
      analyzedAt: { type: Date }
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

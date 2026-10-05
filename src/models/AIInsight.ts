import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAIInsight extends Document {
  userId: Types.ObjectId;
  monthYear: string; // 'YYYY-MM'
  summary: string;
  insights: string[];
  warnings: string[];
  recommendations: string[];
  goalAdvice: string[];
  disclaimer: string;
  rawMetricsSnapshot: Record<string, any>;
  generatedAt: Date;
}

const AIInsightSchema = new Schema<IAIInsight>(
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
    summary: {
      type: String,
      required: true
    },
    insights: {
      type: Schema.Types.Mixed,
      default: []
    },
    warnings: {
      type: Schema.Types.Mixed,
      default: []
    },
    recommendations: {
      type: Schema.Types.Mixed,
      default: []
    },
    goalAdvice: {
      type: Schema.Types.Mixed,
      default: []
    },
    disclaimer: {
      type: String,
      default:
        'AI insights are for educational and informational purposes only and are not professional financial advice.'
    },
    rawMetricsSnapshot: {
      type: Schema.Types.Mixed,
      default: {}
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

AIInsightSchema.index({ userId: 1, monthYear: 1, generatedAt: -1 });

export const AIInsight = mongoose.model<IAIInsight>('AIInsight', AIInsightSchema);

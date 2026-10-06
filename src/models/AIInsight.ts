import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAIInsight extends Document {
  userId: Types.ObjectId;
  monthYear: string; // 'YYYY-MM'
  summary: string;
  financialSummary?: {
    earnedText: string;
    spentText: string;
    savedText: string;
    targetStatusText: string;
    momChangeText: string;
  };
  spendingAnalysis?: {
    overview: string;
    topCategoryInsights: string[];
    unnecessarySpending: string[];
  };
  warnings: string[];
  saveMoreOpportunities?: Array<{
    category: string;
    insight: string;
    suggestedCut?: number;
    potentialSavings?: number;
    projectedSavingsTotal?: number;
  }>;
  goalProgress?: Array<{
    goalTitle: string;
    progressText: string;
    advice: string;
  }>;
  actionPlan?: string[];
  insights: string[];
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
    financialSummary: {
      type: Schema.Types.Mixed,
      default: null
    },
    spendingAnalysis: {
      type: Schema.Types.Mixed,
      default: null
    },
    warnings: {
      type: Schema.Types.Mixed,
      default: []
    },
    saveMoreOpportunities: {
      type: Schema.Types.Mixed,
      default: []
    },
    goalProgress: {
      type: Schema.Types.Mixed,
      default: []
    },
    actionPlan: {
      type: Schema.Types.Mixed,
      default: []
    },
    insights: {
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
        'SaveWise AI Financial Coach insights are for educational and informational purposes only and do not constitute certified financial advice.'
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

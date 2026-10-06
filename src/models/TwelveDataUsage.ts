import mongoose, { Document, Schema } from 'mongoose';
import { config } from '../config/env';

export interface ITwelveDataUsage extends Document {
  utcDate: string; // 'YYYY-MM-DD' in UTC
  creditsUsed: number;
  blockedRequests: number;
  lastRequestAt: Date | null;
  lastError: string | null;
  lastErrorAt: Date | null;
  serverReportedCreditsUsed?: number | null;
  serverReportedCreditsLeft?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const TwelveDataUsageSchema = new Schema<ITwelveDataUsage>(
  {
    utcDate: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    creditsUsed: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    blockedRequests: {
      type: Number,
      required: true,
      default: 0
    },
    lastRequestAt: {
      type: Date,
      default: null
    },
    lastError: {
      type: String,
      default: null
    },
    lastErrorAt: {
      type: Date,
      default: null
    },
    serverReportedCreditsUsed: {
      type: Number,
      default: null
    },
    serverReportedCreditsLeft: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true
  }
);

/**
 * Returns today's date formatted as 'YYYY-MM-DD' strictly in UTC time.
 */
export function getCurrentUtcDateString(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class TwelveDataUsageManager {
  /**
   * Atomically checks and reserves API credits for the current UTC day.
   *
   * Hard application limit: config.twelveDataDailyLimit (700 credits).
   * Concurrency-safe: utilizes atomic MongoDB $inc with $lte condition.
   */
  static async reserveCredits(cost: number): Promise<{
    allowed: boolean;
    currentUsage: number;
    remainingCredits: number;
    limit: number;
    utcDate: string;
    blockedRequests: number;
  }> {
    const limit = config.twelveDataDailyLimit; // 700 credits
    const utcDate = getCurrentUtcDateString();
    const safeCost = Math.max(1, Math.round(cost));

    // Ensure the record for today's UTC day exists
    await TwelveDataUsage.updateOne(
      { utcDate },
      { $setOnInsert: { utcDate, creditsUsed: 0, blockedRequests: 0 } },
      { upsert: true }
    );

    // Atomically increment creditsUsed only if creditsUsed + safeCost <= limit
    const updated = await TwelveDataUsage.findOneAndUpdate(
      {
        utcDate,
        creditsUsed: { $lte: limit - safeCost }
      },
      {
        $inc: { creditsUsed: safeCost },
        $set: { lastRequestAt: new Date() }
      },
      {
        new: true
      }
    );

    if (updated) {
      const remainingCredits = Math.max(0, limit - updated.creditsUsed);
      return {
        allowed: true,
        currentUsage: updated.creditsUsed,
        remainingCredits,
        limit,
        utcDate,
        blockedRequests: updated.blockedRequests
      };
    }

    // Limit would be exceeded: atomic update failed. Increment blockedRequests counter.
    const blockedRecord = await TwelveDataUsage.findOneAndUpdate(
      { utcDate },
      { $inc: { blockedRequests: 1 } },
      { new: true }
    );

    const currentUsage = blockedRecord ? blockedRecord.creditsUsed : limit;
    const remainingCredits = Math.max(0, limit - currentUsage);

    return {
      allowed: false,
      currentUsage,
      remainingCredits,
      limit,
      utcDate,
      blockedRequests: blockedRecord ? blockedRecord.blockedRequests : 1
    };
  }

  /**
   * Retrieves the current UTC day's usage metrics.
   */
  static async getTodayMetrics(): Promise<{
    utcDate: string;
    creditsUsed: number;
    remainingCredits: number;
    limit: number;
    isLimitReached: boolean;
    blockedRequests: number;
    lastRequestAt: Date | null;
    lastError: string | null;
    displayText: string;
  }> {
    const limit = config.twelveDataDailyLimit;
    const utcDate = getCurrentUtcDateString();

    const record = await TwelveDataUsage.findOne({ utcDate });
    const creditsUsed = record ? record.creditsUsed : 0;
    const remainingCredits = Math.max(0, limit - creditsUsed);
    const blockedRequests = record ? record.blockedRequests : 0;
    const lastRequestAt = record?.lastRequestAt || null;
    const lastError = record?.lastError || null;
    const isLimitReached = creditsUsed >= limit;

    const displayText = isLimitReached
      ? 'Twelve Data daily limit reached. Market-data requests are paused until the next UTC day.'
      : `Twelve Data Usage: ${creditsUsed} / ${limit} credits`;

    return {
      utcDate,
      creditsUsed,
      remainingCredits,
      limit,
      isLimitReached,
      blockedRequests,
      lastRequestAt,
      lastError,
      displayText
    };
  }

  /**
   * Records an API error for monitoring.
   */
  static async recordError(errorMsg: string): Promise<void> {
    const utcDate = getCurrentUtcDateString();
    try {
      await TwelveDataUsage.updateOne(
        { utcDate },
        {
          $set: {
            lastError: errorMsg.slice(0, 300),
            lastErrorAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (e) {
      // Ignore background error log failures
    }
  }

  /**
   * Reconciles usage from Twelve Data response headers if provided.
   */
  static async reconcileHeaders(
    creditsUsedHeader?: string | number,
    creditsLeftHeader?: string | number
  ): Promise<void> {
    if (creditsUsedHeader === undefined && creditsLeftHeader === undefined) return;

    const utcDate = getCurrentUtcDateString();
    const updateObj: Record<string, any> = {};

    if (creditsUsedHeader !== undefined) {
      const parsedUsed = Number(creditsUsedHeader);
      if (!isNaN(parsedUsed)) updateObj.serverReportedCreditsUsed = parsedUsed;
    }
    if (creditsLeftHeader !== undefined) {
      const parsedLeft = Number(creditsLeftHeader);
      if (!isNaN(parsedLeft)) updateObj.serverReportedCreditsLeft = parsedLeft;
    }

    if (Object.keys(updateObj).length > 0) {
      try {
        await TwelveDataUsage.updateOne({ utcDate }, { $set: updateObj });
      } catch (e) {
        // Ignore header reconcile errors
      }
    }
  }
}

export const TwelveDataUsage = mongoose.model<ITwelveDataUsage>(
  'TwelveDataUsage',
  TwelveDataUsageSchema
);

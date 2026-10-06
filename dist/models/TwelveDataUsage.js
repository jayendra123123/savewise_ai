"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwelveDataUsage = exports.TwelveDataUsageManager = void 0;
exports.getCurrentUtcDateString = getCurrentUtcDateString;
const mongoose_1 = __importStar(require("mongoose"));
const env_1 = require("../config/env");
const TwelveDataUsageSchema = new mongoose_1.Schema({
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
}, {
    timestamps: true
});
/**
 * Returns today's date formatted as 'YYYY-MM-DD' strictly in UTC time.
 */
function getCurrentUtcDateString() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
class TwelveDataUsageManager {
    /**
     * Atomically checks and reserves API credits for the current UTC day.
     *
     * Hard application limit: config.twelveDataDailyLimit (700 credits).
     * Concurrency-safe: utilizes atomic MongoDB $inc with $lte condition.
     */
    static async reserveCredits(cost) {
        const limit = env_1.config.twelveDataDailyLimit; // 700 credits
        const utcDate = getCurrentUtcDateString();
        const safeCost = Math.max(1, Math.round(cost));
        // Ensure the record for today's UTC day exists
        await exports.TwelveDataUsage.updateOne({ utcDate }, { $setOnInsert: { utcDate, creditsUsed: 0, blockedRequests: 0 } }, { upsert: true });
        // Atomically increment creditsUsed only if creditsUsed + safeCost <= limit
        const updated = await exports.TwelveDataUsage.findOneAndUpdate({
            utcDate,
            creditsUsed: { $lte: limit - safeCost }
        }, {
            $inc: { creditsUsed: safeCost },
            $set: { lastRequestAt: new Date() }
        }, {
            new: true
        });
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
        const blockedRecord = await exports.TwelveDataUsage.findOneAndUpdate({ utcDate }, { $inc: { blockedRequests: 1 } }, { new: true });
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
    static async getTodayMetrics() {
        const limit = env_1.config.twelveDataDailyLimit;
        const utcDate = getCurrentUtcDateString();
        const record = await exports.TwelveDataUsage.findOne({ utcDate });
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
    static async recordError(errorMsg) {
        const utcDate = getCurrentUtcDateString();
        try {
            await exports.TwelveDataUsage.updateOne({ utcDate }, {
                $set: {
                    lastError: errorMsg.slice(0, 300),
                    lastErrorAt: new Date()
                }
            }, { upsert: true });
        }
        catch (e) {
            // Ignore background error log failures
        }
    }
    /**
     * Reconciles usage from Twelve Data response headers if provided.
     */
    static async reconcileHeaders(creditsUsedHeader, creditsLeftHeader) {
        if (creditsUsedHeader === undefined && creditsLeftHeader === undefined)
            return;
        const utcDate = getCurrentUtcDateString();
        const updateObj = {};
        if (creditsUsedHeader !== undefined) {
            const parsedUsed = Number(creditsUsedHeader);
            if (!isNaN(parsedUsed))
                updateObj.serverReportedCreditsUsed = parsedUsed;
        }
        if (creditsLeftHeader !== undefined) {
            const parsedLeft = Number(creditsLeftHeader);
            if (!isNaN(parsedLeft))
                updateObj.serverReportedCreditsLeft = parsedLeft;
        }
        if (Object.keys(updateObj).length > 0) {
            try {
                await exports.TwelveDataUsage.updateOne({ utcDate }, { $set: updateObj });
            }
            catch (e) {
                // Ignore header reconcile errors
            }
        }
    }
}
exports.TwelveDataUsageManager = TwelveDataUsageManager;
exports.TwelveDataUsage = mongoose_1.default.model('TwelveDataUsage', TwelveDataUsageSchema);

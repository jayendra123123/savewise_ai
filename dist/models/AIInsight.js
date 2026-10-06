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
exports.AIInsight = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AIInsightSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.Mixed,
        default: null
    },
    spendingAnalysis: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null
    },
    warnings: {
        type: mongoose_1.Schema.Types.Mixed,
        default: []
    },
    saveMoreOpportunities: {
        type: mongoose_1.Schema.Types.Mixed,
        default: []
    },
    goalProgress: {
        type: mongoose_1.Schema.Types.Mixed,
        default: []
    },
    actionPlan: {
        type: mongoose_1.Schema.Types.Mixed,
        default: []
    },
    insights: {
        type: mongoose_1.Schema.Types.Mixed,
        default: []
    },
    recommendations: {
        type: mongoose_1.Schema.Types.Mixed,
        default: []
    },
    goalAdvice: {
        type: mongoose_1.Schema.Types.Mixed,
        default: []
    },
    disclaimer: {
        type: String,
        default: 'SaveWise AI Financial Coach insights are for educational and informational purposes only and do not constitute certified financial advice.'
    },
    rawMetricsSnapshot: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    generatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
AIInsightSchema.index({ userId: 1, monthYear: 1, generatedAt: -1 });
exports.AIInsight = mongoose_1.default.model('AIInsight', AIInsightSchema);

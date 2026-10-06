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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const db_1 = require("./config/db");
const os_1 = __importDefault(require("os"));
const getLanIp = () => {
    const interfaces = os_1.default.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name] || []) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
};
const startServer = async () => {
    await (0, db_1.connectDB)();
    const app = (0, app_1.createApp)();
    const PORT = env_1.config.port;
    const lanIp = getLanIp();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`===============================================`);
        console.log(`🚀 SaveWise AI Backend`);
        console.log(`Host Interface: 0.0.0.0 (All network interfaces)`);
        console.log(`Local Access:   http://localhost:${PORT}`);
        console.log(`LAN Access:     http://${lanIp}:${PORT}`);
        console.log(`API Base:       /api`);
        console.log(`📡 Health Check: http://${lanIp}:${PORT}/api/health`);
        console.log(`MongoDB:        Connected`);
        console.log(`Environment:    ${env_1.config.nodeEnv}`);
        console.log(`===============================================`);
        // -------------------------------------------------------------
        // Automated Background Schedulers (Market Alerts & To-Do Reminders)
        // -------------------------------------------------------------
        const startSchedulers = async () => {
            const { MarketMonitoringService } = await Promise.resolve().then(() => __importStar(require('./services/marketMonitoringService')));
            const { TodoReminderService } = await Promise.resolve().then(() => __importStar(require('./services/todoReminderService')));
            // 1. Initial checks on startup
            try {
                console.log('[Scheduler] Running initial market & reminder checks...');
                await Promise.allSettled([
                    MarketMonitoringService.evaluateAlerts(),
                    TodoReminderService.evaluateReminders()
                ]);
            }
            catch (err) {
                console.warn('[Scheduler] Initial run notice:', err);
            }
            // 2. Periodic Market Monitoring (Every 2 minutes)
            setInterval(async () => {
                try {
                    const res = await MarketMonitoringService.evaluateAlerts();
                    if (res.triggeredCount > 0) {
                        console.log(`[Market Monitor] Triggered ${res.triggeredCount} price alert(s) & dispatched notification emails.`);
                    }
                }
                catch (err) {
                    console.warn('[Market Monitor] Evaluation cycle notice:', err?.message || err);
                }
            }, 2 * 60 * 1000);
            // 3. Periodic To-Do Reminders (Every 60 seconds)
            setInterval(async () => {
                try {
                    const res = await TodoReminderService.evaluateReminders();
                    if (res.remindersSentCount > 0) {
                        console.log(`[Todo Scheduler] Dispatched ${res.remindersSentCount} task reminder email(s).`);
                    }
                }
                catch (err) {
                    console.warn('[Todo Scheduler] Cycle notice:', err?.message || err);
                }
            }, 60 * 1000);
        };
        startSchedulers().catch((err) => {
            console.warn('[Scheduler] Startup notice:', err);
        });
    });
};
if (process.env.NODE_ENV !== 'test') {
    startServer().catch((err) => {
        console.error('Fatal startup error:', err);
        process.exit(1);
    });
}

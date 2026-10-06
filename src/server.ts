import { createApp } from './app';
import { config } from './config/env';
import { connectDB } from './config/db';
import os from 'os';

const getLanIp = (): string => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
};

const startServer = async (): Promise<void> => {
  await connectDB();

  const app = createApp();
  const PORT = config.port;
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
    console.log(`Environment:    ${config.nodeEnv}`);
    console.log(`===============================================`);

    // -------------------------------------------------------------
    // Automated Background Schedulers (Market Alerts & To-Do Reminders)
    // -------------------------------------------------------------
    const startSchedulers = async () => {
      const { MarketMonitoringService } = await import('./services/marketMonitoringService');
      const { TodoReminderService } = await import('./services/todoReminderService');

      // 1. Initial checks on startup
      try {
        console.log('[Scheduler] Running initial market & reminder checks...');
        await Promise.allSettled([
          MarketMonitoringService.evaluateAlerts(),
          TodoReminderService.evaluateReminders()
        ]);
      } catch (err) {
        console.warn('[Scheduler] Initial run notice:', err);
      }

      // 2. Periodic Market Monitoring (Every 2 minutes)
      setInterval(async () => {
        try {
          const res = await MarketMonitoringService.evaluateAlerts();
          if (res.triggeredCount > 0) {
            console.log(`[Market Monitor] Triggered ${res.triggeredCount} price alert(s) & dispatched notification emails.`);
          }
        } catch (err: any) {
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
        } catch (err: any) {
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


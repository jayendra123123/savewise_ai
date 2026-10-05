"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const db_1 = require("./config/db");
const startServer = async () => {
    await (0, db_1.connectDB)();
    const app = (0, app_1.createApp)();
    const PORT = env_1.config.port;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`===============================================`);
        console.log(`🚀 SaveWise AI Backend running at http://localhost:${PORT}`);
        console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
        console.log(`Environment: ${env_1.config.nodeEnv}`);
        console.log(`===============================================`);
    });
};
if (process.env.NODE_ENV !== 'test') {
    startServer().catch((err) => {
        console.error('Fatal startup error:', err);
        process.exit(1);
    });
}

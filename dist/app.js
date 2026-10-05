"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const createApp = () => {
    const app = (0, express_1.default)();
    // Middleware
    app.use((0, cors_1.default)({
        origin: '*', // Allow cross-platform mobile access and local dev
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    // API Routes
    app.use('/api', routes_1.default);
    // 404 Handler
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            error: `Endpoint not found: ${req.method} ${req.originalUrl}`
        });
    });
    // Global Error Handler
    app.use(errorHandler_1.errorHandler);
    return app;
};
exports.createApp = createApp;

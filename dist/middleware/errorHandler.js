"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const apiResponse_1 = require("../utils/apiResponse");
const errorHandler = (err, _req, res, _next) => {
    console.error('[Error Handler]:', err);
    // Handle Zod Schema Validation Errors
    if (err instanceof zod_1.ZodError) {
        const formatted = err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message
        }));
        (0, apiResponse_1.sendError)(res, 'Validation failed for request input', 422, formatted);
        return;
    }
    // Handle Mongoose Duplicate Key Error (e.g. unique email)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'record';
        (0, apiResponse_1.sendError)(res, `A record with this ${field} already exists.`, 409);
        return;
    }
    // Handle Mongoose CastError (invalid ObjectId)
    if (err.name === 'CastError') {
        (0, apiResponse_1.sendError)(res, `Invalid resource identifier format: ${err.value}`, 400);
        return;
    }
    // Default Internal Server Error
    (0, apiResponse_1.sendError)(res, err.message || 'An unexpected internal server error occurred', err.status || 500);
};
exports.errorHandler = errorHandler;

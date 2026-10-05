"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data, message, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};
exports.sendSuccess = sendSuccess;
const sendError = (res, error, statusCode = 400, details) => {
    return res.status(statusCode).json({
        success: false,
        error,
        details
    });
};
exports.sendError = sendError;

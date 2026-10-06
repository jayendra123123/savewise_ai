"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jwt_1 = require("../utils/jwt");
const apiResponse_1 = require("../utils/apiResponse");
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        (0, apiResponse_1.sendError)(res, 'Authentication required. No token provided.', 401, { code: 'NO_TOKEN' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = (0, jwt_1.verifyAccessToken)(token);
        req.user = decoded;
        next();
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            (0, apiResponse_1.sendError)(res, 'Access token expired.', 401, { code: 'TOKEN_EXPIRED' });
            return;
        }
        (0, apiResponse_1.sendError)(res, 'Invalid or corrupted access token.', 401, { code: 'INVALID_TOKEN' });
    }
};
exports.requireAuth = requireAuth;

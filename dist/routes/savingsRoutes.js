"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const savingsController_1 = require("../controllers/savingsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.requireAuth);
router.get('/', savingsController_1.SavingsController.getSavingsSummary);
exports.default = router;

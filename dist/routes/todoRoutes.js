"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const todoController_1 = require("../controllers/todoController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Enforce authentication on all todo operations
router.use(authMiddleware_1.requireAuth);
router.get('/', todoController_1.TodoController.getTodos);
router.post('/', todoController_1.TodoController.createTodo);
router.put('/:id', todoController_1.TodoController.updateTodo);
router.patch('/:id/toggle', todoController_1.TodoController.toggleTodo);
router.delete('/:id', todoController_1.TodoController.deleteTodo);
router.delete('/completed/all', todoController_1.TodoController.clearCompleted);
router.post('/evaluate-reminders', todoController_1.TodoController.evaluateReminders);
exports.default = router;

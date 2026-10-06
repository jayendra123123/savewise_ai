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
exports.TodoController = void 0;
const todoService_1 = require("../services/todoService");
const todoValidators_1 = require("../validators/todoValidators");
const apiResponse_1 = require("../utils/apiResponse");
class TodoController {
    /**
     * GET /api/todos - Retrieves all user todos
     */
    static async getTodos(req, res, next) {
        try {
            const todos = await todoService_1.TodoService.getTodos(req.user.userId);
            (0, apiResponse_1.sendSuccess)(res, todos, 'To-do items retrieved successfully');
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * POST /api/todos - Creates a new todo item
     */
    static async createTodo(req, res, next) {
        try {
            const validated = todoValidators_1.createTodoSchema.parse(req.body);
            const todo = await todoService_1.TodoService.createTodo(req.user.userId, validated);
            (0, apiResponse_1.sendSuccess)(res, todo, 'To-do item created successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * PUT /api/todos/:id - Updates an existing todo item
     */
    static async updateTodo(req, res, next) {
        try {
            const { id } = req.params;
            const validated = todoValidators_1.updateTodoSchema.parse(req.body);
            const updated = await todoService_1.TodoService.updateTodo(req.user.userId, id, validated);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    error: 'To-do item not found or unauthorized'
                });
                return;
            }
            (0, apiResponse_1.sendSuccess)(res, updated, 'To-do item updated successfully');
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * PATCH /api/todos/:id/toggle - Toggles todo completed status
     */
    static async toggleTodo(req, res, next) {
        try {
            const { id } = req.params;
            const updated = await todoService_1.TodoService.toggleTodo(req.user.userId, id);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    error: 'To-do item not found or unauthorized'
                });
                return;
            }
            (0, apiResponse_1.sendSuccess)(res, updated, 'To-do status updated successfully');
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * DELETE /api/todos/:id - Deletes a todo item
     */
    static async deleteTodo(req, res, next) {
        try {
            const { id } = req.params;
            const deleted = await todoService_1.TodoService.deleteTodo(req.user.userId, id);
            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: 'To-do item not found or unauthorized'
                });
                return;
            }
            (0, apiResponse_1.sendSuccess)(res, { id }, 'To-do item deleted successfully');
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * DELETE /api/todos/completed/all - Clears all completed tasks
     */
    static async clearCompleted(req, res, next) {
        try {
            const count = await todoService_1.TodoService.clearCompleted(req.user.userId);
            (0, apiResponse_1.sendSuccess)(res, { deletedCount: count }, `${count} completed tasks cleared`);
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * POST /api/todos/evaluate-reminders - Evaluates pending task reminders
     */
    static async evaluateReminders(_req, res, next) {
        try {
            const { TodoReminderService } = await Promise.resolve().then(() => __importStar(require('../services/todoReminderService')));
            const result = await TodoReminderService.evaluateReminders();
            (0, apiResponse_1.sendSuccess)(res, result, 'Task reminders evaluated successfully');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.TodoController = TodoController;

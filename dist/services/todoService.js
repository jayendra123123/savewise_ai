"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TodoService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Todo_1 = require("../models/Todo");
class TodoService {
    /**
     * Formats a mongoose Todo document into a clean API response
     */
    static formatTodo(todo) {
        return {
            _id: todo._id.toString(),
            userId: todo.userId.toString(),
            title: todo.title,
            description: todo.description || '',
            isCompleted: todo.isCompleted,
            priority: todo.priority,
            dueDate: todo.dueDate ? todo.dueDate.toISOString() : null,
            dueTimeSlot: todo.dueTimeSlot || 'MORNING',
            remindersSent: todo.remindersSent || {
                dueSlot: false,
                dayBefore: false,
                dueEvening: false
            },
            completedAt: todo.completedAt ? todo.completedAt.toISOString() : null,
            createdAt: todo.createdAt.toISOString(),
            updatedAt: todo.updatedAt.toISOString()
        };
    }
    /**
     * Retrieves all todo items for the authenticated user
     */
    static async getTodos(userId) {
        const todos = await Todo_1.Todo.find({
            userId: new mongoose_1.default.Types.ObjectId(userId)
        }).sort({ isCompleted: 1, createdAt: -1 });
        return todos.map(this.formatTodo);
    }
    /**
     * Creates a new todo item for the authenticated user
     */
    static async createTodo(userId, data) {
        const todo = await Todo_1.Todo.create({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            title: data.title,
            description: data.description || '',
            priority: data.priority || 'MEDIUM',
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            dueTimeSlot: data.dueTimeSlot || 'MORNING',
            remindersSent: {
                dueSlot: false,
                dayBefore: false,
                dueEvening: false
            },
            isCompleted: false
        });
        return this.formatTodo(todo);
    }
    /**
     * Updates an existing todo item
     */
    static async updateTodo(userId, todoId, data) {
        if (!mongoose_1.default.Types.ObjectId.isValid(todoId)) {
            return null;
        }
        const updatePayload = {};
        if (data.title !== undefined)
            updatePayload.title = data.title;
        if (data.description !== undefined)
            updatePayload.description = data.description || '';
        if (data.priority !== undefined)
            updatePayload.priority = data.priority;
        let resetReminders = false;
        if (data.dueTimeSlot !== undefined) {
            updatePayload.dueTimeSlot = data.dueTimeSlot;
            resetReminders = true;
        }
        if (data.dueDate !== undefined) {
            updatePayload.dueDate = data.dueDate ? new Date(data.dueDate) : null;
            resetReminders = true;
        }
        if (resetReminders) {
            updatePayload.remindersSent = {
                dueSlot: false,
                dayBefore: false,
                dueEvening: false
            };
        }
        if (data.isCompleted !== undefined) {
            updatePayload.isCompleted = data.isCompleted;
            updatePayload.completedAt = data.isCompleted ? new Date() : null;
        }
        const updated = await Todo_1.Todo.findOneAndUpdate({
            _id: new mongoose_1.default.Types.ObjectId(todoId),
            userId: new mongoose_1.default.Types.ObjectId(userId)
        }, { $set: updatePayload }, { new: true });
        return updated ? this.formatTodo(updated) : null;
    }
    /**
     * Atomically toggles completion status for a task
     */
    static async toggleTodo(userId, todoId) {
        if (!mongoose_1.default.Types.ObjectId.isValid(todoId)) {
            return null;
        }
        const existing = await Todo_1.Todo.findOne({
            _id: new mongoose_1.default.Types.ObjectId(todoId),
            userId: new mongoose_1.default.Types.ObjectId(userId)
        });
        if (!existing) {
            return null;
        }
        const newCompletedState = !existing.isCompleted;
        existing.isCompleted = newCompletedState;
        existing.completedAt = newCompletedState ? new Date() : undefined;
        await existing.save();
        return this.formatTodo(existing);
    }
    /**
     * Deletes a single todo item
     */
    static async deleteTodo(userId, todoId) {
        if (!mongoose_1.default.Types.ObjectId.isValid(todoId)) {
            return false;
        }
        const result = await Todo_1.Todo.deleteOne({
            _id: new mongoose_1.default.Types.ObjectId(todoId),
            userId: new mongoose_1.default.Types.ObjectId(userId)
        });
        return result.deletedCount > 0;
    }
    /**
     * Clears all completed todos for the authenticated user
     */
    static async clearCompleted(userId) {
        const result = await Todo_1.Todo.deleteMany({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            isCompleted: true
        });
        return result.deletedCount;
    }
}
exports.TodoService = TodoService;

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { TodoService } from '../services/todoService';
import { createTodoSchema, updateTodoSchema } from '../validators/todoValidators';
import { sendSuccess } from '../utils/apiResponse';

export class TodoController {
  /**
   * GET /api/todos - Retrieves all user todos
   */
  static async getTodos(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const todos = await TodoService.getTodos(req.user!.userId);
      sendSuccess(res, todos, 'To-do items retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/todos - Creates a new todo item
   */
  static async createTodo(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = createTodoSchema.parse(req.body);
      const todo = await TodoService.createTodo(req.user!.userId, validated);
      sendSuccess(res, todo, 'To-do item created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/todos/:id - Updates an existing todo item
   */
  static async updateTodo(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const validated = updateTodoSchema.parse(req.body);
      const updated = await TodoService.updateTodo(
        req.user!.userId,
        id,
        validated
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          error: 'To-do item not found or unauthorized'
        });
        return;
      }

      sendSuccess(res, updated, 'To-do item updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/todos/:id/toggle - Toggles todo completed status
   */
  static async toggleTodo(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await TodoService.toggleTodo(req.user!.userId, id);

      if (!updated) {
        res.status(404).json({
          success: false,
          error: 'To-do item not found or unauthorized'
        });
        return;
      }

      sendSuccess(res, updated, 'To-do status updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/todos/:id - Deletes a todo item
   */
  static async deleteTodo(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await TodoService.deleteTodo(req.user!.userId, id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'To-do item not found or unauthorized'
        });
        return;
      }

      sendSuccess(res, { id }, 'To-do item deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/todos/completed/all - Clears all completed tasks
   */
  static async clearCompleted(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const count = await TodoService.clearCompleted(req.user!.userId);
      sendSuccess(res, { deletedCount: count }, `${count} completed tasks cleared`);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/todos/evaluate-reminders - Evaluates pending task reminders
   */
  static async evaluateReminders(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { TodoReminderService } = await import('../services/todoReminderService');
      const result = await TodoReminderService.evaluateReminders();
      sendSuccess(res, result, 'Task reminders evaluated successfully');
    } catch (err) {
      next(err);
    }
  }
}

import mongoose from 'mongoose';
import { Todo, ITodo, TodoPriority, DueTimeSlot, ITodoRemindersSent } from '../models/Todo';
import { CreateTodoInput, UpdateTodoInput } from '../validators/todoValidators';

export interface TodoItemResponse {
  _id: string;
  userId: string;
  title: string;
  description: string;
  isCompleted: boolean;
  priority: TodoPriority;
  dueDate: string | null;
  dueTimeSlot: DueTimeSlot;
  remindersSent: ITodoRemindersSent;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class TodoService {
  /**
   * Formats a mongoose Todo document into a clean API response
   */
  private static formatTodo(todo: ITodo): TodoItemResponse {
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
  static async getTodos(userId: string): Promise<TodoItemResponse[]> {
    const todos = await Todo.find({
      userId: new mongoose.Types.ObjectId(userId)
    }).sort({ isCompleted: 1, createdAt: -1 });

    return todos.map(this.formatTodo);
  }

  /**
   * Creates a new todo item for the authenticated user
   */
  static async createTodo(
    userId: string,
    data: CreateTodoInput
  ): Promise<TodoItemResponse> {
    const todo = await Todo.create({
      userId: new mongoose.Types.ObjectId(userId),
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
  static async updateTodo(
    userId: string,
    todoId: string,
    data: UpdateTodoInput
  ): Promise<TodoItemResponse | null> {
    if (!mongoose.Types.ObjectId.isValid(todoId)) {
      return null;
    }

    const updatePayload: Record<string, any> = {};

    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.description !== undefined) updatePayload.description = data.description || '';
    if (data.priority !== undefined) updatePayload.priority = data.priority;

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

    const updated = await Todo.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(todoId),
        userId: new mongoose.Types.ObjectId(userId)
      },
      { $set: updatePayload },
      { new: true }
    );

    return updated ? this.formatTodo(updated) : null;
  }

  /**
   * Atomically toggles completion status for a task
   */
  static async toggleTodo(
    userId: string,
    todoId: string
  ): Promise<TodoItemResponse | null> {
    if (!mongoose.Types.ObjectId.isValid(todoId)) {
      return null;
    }

    const existing = await Todo.findOne({
      _id: new mongoose.Types.ObjectId(todoId),
      userId: new mongoose.Types.ObjectId(userId)
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
  static async deleteTodo(
    userId: string,
    todoId: string
  ): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(todoId)) {
      return false;
    }

    const result = await Todo.deleteOne({
      _id: new mongoose.Types.ObjectId(todoId),
      userId: new mongoose.Types.ObjectId(userId)
    });

    return result.deletedCount > 0;
  }

  /**
   * Clears all completed todos for the authenticated user
   */
  static async clearCompleted(userId: string): Promise<number> {
    const result = await Todo.deleteMany({
      userId: new mongoose.Types.ObjectId(userId),
      isCompleted: true
    });

    return result.deletedCount;
  }
}

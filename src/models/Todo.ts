import mongoose, { Document, Schema, Types } from 'mongoose';

export type TodoPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type DueTimeSlot = 'MORNING' | 'EVENING' | 'NIGHT';

export interface ITodoRemindersSent {
  dueSlot: boolean;
  dayBefore: boolean;
  dueEvening: boolean;
}

export interface ITodo extends Document {
  userId: Types.ObjectId;
  title: string;
  description?: string;
  isCompleted: boolean;
  priority: TodoPriority;
  dueDate?: Date | null;
  dueTimeSlot: DueTimeSlot;
  remindersSent: ITodoRemindersSent;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TodoSchema = new Schema<ITodo>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },
    isCompleted: {
      type: Boolean,
      required: true,
      default: false,
      index: true
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM'
    },
    dueDate: {
      type: Date,
      default: null,
      index: true
    },
    dueTimeSlot: {
      type: String,
      enum: ['MORNING', 'EVENING', 'NIGHT'],
      default: 'MORNING'
    },
    remindersSent: {
      dueSlot: { type: Boolean, default: false },
      dayBefore: { type: Boolean, default: false },
      dueEvening: { type: Boolean, default: false }
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

TodoSchema.index({ userId: 1, isCompleted: 1, createdAt: -1 });

export const Todo = mongoose.model<ITodo>('Todo', TodoSchema);

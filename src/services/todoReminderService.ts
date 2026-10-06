import { Todo } from '../models/Todo';
import { IUser } from '../models/User';
import { EmailService } from './emailService';

export class TodoReminderService {
  /**
   * Helper to format a date to YYYY-MM-DD local string
   */
  private static formatDateStr(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Evaluates all incomplete to-dos across the system and sends
   * targeted email notifications using Nodemailer + SMTP.
   *
   * Rules:
   * 1. If an incomplete task is due today, send an email at the selected time
   *    (Morning: >= 9:00, Evening: >= 17:00, Night: >= 21:00).
   * 2. For future tasks, send a reminder 1 day before the due date.
   * 3. Send another reminder on the due date evening (>= 17:00) if still incomplete.
   * 4. Deduplication is strictly guaranteed via MongoDB remindersSent flags.
   */
  static async evaluateReminders(): Promise<{
    evaluated: number;
    remindersSentCount: number;
  }> {
    const now = new Date();
    const currentHour = now.getHours();

    const todayStr = this.formatDateStr(now);
    const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = this.formatDateStr(tomorrowDate);

    // Find all incomplete tasks with a set due date
    const pendingTodos = await Todo.find({
      isCompleted: false,
      dueDate: { $ne: null }
    }).populate<{ userId: IUser }>('userId');

    let remindersSentCount = 0;

    for (const todo of pendingTodos) {
      if (!todo.dueDate) continue;

      const user = todo.userId as unknown as IUser;
      if (!user || !user.email) continue;

      const dueStr = this.formatDateStr(new Date(todo.dueDate));
      const recipientName = user.fullName || 'SaveWise Member';
      const slot = todo.dueTimeSlot || 'MORNING';

      // Ensure remindersSent object is initialized
      if (!todo.remindersSent) {
        todo.remindersSent = {
          dueSlot: false,
          dayBefore: false,
          dueEvening: false
        };
      }

      let modified = false;

      // -------------------------------------------------------------
      // 1. Task is due TODAY
      // -------------------------------------------------------------
      if (dueStr === todayStr) {
        let slotReached = false;
        if (slot === 'MORNING' && currentHour >= 9) slotReached = true;
        if (slot === 'EVENING' && currentHour >= 17) slotReached = true;
        if (slot === 'NIGHT' && currentHour >= 21) slotReached = true;

        // Primary time-slot reminder
        if (slotReached && !todo.remindersSent.dueSlot) {
          const sent = await EmailService.sendTodoReminderEmail({
            to: user.email,
            recipientName,
            taskTitle: todo.title,
            taskDescription: todo.description,
            dueDate: todo.dueDate,
            dueTimeSlot: slot,
            reminderType: 'DUE_TODAY_SLOT'
          });

          if (sent) {
            todo.remindersSent.dueSlot = true;
            modified = true;
            remindersSentCount++;
          }
        }

        // Secondary reminder on due date evening if still incomplete
        if (currentHour >= 17 && !todo.remindersSent.dueEvening) {
          // If the slot is MORNING (or if dueSlot was already delivered), send evening follow-up
          if (slot === 'MORNING' || todo.remindersSent.dueSlot) {
            const sent = await EmailService.sendTodoReminderEmail({
              to: user.email,
              recipientName,
              taskTitle: todo.title,
              taskDescription: todo.description,
              dueDate: todo.dueDate,
              dueTimeSlot: slot,
              reminderType: 'DUE_DATE_EVENING'
            });

            if (sent) {
              todo.remindersSent.dueEvening = true;
              modified = true;
              remindersSentCount++;
            }
          }
        }
      }

      // -------------------------------------------------------------
      // 2. Future task: 1 day before due date
      // -------------------------------------------------------------
      else if (dueStr === tomorrowStr) {
        if (!todo.remindersSent.dayBefore) {
          const sent = await EmailService.sendTodoReminderEmail({
            to: user.email,
            recipientName,
            taskTitle: todo.title,
            taskDescription: todo.description,
            dueDate: todo.dueDate,
            dueTimeSlot: slot,
            reminderType: 'DAY_BEFORE'
          });

          if (sent) {
            todo.remindersSent.dayBefore = true;
            modified = true;
            remindersSentCount++;
          }
        }
      }

      if (modified) {
        await todo.save();
      }
    }

    return {
      evaluated: pendingTodos.length,
      remindersSentCount
    };
  }
}

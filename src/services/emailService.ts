import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env';

export interface SendPriceAlertEmailOptions {
  to: string;
  recipientName: string;
  assetName: string;
  symbol: string;
  condition: 'ABOVE' | 'BELOW';
  targetPrice: number;
  currentPrice: number;
  currency?: string;
}

export type TodoReminderType = 'DUE_TODAY_SLOT' | 'DAY_BEFORE' | 'DUE_DATE_EVENING';

export interface SendTodoReminderEmailOptions {
  to: string;
  recipientName: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate?: Date | string | null;
  dueTimeSlot: 'MORNING' | 'EVENING' | 'NIGHT';
  reminderType: TodoReminderType;
}

export class EmailService {
  private static transporter: Transporter | null = null;
  private static verified = false;

  /**
   * Initializes or gets the existing Nodemailer transporter.
   */
  private static getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = config.smtpHost || 'smtp.gmail.com';
    const port = config.smtpPort || 587;
    const secure = config.smtpSecure || false;
    const user = config.smtpUser;
    const pass = config.smtpPass;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });
    } else {
      // Fallback transporter (JSON / Stream for testing and safe dev logging)
      this.transporter = nodemailer.createTransport({
        jsonTransport: true
      });
    }

    return this.transporter;
  }

  /**
   * Sends a styled HTML price alert notification email.
   */
  static async sendPriceAlertEmail(options: SendPriceAlertEmailOptions): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      const curr = options.currency || 'USD';
      const formattedTarget = options.targetPrice.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      const formattedCurrent = options.currentPrice.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      const directionText = options.condition === 'ABOVE' ? 'rose above' : 'fell below';
      const conditionBadgeColor = options.condition === 'ABOVE' ? '#10B981' : '#F59E0B';
      const conditionBadgeText = options.condition === 'ABOVE' ? '▲ Target Exceeded' : '▼ Target Reached';

      const subject = `🎯 Price Alert Triggered: ${options.assetName} (${options.symbol}) is now ${curr} ${formattedCurrent}`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B; }
    .card { max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #6366F1 0%, #4338CA 100%); padding: 32px 24px; text-align: center; color: #FFFFFF; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; padding: 6px 14px; background-color: ${conditionBadgeColor}; color: white; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
    .price-box { background: #F1F5F9; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
    .price-label { font-size: 13px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 4px; }
    .price-value { font-size: 32px; font-weight: 800; color: #0F172A; }
    .details-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
    .details-table td { padding: 10px 0; border-bottom: 1px solid #F1F5F9; }
    .details-table td.label { color: #64748B; width: 45%; }
    .details-table td.value { color: #0F172A; font-weight: 600; text-align: right; }
    .footer { padding: 20px 28px; text-align: center; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>SaveWise AI • Market Monitor</h1>
      <p>Real-Time Price Alert Notification</p>
    </div>
    <div class="content">
      <div style="text-align: center;">
        <span class="badge">${conditionBadgeText}</span>
      </div>
      <p style="font-size: 16px; line-height: 1.5; margin-top: 0;">
        Hello <strong>${options.recipientName}</strong>,
      </p>
      <p style="font-size: 15px; color: #475569; line-height: 1.5;">
        Your market price alert for <strong>${options.assetName} (${options.symbol})</strong> has just been triggered. The price ${directionText} your target price of <strong>${curr} ${formattedTarget}</strong>.
      </p>
      
      <div class="price-box">
        <div class="price-label">Current Market Price</div>
        <div class="price-value">${curr} ${formattedCurrent}</div>
      </div>

      <table class="details-table">
        <tr>
          <td class="label">Asset</td>
          <td class="value">${options.assetName} (${options.symbol})</td>
        </tr>
        <tr>
          <td class="label">Target Trigger Price</td>
          <td class="value">${curr} ${formattedTarget}</td>
        </tr>
        <tr>
          <td class="label">Condition</td>
          <td class="value">${options.condition === 'ABOVE' ? 'Above Target (≥)' : 'Below Target (≤)'}</td>
        </tr>
        <tr>
          <td class="label">Time Triggered</td>
          <td class="value">${new Date().toLocaleString('en-US', { timeZoneName: 'short' })}</td>
        </tr>
      </table>
    </div>
    <div class="footer">
      <p style="margin: 0;">SaveWise AI Automated Market Engine • Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
      `;

      const fromAddress = config.smtpUser
        ? `"SaveWise AI" <${config.smtpUser}>`
        : (config.smtpFrom || '"SaveWise AI" <alerts@savewise.ai>');

      const info = await transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject,
        html,
        text: `SaveWise AI Alert: ${options.assetName} (${options.symbol}) ${directionText} ${curr} ${formattedTarget}. Current price is ${curr} ${formattedCurrent}.`
      });

      console.log(`[EmailService] Price alert email sent to ${options.to}. MessageId: ${info.messageId || 'simulated'}`);
      return true;
    } catch (err) {
      console.error('[EmailService] Failed to send price alert email:', err);
      return false;
    }
  }

  /**
   * Sends a styled HTML task reminder email.
   */
  static async sendTodoReminderEmail(options: SendTodoReminderEmailOptions): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      const timeSlotNames: Record<string, string> = {
        MORNING: 'Morning (9:00 AM)',
        EVENING: 'Evening (5:00 PM)',
        NIGHT: 'Night (9:00 PM)'
      };

      let subject = '';
      let headline = '';
      let badgeText = '';
      let badgeColor = '#6366F1';

      if (options.reminderType === 'DUE_TODAY_SLOT') {
        subject = `⏰ Task Due Today: ${options.taskTitle} - SaveWise AI`;
        headline = `Your task is due today!`;
        badgeText = `Due Today • ${timeSlotNames[options.dueTimeSlot] || 'Scheduled'}`;
        badgeColor = '#EF4444';
      } else if (options.reminderType === 'DAY_BEFORE') {
        subject = `📅 Reminder: "${options.taskTitle}" is due tomorrow - SaveWise AI`;
        headline = `Heads-up! Task due tomorrow`;
        badgeText = `Due Tomorrow`;
        badgeColor = '#F59E0B';
      } else if (options.reminderType === 'DUE_DATE_EVENING') {
        subject = `🌙 Evening Reminder: "${options.taskTitle}" is still pending - SaveWise AI`;
        headline = `Evening Check-in: Incomplete Task`;
        badgeText = `Pending Today`;
        badgeColor = '#8B5CF6';
      }

      const formattedDueDate = options.dueDate
        ? new Date(options.dueDate).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : 'Today';

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B; }
    .card { max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 32px 24px; text-align: center; color: #FFFFFF; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; }
    .header p { margin: 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; padding: 6px 14px; background-color: ${badgeColor}; color: white; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
    .task-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #6366F1; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .task-title { font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0; }
    .task-desc { font-size: 14px; color: #64748B; margin: 0; line-height: 1.5; }
    .details-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
    .details-table td { padding: 10px 0; border-bottom: 1px solid #F1F5F9; }
    .details-table td.label { color: #64748B; width: 40%; }
    .details-table td.value { color: #0F172A; font-weight: 600; text-align: right; }
    .footer { padding: 20px 28px; text-align: center; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>SaveWise AI • Task Reminder</h1>
      <p>${headline}</p>
    </div>
    <div class="content">
      <div style="text-align: center;">
        <span class="badge">${badgeText}</span>
      </div>
      <p style="font-size: 16px; line-height: 1.5; margin-top: 0;">
        Hello <strong>${options.recipientName}</strong>,
      </p>
      <p style="font-size: 15px; color: #475569; line-height: 1.5;">
        You have an active to-do item on your SaveWise AI schedule that requires your attention:
      </p>

      <div class="task-box">
        <h3 class="task-title">${options.taskTitle}</h3>
        ${options.taskDescription ? `<p class="task-desc">${options.taskDescription}</p>` : '<p class="task-desc" style="font-style: italic;">No additional notes</p>'}
      </div>

      <table class="details-table">
        <tr>
          <td class="label">Due Date</td>
          <td class="value">${formattedDueDate}</td>
        </tr>
        <tr>
          <td class="label">Preferred Slot</td>
          <td class="value">${timeSlotNames[options.dueTimeSlot] || 'Morning'}</td>
        </tr>
        <tr>
          <td class="label">Status</td>
          <td class="value" style="color: #EF4444;">Incomplete</td>
        </tr>
      </table>
    </div>
    <div class="footer">
      <p style="margin: 0;">Keep track of your financial goals and tasks with SaveWise AI.</p>
    </div>
  </div>
</body>
</html>
      `;

      const fromAddress = config.smtpUser
        ? `"SaveWise AI" <${config.smtpUser}>`
        : (config.smtpFrom || '"SaveWise AI" <tasks@savewise.ai>');

      const info = await transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject,
        html,
        text: `SaveWise AI Reminder: "${options.taskTitle}" is due ${formattedDueDate} (${timeSlotNames[options.dueTimeSlot]}). Open the app to complete it!`
      });

      console.log(`[EmailService] Todo reminder email sent to ${options.to}. MessageId: ${info.messageId || 'simulated'}`);
      return true;
    } catch (err) {
      console.error('[EmailService] Failed to send todo reminder email:', err);
      return false;
    }
  }
}

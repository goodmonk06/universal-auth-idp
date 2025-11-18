export interface EmailMessage {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SmsMessage {
  to: string;
  message: string;
}

export interface PushNotification {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface INotificationAdapter {
  sendEmail(message: EmailMessage): Promise<void>;
  sendSms(message: SmsMessage): Promise<void>;
  sendPushNotification(notification: PushNotification): Promise<void>;
}

// Default console-based implementation for development
export class ConsoleNotificationAdapter implements INotificationAdapter {
  async sendEmail(message: EmailMessage): Promise<void> {
    console.log('[Notification] Email sent:', {
      to: message.to,
      subject: message.subject,
    });
  }

  async sendSms(message: SmsMessage): Promise<void> {
    console.log('[Notification] SMS sent:', {
      to: message.to,
      preview: message.message.substring(0, 50),
    });
  }

  async sendPushNotification(notification: PushNotification): Promise<void> {
    console.log('[Notification] Push notification sent:', {
      userId: notification.userId,
      title: notification.title,
    });
  }
}

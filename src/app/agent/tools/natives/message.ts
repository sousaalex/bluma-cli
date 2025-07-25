import { v4 as uuidv4 } from 'uuid';

interface MessageNotifyDevArgs {
  text_markdown: string;
}

interface Notification {
  type: 'message_notify_dev';
  id: string;
  timestamp: string;
  content: {
    format: 'markdown';
    body: string;
  };
  success: true;
  delivered: true;
}

/**
 * Generates a structured notification message for the developer.
 * @param args - Object containing the message body in Markdown.
 * @returns A Promise that resolves to the notification object.
 */
export function messageNotifyDev(args: MessageNotifyDevArgs): Promise<Notification> {
  const { text_markdown } = args;

  const notification: Notification = {
    type: 'message_notify_dev',
    id: `notify_${uuidv4()}`,
    timestamp: new Date().toISOString(),
    content: {
      format: 'markdown',
      body: text_markdown,
    },
    success: true,
    delivered: true,
  };

  // Wrap the synchronous result in a resolved Promise to match the required type.
  return Promise.resolve(notification);
}
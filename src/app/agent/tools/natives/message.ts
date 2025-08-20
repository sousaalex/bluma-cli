import { v4 as uuidv4 } from 'uuid';

interface MessageNotifyuserArgs {
  message: string;
}

interface Notification {
  type: 'message_notify_user';
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
 * Generates a structured notification message for the user.
 * @param args - Object containing the message body in Markdown.
 * @returns A Promise that resolves to the notification object.
 */
export function messageNotifyuser(args: MessageNotifyuserArgs): Promise<Notification> {
  const { message } = args;
  
    // const result = 'Message sended successfully!';

  const notification: Notification = {
    type: 'message_notify_user',
    id: `notify_${uuidv4()}`,
    timestamp: new Date().toISOString(),
    content: {
      format: 'markdown',
      body: message,
    },
    success: true,
    delivered: true,
  };

  // Wrap the synchronous result in a resolved Promise to match the required type.
  return Promise.resolve(notification);
}
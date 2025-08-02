import { v4 as uuidv4 } from 'uuid';
import type { HistoryItem, HistoryMetadata } from '../types/history';

export function makeHistoryItem(
  role: HistoryItem['role'],
  content: string,
  init?: Partial<Omit<HistoryItem, 'metadata'>> & { metadata?: Partial<HistoryMetadata> | undefined }
): HistoryItem {
  const now = new Date().toISOString();
  const md: HistoryMetadata = {
    messageId: init?.metadata?.messageId ?? uuidv4(),
    correlationId: init?.metadata?.correlationId,
    source: init?.metadata?.source,
    channel: init?.metadata?.channel,
    createdAt: init?.metadata?.createdAt ?? now,
    receivedAt: init?.metadata?.receivedAt ?? now,
    userId: init?.metadata?.userId,
    sessionId: init?.metadata?.sessionId,
    tags: init?.metadata?.tags,
    extra: init?.metadata?.extra,
  };
  return {
    role,
    name: init?.name,
    content,
    tool_call_id: init?.tool_call_id,
    metadata: md,
  };
}

export function toChatML(items: HistoryItem[]) {
  return items.map(({ role, name, content, tool_call_id }) => {
    const base: any = { role, content };
    if (name) base.name = name;
    if (tool_call_id) base.tool_call_id = tool_call_id;
    return base;
  });
}

export function assertHistoryItem(it: HistoryItem) {
  if (!it.role || typeof it.content !== 'string') throw new Error('Invalid HistoryItem');
  if (it.metadata) {
    if (!it.metadata.messageId || !it.metadata.createdAt) {
      throw new Error('Invalid metadata: missing messageId/createdAt');
    }
  }
}

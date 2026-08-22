import { apiRequest } from '@/src/features/rescue/api/client';

export interface AssistantReply {
  reply: string;
  source: 'local' | 'gemini';
  remainingToday: number | null;
}

export const assistantApi = {
  send: (message: string) =>
    apiRequest<AssistantReply>('/api/assistant/message', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
};

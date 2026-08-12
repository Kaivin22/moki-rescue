import { supabase } from '@/src/services/supabase';
import type { ChatMessage } from '@/src/features/ai/services/gemini';

export interface AiChatSession {
  id: string;
  user_id: string;
  session_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

function boundedMessages(messages: ChatMessage[]): ChatMessage[] {
  const bounded = messages.slice(-60);
  while (bounded.length > 1 && JSON.stringify(bounded).length > 30_000) bounded.shift();
  return bounded;
}

export async function listChatSessions(userId: string): Promise<AiChatSession[]> {
  const { data, error } = await supabase
    .from('ai_consultations')
    .select('id, user_id, session_id, title, messages, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AiChatSession[];
}

export async function getChatSession(id: string, userId: string): Promise<AiChatSession> {
  const { data, error } = await supabase
    .from('ai_consultations')
    .select('id, user_id, session_id, title, messages, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data as AiChatSession;
}

export async function saveChatSession(input: {
  id?: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
}): Promise<string> {
  const payload = { title: input.title.trim().slice(0, 120) || 'Cuộc trò chuyện mới', messages: boundedMessages(input.messages), updated_at: new Date().toISOString() };
  if (input.id) {
    const { error } = await supabase.from('ai_consultations').update(payload).eq('id', input.id).eq('user_id', input.userId);
    if (error) throw error;
    return input.id;
  }
  const { data, error } = await supabase.from('ai_consultations').insert({ ...payload, user_id: input.userId }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteChatSession(id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('ai_consultations').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

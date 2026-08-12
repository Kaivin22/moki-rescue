import { supabase } from '@/src/services/supabase';

export type TicketCategory = 'payment_error' | 'vip_not_activated' | 'data_error' | 'app_bug' | 'place_wrong_info' | 'suggestion' | 'other';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  user_id: string | null;
  category: TicketCategory;
  title: string;
  description: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string | null;
  body: string;
  is_admin: boolean;
  created_at: string;
}

export async function createSupportTicket(input: {
  userId: string;
  category: TicketCategory;
  title: string;
  description: string;
}): Promise<void> {
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title || title.length > 160) throw new Error('Tiêu đề yêu cầu phải có từ 1 đến 160 ký tự.');
  if (!description || description.length > 10_000) throw new Error('Nội dung yêu cầu phải có từ 1 đến 10.000 ký tự.');
  const { error } = await supabase.from('support_tickets').insert({
    user_id: input.userId,
    category: input.category,
    title,
    description,
    status: 'open',
  });
  if (error) throw error;
}

export async function getMySupportTickets(userId: string): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, user_id, category, title, description, status, created_at, updated_at, resolved_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SupportTicket[];
}

export async function getSupportTicket(ticketId: string): Promise<{ ticket: SupportTicket; replies: TicketReply[] }> {
  const [ticketResult, repliesResult] = await Promise.all([
    supabase
      .from('support_tickets')
      .select('id, user_id, category, title, description, status, created_at, updated_at, resolved_at')
      .eq('id', ticketId)
      .single(),
    supabase
      .from('ticket_replies')
      .select('id, ticket_id, user_id, body, is_admin, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at'),
  ]);
  if (ticketResult.error) throw ticketResult.error;
  if (repliesResult.error) throw repliesResult.error;
  return { ticket: ticketResult.data as SupportTicket, replies: (repliesResult.data ?? []) as TicketReply[] };
}

export async function replyToSupportTicket(ticketId: string, userId: string, bodyInput: string): Promise<void> {
  const body = bodyInput.trim();
  if (!body || body.length > 5000) throw new Error('Phản hồi phải có từ 1 đến 5.000 ký tự.');
  const { error } = await supabase.from('ticket_replies').insert({
    ticket_id: ticketId,
    user_id: userId,
    body,
    is_admin: false,
  });
  if (error) throw error;
}

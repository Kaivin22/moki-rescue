import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:danang_itinerary/features/support/domain/models/support_ticket.dart';

// SupabaseSupportDataSource — CRUD support_tickets table
class SupabaseSupportDataSource {
  const SupabaseSupportDataSource(this._client);

  final SupabaseClient _client;

  // Lấy danh sách tickets của user hiện tại
  Future<List<SupportTicket>> getMyTickets() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return [];

    final response = await _client
        .from('support_tickets')
        .select()
        .eq('user_id', userId)
        .order('created_at', ascending: false);

    return (response as List)
        .map((e) => SupportTicket.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // Lấy 1 ticket theo id
  Future<SupportTicket?> getTicketById(String ticketId) async {
    final response = await _client
        .from('support_tickets')
        .select()
        .eq('id', ticketId)
        .maybeSingle();

    if (response == null) return null;
    return SupportTicket.fromJson(response);
  }

  // Tạo ticket mới
  Future<SupportTicket> createTicket({
    required String title,
    required String description,
    required String category,
  }) async {
    final userId = _client.auth.currentUser!.id;
    final data = SupportTicket(
      id: '',
      userId: userId,
      title: title,
      description: description,
      category: category,
      status: 'open',
      createdAt: DateTime.now(),
    ).toInsert();

    final response = await _client
        .from('support_tickets')
        .insert(data)
        .select()
        .single();

    return SupportTicket.fromJson(response);
  }

  // Stream realtime cho ticket list
  Stream<List<SupportTicket>> watchMyTickets() {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return const Stream.empty();

    return _client
        .from('support_tickets')
        .stream(primaryKey: ['id'])
        .eq('user_id', userId)
        .order('created_at')
        .map(
          (rows) =>
              rows.map((e) => SupportTicket.fromJson(e)).toList()
                ..sort((a, b) => b.createdAt.compareTo(a.createdAt)),
        );
  }
}

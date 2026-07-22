import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:danang_itinerary/features/auth/domain/models/user_profile.dart';
import 'package:danang_itinerary/features/support/domain/models/support_ticket.dart';

/// Thống kê tổng quan cho Admin Dashboard
class AdminStats {
  const AdminStats({
    required this.totalPlaces,
    required this.totalUsers,
    required this.openTickets,
    required this.vipUsers,
    required this.totalReviews,
    required this.totalItineraries,
  });

  final int totalPlaces;
  final int totalUsers;
  final int openTickets;
  final int vipUsers;
  final int totalReviews;
  final int totalItineraries;
}

/// Supabase datasource cho Admin operations
class SupabaseAdminDataSource {
  const SupabaseAdminDataSource(this._client);

  final SupabaseClient _client;

  // ── Stats ──────────────────────────────────────────────
  Future<AdminStats> getStats() async {
    // Đếm count cho từng bảng — dùng count() của Supabase
    final results = await Future.wait([
      _countTable('places'),
      _countTable('profiles'),
      _countTableWhere('support_tickets', 'status', 'open'),
      _countTableWhere('profiles', 'vip_status', 'vip'),
      _countTable('reviews'),
      _countTable('itineraries'),
    ]);

    return AdminStats(
      totalPlaces: results[0],
      totalUsers: results[1],
      openTickets: results[2],
      vipUsers: results[3],
      totalReviews: results[4],
      totalItineraries: results[5],
    );
  }

  Future<int> _countTable(String table) async {
    try {
      final r = await _client.from(table).select().count(CountOption.exact);
      return r.count;
    } catch (_) {
      return 0;
    }
  }

  Future<int> _countTableWhere(String table, String col, String val) async {
    try {
      final r = await _client
          .from(table)
          .select()
          .eq(col, val)
          .count(CountOption.exact);
      return r.count;
    } catch (_) {
      return 0;
    }
  }

  // ── Users ──────────────────────────────────────────────
  Future<List<UserProfile>> getAllUsers({String? query, int page = 0}) async {
    try {
      List<dynamic> rows;
      if (query != null && query.isNotEmpty) {
        rows = await _client
            .from('profiles')
            .select()
            .ilike('display_name', '%$query%')
            .order('created_at', ascending: false)
            .range(page * 20, page * 20 + 19);
      } else {
        rows = await _client
            .from('profiles')
            .select()
            .order('created_at', ascending: false)
            .range(page * 20, page * 20 + 19);
      }
      return rows
          .map((e) => UserProfile.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> updateUserRole(String userId, String role) async {
    await _client.from('profiles').update({'role': role}).eq('id', userId);
  }

  Future<void> updateUserVip(String userId, String vipStatus) async {
    await _client
        .from('profiles')
        .update({
          'vip_status': vipStatus,
          if (vipStatus == 'vip')
            'vip_granted_until': DateTime.now()
                .add(const Duration(days: 30))
                .toIso8601String(),
        })
        .eq('id', userId);
  }

  // ── Tickets ──────────────────────────────────────────────
  Future<List<SupportTicket>> getAllTickets({String? status}) async {
    try {
      List<dynamic> rows;
      if (status != null && status != 'all') {
        rows = await _client
            .from('support_tickets')
            .select()
            .eq('status', status)
            .order('created_at', ascending: false);
      } else {
        rows = await _client
            .from('support_tickets')
            .select()
            .order('created_at', ascending: false);
      }
      return rows
          .map((e) => SupportTicket.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> replyTicket({
    required String ticketId,
    required String reply,
  }) async {
    await _client
        .from('support_tickets')
        .update({
          'admin_reply': reply,
          'status': 'resolved',
          'resolved_at': DateTime.now().toIso8601String(),
        })
        .eq('id', ticketId);
  }

  Future<void> updateTicketStatus(String ticketId, String status) async {
    await _client
        .from('support_tickets')
        .update({
          'status': status,
          if (status == 'resolved')
            'resolved_at': DateTime.now().toIso8601String(),
        })
        .eq('id', ticketId);
  }

  // ── Sync (mock) ──────────────────────────────────────────
  Future<String> triggerGooglePlacesSync() async {
    await Future.delayed(const Duration(seconds: 2));
    return 'Đã đồng bộ 42 địa điểm từ Google Places API lúc ${DateTime.now().toLocal()}';
  }
}

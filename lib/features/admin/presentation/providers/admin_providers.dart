import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../data/supabase_admin_datasource.dart';
import '../../../auth/domain/models/user_profile.dart';
import '../../../support/domain/models/support_ticket.dart';

// ── DataSource ──────────────────────────────────────────
final adminDataSourceProvider = Provider<SupabaseAdminDataSource>((ref) {
  return SupabaseAdminDataSource(Supabase.instance.client);
});

// ── Stats ──────────────────────────────────────────────
final adminStatsProvider = FutureProvider<AdminStats>((ref) async {
  final ds = ref.watch(adminDataSourceProvider);
  return ds.getStats();
});

// ── Users ──────────────────────────────────────────────
final adminUsersProvider =
    FutureProvider.family<List<UserProfile>, String>((ref, query) async {
  final ds = ref.watch(adminDataSourceProvider);
  return ds.getAllUsers(query: query.isEmpty ? null : query);
});

// User action notifier (role/vip update)
class AdminUserActionState {
  const AdminUserActionState({
    this.isLoading = false,
    this.success = false,
    this.error,
  });
  final bool isLoading;
  final bool success;
  final String? error;
}

class AdminUserActionNotifier
    extends StateNotifier<AdminUserActionState> {
  AdminUserActionNotifier(this._ds) : super(const AdminUserActionState());

  final SupabaseAdminDataSource _ds;

  Future<void> updateRole(String userId, String role) async {
    state = const AdminUserActionState(isLoading: true);
    try {
      await _ds.updateUserRole(userId, role);
      state = const AdminUserActionState(success: true);
    } catch (e) {
      state = AdminUserActionState(error: e.toString());
    }
  }

  Future<void> updateVip(String userId, String vipStatus) async {
    state = const AdminUserActionState(isLoading: true);
    try {
      await _ds.updateUserVip(userId, vipStatus);
      state = const AdminUserActionState(success: true);
    } catch (e) {
      state = AdminUserActionState(error: e.toString());
    }
  }

  void reset() => state = const AdminUserActionState();
}

final adminUserActionProvider = StateNotifierProvider.autoDispose<
    AdminUserActionNotifier, AdminUserActionState>((ref) {
  return AdminUserActionNotifier(ref.read(adminDataSourceProvider));
});

// ── Tickets ──────────────────────────────────────────────
final adminTicketsProvider =
    FutureProvider.family<List<SupportTicket>, String>((ref, status) async {
  final ds = ref.watch(adminDataSourceProvider);
  return ds.getAllTickets(status: status == 'all' ? null : status);
});

// Ticket reply notifier
class AdminTicketReplyState {
  const AdminTicketReplyState({
    this.isLoading = false,
    this.success = false,
    this.error,
  });
  final bool isLoading;
  final bool success;
  final String? error;
}

class AdminTicketReplyNotifier
    extends StateNotifier<AdminTicketReplyState> {
  AdminTicketReplyNotifier(this._ds)
      : super(const AdminTicketReplyState());

  final SupabaseAdminDataSource _ds;

  Future<void> reply(String ticketId, String text) async {
    if (text.trim().isEmpty) return;
    state = const AdminTicketReplyState(isLoading: true);
    try {
      await _ds.replyTicket(ticketId: ticketId, reply: text.trim());
      state = const AdminTicketReplyState(success: true);
    } catch (e) {
      state = AdminTicketReplyState(error: e.toString());
    }
  }

  Future<void> updateStatus(String ticketId, String status) async {
    state = const AdminTicketReplyState(isLoading: true);
    try {
      await _ds.updateTicketStatus(ticketId, status);
      state = const AdminTicketReplyState(success: true);
    } catch (e) {
      state = AdminTicketReplyState(error: e.toString());
    }
  }

  void reset() => state = const AdminTicketReplyState();
}

final adminTicketReplyProvider = StateNotifierProvider.autoDispose<
    AdminTicketReplyNotifier, AdminTicketReplyState>((ref) {
  return AdminTicketReplyNotifier(ref.read(adminDataSourceProvider));
});

// ── Sync ──────────────────────────────────────────────
class AdminSyncState {
  const AdminSyncState({
    this.isLoading = false,
    this.log,
    this.error,
  });
  final bool isLoading;
  final String? log;
  final String? error;
}

class AdminSyncNotifier extends StateNotifier<AdminSyncState> {
  AdminSyncNotifier(this._ds) : super(const AdminSyncState());

  final SupabaseAdminDataSource _ds;

  Future<void> triggerSync() async {
    state = const AdminSyncState(isLoading: true);
    try {
      final result = await _ds.triggerGooglePlacesSync();
      state = AdminSyncState(log: result);
    } catch (e) {
      state = AdminSyncState(error: e.toString());
    }
  }
}

final adminSyncProvider =
    StateNotifierProvider.autoDispose<AdminSyncNotifier, AdminSyncState>(
        (ref) {
  return AdminSyncNotifier(ref.read(adminDataSourceProvider));
});

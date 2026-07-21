import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../data/supabase_support_data_source.dart';
import '../../domain/models/support_ticket.dart';

// ── DataSource ──
final supportDataSourceProvider = Provider<SupabaseSupportDataSource>((ref) {
  return SupabaseSupportDataSource(Supabase.instance.client);
});

// ── Danh sách tickets ──
final myTicketsProvider = StreamProvider<List<SupportTicket>>((ref) {
  final ds = ref.watch(supportDataSourceProvider);
  return ds.watchMyTickets();
});

// ── Chi tiết 1 ticket ──
final ticketDetailProvider =
    FutureProvider.family<SupportTicket?, String>((ref, ticketId) {
  final ds = ref.watch(supportDataSourceProvider);
  return ds.getTicketById(ticketId);
});

// ── Tạo ticket mới ──
class CreateTicketState {
  const CreateTicketState({
    this.isLoading = false,
    this.success = false,
    this.error,
  });

  final bool isLoading;
  final bool success;
  final String? error;

  CreateTicketState copyWith({
    bool? isLoading,
    bool? success,
    String? error,
  }) =>
      CreateTicketState(
        isLoading: isLoading ?? this.isLoading,
        success: success ?? this.success,
        error: error,
      );
}

class CreateTicketNotifier extends StateNotifier<CreateTicketState> {
  CreateTicketNotifier(this._ds) : super(const CreateTicketState());

  final SupabaseSupportDataSource _ds;

  Future<void> submit({
    required String title,
    required String description,
    required String category,
  }) async {
    state = state.copyWith(isLoading: true, success: false);
    try {
      await _ds.createTicket(
        title: title,
        description: description,
        category: category,
      );
      state = state.copyWith(isLoading: false, success: true);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Không thể tạo yêu cầu: ${e.toString()}',
      );
    }
  }

  void reset() => state = const CreateTicketState();
}

final createTicketProvider =
    StateNotifierProvider.autoDispose<CreateTicketNotifier, CreateTicketState>(
        (ref) {
  final ds = ref.watch(supportDataSourceProvider);
  return CreateTicketNotifier(ds);
});

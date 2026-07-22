import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../features/auth/presentation/providers/auth_notifier.dart';
import '../../data/datasources/supabase_itinerary_datasource.dart';
import '../../domain/models/itinerary.dart';

/// ═══════════════════════════════════════════════════════
/// Itinerary Providers
/// ═══════════════════════════════════════════════════════

// ── DataSource ───────────────────────────────────────
final itineraryDatasourceProvider = Provider<SupabaseItineraryDataSource>((
  ref,
) {
  return SupabaseItineraryDataSource();
});

// ── My Itineraries ───────────────────────────────────
final myItinerariesProvider = FutureProvider<List<Itinerary>>((ref) async {
  final profile = ref.watch(currentProfileProvider);
  if (profile == null) return [];
  final ds = ref.watch(itineraryDatasourceProvider);
  final (list, failure) = await ds.getMyItineraries(profile.id);
  if (failure != null) throw failure;
  return list;
});

// ── Itinerary Detail ─────────────────────────────────
final itineraryDetailProvider = FutureProvider.family<Itinerary, String>((
  ref,
  id,
) async {
  final ds = ref.watch(itineraryDatasourceProvider);
  final (itinerary, failure) = await ds.getItineraryById(id);
  if (failure != null) throw failure;
  if (itinerary == null) throw Exception('Không tìm thấy lịch trình');
  return itinerary;
});

// ── Public Itineraries (Community Feed) ──────────────
final publicItinerariesProvider = FutureProvider<List<Itinerary>>((ref) async {
  final ds = ref.watch(itineraryDatasourceProvider);
  final (list, failure) = await ds.getPublicItineraries();
  if (failure != null) throw failure;
  return list;
});

/// ═══════════════════════════════════════════════════════
/// CreateItineraryNotifier — quản lý trạng thái tạo lịch trình
/// ═══════════════════════════════════════════════════════

class CreateItineraryState {
  const CreateItineraryState({
    this.isLoading = false,
    this.createdId,
    this.error,
  });

  final bool isLoading;
  final String? createdId;
  final String? error;

  bool get isSuccess => createdId != null;

  CreateItineraryState copyWith({
    bool? isLoading,
    String? createdId,
    String? error,
  }) => CreateItineraryState(
    isLoading: isLoading ?? this.isLoading,
    createdId: createdId ?? this.createdId,
    error: error,
  );
}

class CreateItineraryNotifier extends StateNotifier<CreateItineraryState> {
  CreateItineraryNotifier(this._ref) : super(const CreateItineraryState());

  final Ref _ref;

  Future<void> create({
    required String title,
    required DateTime startDate,
    required DateTime endDate,
    String? companion,
    String? budgetTier,
    String visibility = 'private',
  }) async {
    final profile = _ref.read(currentProfileProvider);
    if (profile == null) {
      state = state.copyWith(error: 'Chưa đăng nhập');
      return;
    }

    state = state.copyWith(isLoading: true);

    final ds = _ref.read(itineraryDatasourceProvider);
    final (id, failure) = await ds.createItinerary(
      userId: profile.id,
      title: title,
      startDate: startDate,
      endDate: endDate,
      companion: companion,
      budgetTier: budgetTier,
      visibility: visibility,
    );

    if (failure != null) {
      state = state.copyWith(isLoading: false, error: failure.message);
      return;
    }

    // Refresh danh sách lịch trình
    _ref.invalidate(myItinerariesProvider);

    state = state.copyWith(isLoading: false, createdId: id);
  }

  void reset() => state = const CreateItineraryState();
}

final createItineraryProvider =
    StateNotifierProvider<CreateItineraryNotifier, CreateItineraryState>((ref) {
      return CreateItineraryNotifier(ref);
    });

/// ═══════════════════════════════════════════════════════
/// ItineraryActionsNotifier — delete / like / clone
/// ═══════════════════════════════════════════════════════

class ItineraryActionsNotifier extends StateNotifier<bool> {
  ItineraryActionsNotifier(this._ref) : super(false);
  final Ref _ref;

  Future<bool> delete(String itineraryId) async {
    state = true;
    final ds = _ref.read(itineraryDatasourceProvider);
    final failure = await ds.deleteItinerary(itineraryId);
    state = false;
    if (failure != null) return false;
    _ref.invalidate(myItinerariesProvider);
    return true;
  }

  Future<bool> toggleLike({
    required String itineraryId,
    required bool isLiking,
  }) async {
    final profile = _ref.read(currentProfileProvider);
    if (profile == null) return false;
    final ds = _ref.read(itineraryDatasourceProvider);
    final failure = await ds.toggleLike(
      userId: profile.id,
      itineraryId: itineraryId,
      isLiking: isLiking,
    );
    return failure == null;
  }

  Future<String?> clone(String sourceId) async {
    state = true;
    final profile = _ref.read(currentProfileProvider);
    if (profile == null) {
      state = false;
      return null;
    }
    final ds = _ref.read(itineraryDatasourceProvider);
    final (newId, failure) = await ds.cloneItinerary(
      sourceId: sourceId,
      targetUserId: profile.id,
    );
    state = false;
    if (failure != null) return null;
    _ref.invalidate(myItinerariesProvider);
    return newId;
  }
}

final itineraryActionsProvider =
    StateNotifierProvider<ItineraryActionsNotifier, bool>((ref) {
      return ItineraryActionsNotifier(ref);
    });

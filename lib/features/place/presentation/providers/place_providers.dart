import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../features/auth/presentation/providers/auth_notifier.dart';
import '../../data/datasources/supabase_place_datasource.dart';
import '../../domain/models/place.dart';
import '../../domain/services/place_recommender.dart';
import '../../../auth/domain/models/user_profile.dart';

/// ═══════════════════════════════════════════════════════
/// Place Providers — Riverpod Provider declarations
/// ═══════════════════════════════════════════════════════

// ── DataSource provider ──────────────────────────────
final placeDatasourceProvider = Provider<SupabasePlaceDataSource>((ref) {
  return SupabasePlaceDataSource();
});

// ── Featured Places ──────────────────────────────────
/// Top 10 địa điểm nổi bật (dùng cho HomeScreen hero section)
final featuredPlacesProvider = FutureProvider<List<Place>>((ref) async {
  final ds = ref.watch(placeDatasourceProvider);
  final (places, failure) = await ds.getFeaturedPlaces(limit: 10);
  if (failure != null) throw failure;
  return places;
});

// ── Places by Category ───────────────────────────────
final placesByCategoryProvider =
    FutureProvider.family<List<Place>, String>((ref, category) async {
  final ds = ref.watch(placeDatasourceProvider);
  final (places, failure) = await ds.getPlacesByCategory(category, limit: 10);
  if (failure != null) throw failure;
  return places;
});

// ── Place Detail ─────────────────────────────────────
final placeDetailProvider =
    FutureProvider.family<Place, String>((ref, placeId) async {
  final ds = ref.watch(placeDatasourceProvider);
  final (place, failure) = await ds.getPlaceById(placeId);
  if (failure != null) throw failure;
  if (place == null) throw Exception('Không tìm thấy địa điểm');
  return place;
});

// ── Filter State ─────────────────────────────────────
final placeFilterProvider =
    StateProvider<PlaceFilter>((ref) => const PlaceFilter());

// ── Search Query ─────────────────────────────────────
final searchQueryProvider = StateProvider<String>((ref) => '');

// ── Search Results ───────────────────────────────────
final searchResultsProvider = FutureProvider<List<Place>>((ref) async {
  final query = ref.watch(searchQueryProvider);
  if (query.trim().isEmpty) return [];
  final ds = ref.watch(placeDatasourceProvider);
  final (places, failure) = await ds.searchPlaces(query: query);
  if (failure != null) throw failure;
  return places;
});

// ── Filtered Place List ───────────────────────────────
final filteredPlacesProvider = FutureProvider<List<Place>>((ref) async {
  final filter = ref.watch(placeFilterProvider);
  final ds = ref.watch(placeDatasourceProvider);
  final (places, failure) = await ds.getPlaces(filter: filter);
  if (failure != null) throw failure;
  return places;
});

// ── Saved Places ─────────────────────────────────────
final savedPlaceIdsProvider = FutureProvider<List<String>>((ref) async {
  final profile = ref.watch(currentProfileProvider);
  if (profile == null) return [];
  final ds = ref.watch(placeDatasourceProvider);
  final (ids, failure) = await ds.getSavedPlaceIds(profile.id);
  if (failure != null) return [];
  return ids;
});

/// Kiểm tra xem một địa điểm đã được lưu chưa
final isSavedProvider = Provider.family<bool, String>((ref, placeId) {
  final savedIds = ref.watch(savedPlaceIdsProvider).valueOrNull ?? [];
  return savedIds.contains(placeId);
});

// ── Recommended Places ───────────────────────────────
/// Gợi ý địa điểm dựa trên profile user (travel_style, budget, visited)
final recommendedPlacesProvider = FutureProvider<List<Place>>((ref) async {
  final profile = ref.watch(currentProfileProvider);
  final ds = ref.watch(placeDatasourceProvider);

  // Lấy tất cả địa điểm làm candidates
  final (allPlaces, failure) = await ds.getPlaces();
  if (failure != null) throw failure;

  // Lấy danh sách đã lưu (coi như đã ghé thăm cho mục đích đa dạng)
  final visitedIds = profile != null
      ? (await ds.getSavedPlaceIds(profile.id)).$1
      : <String>[];

  final input = RecommendInput(
    travelStyle: profile?.travelStyle ?? [],
    budgetPerPerson: 300000, // default 300k nếu chưa set
    travelWith: profile?.travelWith,
    visitedPlaceIds: visitedIds,
    region: profile?.preferredRegions?.isNotEmpty == true
        ? profile!.preferredRegions!.first
        : null,
  );

  final scored = PlaceRecommender.recommend(
    candidates: allPlaces,
    input: input,
    topK: 10,
  );

  return scored.map((s) => s.place).toList();
});

/// ═══════════════════════════════════════════════════════
/// SavePlaceNotifier — toggle save/unsave
/// ═══════════════════════════════════════════════════════
class SavePlaceNotifier extends StateNotifier<Set<String>> {
  SavePlaceNotifier(this._ref) : super({});

  final Ref _ref;

  Future<void> toggle(String placeId) async {
    final profile = _ref.read(currentProfileProvider);
    if (profile == null) return;

    final ds = _ref.read(placeDatasourceProvider);
    final isSaved = state.contains(placeId);

    // Optimistic update
    if (isSaved) {
      state = {...state}..remove(placeId);
      await ds.unsavePlace(userId: profile.id, placeId: placeId);
    } else {
      state = {...state, placeId};
      await ds.savePlace(userId: profile.id, placeId: placeId);
    }

    // Refresh saved list
    _ref.invalidate(savedPlaceIdsProvider);
  }
}

final savePlaceNotifierProvider =
    StateNotifierProvider<SavePlaceNotifier, Set<String>>((ref) {
  return SavePlaceNotifier(ref);
});

// ── Admin / Editor helpers ────────────────────────────

/// Tất cả địa điểm (không filter) — dùng cho Admin/Editor
final allPlacesProvider = FutureProvider<List<Place>>((ref) async {
  final ds = ref.watch(placeDatasourceProvider);
  final (places, failure) = await ds.getPlaces();
  if (failure != null) throw failure;
  return places;
});

/// Tìm kiếm địa điểm theo query — dùng cho Admin/Editor search
final searchPlacesProvider =
    FutureProvider.family<List<Place>, String>((ref, query) async {
  final ds = ref.watch(placeDatasourceProvider);
  final (places, failure) = await ds.searchPlaces(query: query);
  if (failure != null) throw failure;
  return places;
});

/// Lấy profile của bất kỳ user theo userId — dùng cho AdminUserDetail
final userProfileProvider =
    FutureProvider.family<UserProfile?, String>((ref, userId) async {
  final ds = ref.watch(placeDatasourceProvider);
  // Dùng trực tiếp Supabase để fetch profile theo userId
  final response = await ds.fetchUserById(userId);
  return response;
});

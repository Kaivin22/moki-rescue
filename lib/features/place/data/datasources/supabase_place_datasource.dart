import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/errors/exception_mapper.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/supabase/supabase_service.dart';
import '../../domain/models/place.dart';
import '../../../auth/domain/models/user_profile.dart';

/// ═══════════════════════════════════════════════════════
/// SupabasePlaceDataSource
/// Thực thi truy vấn địa điểm với Supabase:
///   - Danh sách (phân trang, lọc theo category/region)
///   - Full-text search (dùng unaccent extension)
///   - Filter kết hợp (rating, fee, tags, suitable_for)
///   - Chi tiết địa điểm theo id
///   - Lưu / bỏ lưu địa điểm
/// ═══════════════════════════════════════════════════════

class SupabasePlaceDataSource {
  SupabasePlaceDataSource() : _client = SupabaseService.client;

  final SupabaseClient _client;

  static const _pageSize = 20;

  // ═══════════════════════════════════════════════════
  // LIST
  // ═══════════════════════════════════════════════════

  /// Lấy danh sách địa điểm (phân trang, lọc tùy chọn)
  Future<(List<Place>, Failure?)> getPlaces({
    PlaceFilter filter = const PlaceFilter(),
    String sortBy = 'rating_avg', // 'rating_avg' | 'name' | 'entry_fee_min'
    bool ascending = false,
    int page = 0,
  }) async {
    try {
      var query = _client.from('places').select().eq('is_active', true);

      // ── Filters ──
      if (filter.category != null) {
        query = query.eq('category', filter.category!);
      }
      if (filter.region != null) {
        query = query.eq('region', filter.region!);
      }
      if (filter.minRating != null) {
        query = query.gte('rating_avg', filter.minRating!);
      }
      if (filter.maxFee != null) {
        query = query.lte('entry_fee_max', filter.maxFee!);
      }
      if (filter.onlyFree) {
        query = query.eq('entry_fee_min', 0);
      }

      // ── Sort + Pagination ──
      final data = await query
          .order(sortBy, ascending: ascending)
          .range(page * _pageSize, (page + 1) * _pageSize - 1);

      final places = (data as List).map((e) => Place.fromJson(e)).toList();

      // ── Client-side filter (tags, suitableFor, inSeason) ──
      final filtered = places.where((p) {
        if (filter.tags.isNotEmpty &&
            !filter.tags.any((t) => p.tags.contains(t))) {
          return false;
        }
        if (filter.suitableFor != null &&
            p.suitableFor.isNotEmpty &&
            !p.suitableFor.contains(filter.suitableFor)) {
          return false;
        }
        if (filter.onlyInSeason && !p.isInSeason) return false;
        return true;
      }).toList();

      return (filtered, null);
    } catch (e) {
      return (<Place>[], ExceptionMapper.map(e));
    }
  }

  // ═══════════════════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════════════════

  /// Tìm kiếm toàn văn bản (full-text search với unaccent)
  /// Supabase dùng PostgreSQL ts_vector để tìm theo name + description
  Future<(List<Place>, Failure?)> searchPlaces({
    required String query,
    int page = 0,
  }) async {
    if (query.trim().isEmpty) return (<Place>[], null);
    try {
      // Dùng PostgREST textSearch — cần cột ts_search_vector được index
      final data = await _client
          .from('places')
          .select()
          .eq('is_active', true)
          .textSearch('ts_search_vector', query.trim(), config: 'vietnamese')
          .order('rating_avg', ascending: false)
          .range(page * _pageSize, (page + 1) * _pageSize - 1);

      return ((data as List).map((e) => Place.fromJson(e)).toList(), null);
    } catch (_) {
      // Fallback: ILIKE search nếu ts_vector chưa setup
      return _ilikeFallback(query, page);
    }
  }

  /// Fallback search bằng ILIKE khi full-text search chưa sẵn sàng
  Future<(List<Place>, Failure?)> _ilikeFallback(String query, int page) async {
    try {
      final data = await _client
          .from('places')
          .select()
          .eq('is_active', true)
          .ilike('name', '%$query%')
          .order('rating_avg', ascending: false)
          .range(page * _pageSize, (page + 1) * _pageSize - 1);

      return ((data as List).map((e) => Place.fromJson(e)).toList(), null);
    } catch (e) {
      return (<Place>[], ExceptionMapper.map(e));
    }
  }

  // ═══════════════════════════════════════════════════
  // DETAIL
  // ═══════════════════════════════════════════════════

  /// Lấy chi tiết một địa điểm theo ID
  Future<(Place?, Failure?)> getPlaceById(String id) async {
    try {
      final data = await _client.from('places').select().eq('id', id).single();
      return (Place.fromJson(data), null);
    } catch (e) {
      return (null, ExceptionMapper.map(e));
    }
  }

  /// Lấy nhiều địa điểm theo danh sách IDs (dùng cho itinerary)
  Future<(List<Place>, Failure?)> getPlacesByIds(List<String> ids) async {
    if (ids.isEmpty) return (<Place>[], null);
    try {
      final data = await _client.from('places').select().inFilter('id', ids);
      return ((data as List).map((e) => Place.fromJson(e)).toList(), null);
    } catch (e) {
      return (<Place>[], ExceptionMapper.map(e));
    }
  }

  // ═══════════════════════════════════════════════════
  // SAVED PLACES
  // ═══════════════════════════════════════════════════

  /// Lấy danh sách ID địa điểm đã lưu của user
  Future<(List<String>, Failure?)> getSavedPlaceIds(String userId) async {
    try {
      final data = await _client
          .from('saved_places')
          .select('place_id')
          .eq('user_id', userId);
      return (
        (data as List).map((e) => e['place_id'] as String).toList(),
        null,
      );
    } catch (e) {
      return (<String>[], ExceptionMapper.map(e));
    }
  }

  /// Lưu địa điểm
  Future<Failure?> savePlace({
    required String userId,
    required String placeId,
  }) async {
    try {
      await _client.from('saved_places').upsert({
        'user_id': userId,
        'place_id': placeId,
        'created_at': DateTime.now().toIso8601String(),
      });
      return null;
    } catch (e) {
      return ExceptionMapper.map(e);
    }
  }

  /// Bỏ lưu địa điểm
  Future<Failure?> unsavePlace({
    required String userId,
    required String placeId,
  }) async {
    try {
      await _client
          .from('saved_places')
          .delete()
          .eq('user_id', userId)
          .eq('place_id', placeId);
      return null;
    } catch (e) {
      return ExceptionMapper.map(e);
    }
  }

  // ═══════════════════════════════════════════════════
  // FEATURED / NEARBY
  // ═══════════════════════════════════════════════════

  /// Top địa điểm nổi bật (rating cao nhất)
  Future<(List<Place>, Failure?)> getFeaturedPlaces({int limit = 10}) async {
    try {
      final data = await _client
          .from('places')
          .select()
          .eq('is_active', true)
          .order('rating_avg', ascending: false)
          .limit(limit);
      return ((data as List).map((e) => Place.fromJson(e)).toList(), null);
    } catch (e) {
      return (<Place>[], ExceptionMapper.map(e));
    }
  }

  /// Địa điểm theo category
  Future<(List<Place>, Failure?)> getPlacesByCategory(
    String category, {
    int limit = 10,
  }) async {
    try {
      final data = await _client
          .from('places')
          .select()
          .eq('is_active', true)
          .eq('category', category)
          .order('rating_avg', ascending: false)
          .limit(limit);
      return ((data as List).map((e) => Place.fromJson(e)).toList(), null);
    } catch (e) {
      return (<Place>[], ExceptionMapper.map(e));
    }
  }

  // ═══════════════════════════════════════════════════
  // ADMIN / EDITOR — Write operations
  // ═══════════════════════════════════════════════════

  /// Cập nhật thông tin địa điểm — dùng cho Admin/Editor
  Future<void> updatePlace({
    required String placeId,
    required Map<String, dynamic> data,
  }) async {
    await _client.from('places').update(data).eq('id', placeId);
  }

  /// Lấy profile của bất kỳ user theo userId — dùng cho AdminUserDetail
  Future<UserProfile?> fetchUserById(String userId) async {
    try {
      final data = await _client
          .from('profiles')
          .select()
          .eq('id', userId)
          .maybeSingle();
      if (data == null) return null;
      return UserProfile.fromJson(data);
    } catch (_) {
      return null;
    }
  }
}

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/errors/exception_mapper.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/supabase/supabase_service.dart';
import '../../domain/models/itinerary.dart';

/// ═══════════════════════════════════════════════════════
/// SupabaseItineraryDataSource
/// CRUD lịch trình người dùng + lịch trình cộng đồng
/// ═══════════════════════════════════════════════════════

class SupabaseItineraryDataSource {
  SupabaseItineraryDataSource() : _client = SupabaseService.client;

  final SupabaseClient _client;

  // ═══════════════════════════════════════════════════
  // MY ITINERARIES
  // ═══════════════════════════════════════════════════

  /// Lấy tất cả lịch trình của user
  Future<(List<Itinerary>, Failure?)> getMyItineraries(String userId) async {
    try {
      final data = await _client
          .from('itineraries')
          .select('''
            *,
            days:itinerary_days(
              *,
              slots:itinerary_slots(*)
            )
          ''')
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      return ((data as List).map((e) => Itinerary.fromJson(e)).toList(), null);
    } catch (e) {
      return (<Itinerary>[], ExceptionMapper.map(e));
    }
  }

  /// Lấy chi tiết 1 lịch trình theo ID
  Future<(Itinerary?, Failure?)> getItineraryById(String id) async {
    try {
      final data = await _client
          .from('itineraries')
          .select('''
            *,
            days:itinerary_days(
              *,
              slots:itinerary_slots(*)
            )
          ''')
          .eq('id', id)
          .single();

      return (Itinerary.fromJson(data), null);
    } catch (e) {
      return (null, ExceptionMapper.map(e));
    }
  }

  // ═══════════════════════════════════════════════════
  // CREATE / UPDATE / DELETE
  // ═══════════════════════════════════════════════════

  /// Tạo lịch trình mới (Step 1: tạo header)
  /// Trả về ID của lịch trình vừa tạo
  Future<(String?, Failure?)> createItinerary({
    required String userId,
    required String title,
    required DateTime startDate,
    required DateTime endDate,
    String? companion,
    String? budgetTier,
    String visibility = 'private',
  }) async {
    try {
      final numDays = endDate.difference(startDate).inDays + 1;

      // Tạo itinerary header
      final result = await _client
          .from('itineraries')
          .insert({
            'user_id': userId,
            'title': title,
            'start_date': startDate.toIso8601String().substring(0, 10),
            'end_date': endDate.toIso8601String().substring(0, 10),
            'companion': companion,
            'budget_tier': budgetTier,
            'visibility': visibility,
            'created_at': DateTime.now().toIso8601String(),
            'updated_at': DateTime.now().toIso8601String(),
          })
          .select('id')
          .single();

      final itineraryId = result['id'] as String;

      // Tạo ngày cho lịch trình
      final dayRows = List.generate(
        numDays,
        (i) => {
          'itinerary_id': itineraryId,
          'day_index': i,
          'date': startDate
              .add(Duration(days: i))
              .toIso8601String()
              .substring(0, 10),
        },
      );

      await _client.from('itinerary_days').insert(dayRows);

      return (itineraryId, null);
    } catch (e) {
      return (null, ExceptionMapper.map(e));
    }
  }

  /// Cập nhật metadata lịch trình
  Future<Failure?> updateItinerary({
    required String id,
    String? title,
    String? description,
    String? visibility,
    String? coverImageUrl,
    String? companion,
    String? budgetTier,
  }) async {
    try {
      await _client
          .from('itineraries')
          .update({
            'title': title,
            'description': description,
            'visibility': visibility,
            'cover_image_url': coverImageUrl,
            'companion': companion,
            'budget_tier': budgetTier,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', id);
      return null;
    } catch (e) {
      return ExceptionMapper.map(e);
    }
  }

  /// Xóa lịch trình (cascade xóa days + slots)
  Future<Failure?> deleteItinerary(String id) async {
    try {
      await _client.from('itineraries').delete().eq('id', id);
      return null;
    } catch (e) {
      return ExceptionMapper.map(e);
    }
  }

  // ═══════════════════════════════════════════════════
  // SLOT MANAGEMENT
  // ═══════════════════════════════════════════════════

  /// Thêm địa điểm vào ngày cụ thể
  Future<(ItinerarySlot?, Failure?)> addSlot({
    required String dayId,
    required String placeId,
    required String placeName,
    String? placeImageUrl,
    String? placeCategory,
    required int orderIndex,
    required String startTime,
    required int durationMin,
    String? note,
  }) async {
    try {
      final data = await _client
          .from('itinerary_slots')
          .insert({
            'day_id': dayId,
            'place_id': placeId,
            'place_name': placeName,
            'place_image_url': placeImageUrl,
            'place_category': placeCategory,
            'order_index': orderIndex,
            'start_time': startTime,
            'duration_min': durationMin,
            'note': note,
          })
          .select()
          .single();

      return (ItinerarySlot.fromJson(data), null);
    } catch (e) {
      return (null, ExceptionMapper.map(e));
    }
  }

  /// Cập nhật slot (giờ, duration, note)
  Future<Failure?> updateSlot({
    required String slotId,
    String? startTime,
    int? durationMin,
    int? orderIndex,
    String? note,
    String? transportMode,
    int? travelTimeMin,
  }) async {
    try {
      await _client
          .from('itinerary_slots')
          .update({
            'start_time': startTime,
            'duration_min': durationMin,
            'order_index': orderIndex,
            'note': note,
            'transport_mode': transportMode,
            'travel_time_min': travelTimeMin,
          })
          .eq('id', slotId);
      return null;
    } catch (e) {
      return ExceptionMapper.map(e);
    }
  }

  /// Xóa slot khỏi ngày
  Future<Failure?> removeSlot(String slotId) async {
    try {
      await _client.from('itinerary_slots').delete().eq('id', slotId);
      return null;
    } catch (e) {
      return ExceptionMapper.map(e);
    }
  }

  /// Batch update thứ tự slots sau khi reorder
  Future<Failure?> reorderSlots(
    List<({String id, int orderIndex})> updates,
  ) async {
    try {
      for (final upd in updates) {
        await _client
            .from('itinerary_slots')
            .update({'order_index': upd.orderIndex})
            .eq('id', upd.id);
      }
      return null;
    } catch (e) {
      return ExceptionMapper.map(e);
    }
  }

  // ═══════════════════════════════════════════════════
  // COMMUNITY FEED
  // ═══════════════════════════════════════════════════

  /// Lịch trình công khai (community feed)
  Future<(List<Itinerary>, Failure?)> getPublicItineraries({
    int page = 0,
    String sortBy = 'like_count',
  }) async {
    try {
      final data = await _client
          .from('itineraries')
          .select('''
            *,
            author:profiles!user_id(display_name, avatar_url),
            days:itinerary_days(
              *,
              slots:itinerary_slots(*)
            )
          ''')
          .eq('visibility', 'public')
          .order(sortBy, ascending: false)
          .range(page * 10, (page + 1) * 10 - 1);

      return (
        (data as List).map((e) {
          final authorData = e['author'] as Map<String, dynamic>?;
          return Itinerary.fromJson({
            ...e,
            'author_name': authorData?['display_name'],
            'author_avatar_url': authorData?['avatar_url'],
          });
        }).toList(),
        null,
      );
    } catch (e) {
      return (<Itinerary>[], ExceptionMapper.map(e));
    }
  }

  // ═══════════════════════════════════════════════════
  // LIKE / CLONE
  // ═══════════════════════════════════════════════════

  /// Like / unlike lịch trình
  Future<Failure?> toggleLike({
    required String userId,
    required String itineraryId,
    required bool isLiking,
  }) async {
    try {
      if (isLiking) {
        await _client.from('itinerary_likes').upsert({
          'user_id': userId,
          'itinerary_id': itineraryId,
          'created_at': DateTime.now().toIso8601String(),
        });
      } else {
        await _client
            .from('itinerary_likes')
            .delete()
            .eq('user_id', userId)
            .eq('itinerary_id', itineraryId);
      }
      return null;
    } catch (e) {
      return ExceptionMapper.map(e);
    }
  }

  /// Clone lịch trình công khai về của user
  Future<(String?, Failure?)> cloneItinerary({
    required String sourceId,
    required String targetUserId,
  }) async {
    try {
      // Lấy lịch trình gốc
      final (source, failure) = await getItineraryById(sourceId);
      if (failure != null || source == null) {
        return (null, failure ?? const ServerFailure());
      }

      // Tạo bản sao với visibility = private
      final (newId, createFailure) = await createItinerary(
        userId: targetUserId,
        title: '${source.title} (sao chép)',
        startDate: DateTime.now(),
        endDate: DateTime.now().add(Duration(days: source.numDays - 1)),
        companion: source.companion,
        budgetTier: source.budgetTier,
        visibility: 'private',
      );

      if (createFailure != null) return (null, createFailure);

      // Tăng clone_count ở lịch trình gốc
      await _client
          .from('itineraries')
          .update({'clone_count': source.cloneCount + 1})
          .eq('id', sourceId);

      return (newId, null);
    } catch (e) {
      return (null, ExceptionMapper.map(e));
    }
  }
}

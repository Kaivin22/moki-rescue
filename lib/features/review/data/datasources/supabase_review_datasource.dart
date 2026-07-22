import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/errors/exception_mapper.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/supabase/supabase_service.dart';
import '../../domain/models/review.dart';

/// ═══════════════════════════════════════════════════════
/// SupabaseReviewDataSource
/// CRUD reviews + helpful vote
/// ═══════════════════════════════════════════════════════

class SupabaseReviewDataSource {
  SupabaseReviewDataSource() : _client = SupabaseService.client;
  final SupabaseClient _client;

  /// Lấy reviews cho 1 địa điểm (phân trang)
  Future<(List<Review>, Failure?)> getReviewsByPlace({
    required String placeId,
    String sortBy = 'created_at',
    bool ascending = false,
    int page = 0,
    int pageSize = 10,
  }) async {
    try {
      final data = await _client
          .from('reviews')
          .select('''
            *,
            author:profiles!user_id(display_name, avatar_url)
          ''')
          .eq('place_id', placeId)
          .order(sortBy, ascending: ascending)
          .range(page * pageSize, (page + 1) * pageSize - 1);

      return ((data as List).map((e) => Review.fromJson(e)).toList(), null);
    } catch (e) {
      return (<Review>[], ExceptionMapper.map(e));
    }
  }

  /// Tạo review mới
  Future<(Review?, Failure?)> createReview(Review review) async {
    try {
      final data = await _client
          .from('reviews')
          .insert(review.toCreateJson())
          .select('''
            *,
            author:profiles!user_id(display_name, avatar_url)
          ''')
          .single();
      return (Review.fromJson(data), null);
    } catch (e) {
      return (null, ExceptionMapper.map(e));
    }
  }

  /// Xóa review
  Future<Failure?> deleteReview(String reviewId) async {
    try {
      await _client.from('reviews').delete().eq('id', reviewId);
      return null;
    } catch (e) {
      return ExceptionMapper.map(e);
    }
  }

  /// Toggle helpful vote
  Future<Failure?> toggleHelpful({
    required String userId,
    required String reviewId,
    required bool isHelpful,
  }) async {
    try {
      if (isHelpful) {
        await _client.from('review_helpful').upsert({
          'user_id': userId,
          'review_id': reviewId,
        });
      } else {
        await _client
            .from('review_helpful')
            .delete()
            .eq('user_id', userId)
            .eq('review_id', reviewId);
      }
      return null;
    } catch (e) {
      return ExceptionMapper.map(e);
    }
  }

  /// Thống kê rating tổng cho 1 place
  Future<(Map<int, int>, Failure?)> getRatingDistribution(
    String placeId,
  ) async {
    try {
      final data = await _client
          .from('reviews')
          .select('rating')
          .eq('place_id', placeId);

      final dist = <int, int>{1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
      for (final row in data as List) {
        final r = row['rating'] as int;
        dist[r] = (dist[r] ?? 0) + 1;
      }
      return (dist, null);
    } catch (e) {
      return (<int, int>{}, ExceptionMapper.map(e));
    }
  }
}

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/errors/exception_mapper.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/supabase/supabase_service.dart';

/// ═══════════════════════════════════════════════════════
/// SupabaseCommunityDataSource
/// Follow/unfollow, follower list, leaderboard
/// ═══════════════════════════════════════════════════════

class SupabaseCommunityDataSource {
  SupabaseCommunityDataSource() : _client = SupabaseService.client;
  final SupabaseClient _client;

  // ═══════════════════════════════════════════════════
  // FOLLOW
  // ═══════════════════════════════════════════════════

  /// Follow user
  Future<Failure?> follow({
    required String followerId,
    required String followingId,
  }) async {
    try {
      await _client.from('follows').upsert({
        'follower_id': followerId,
        'following_id': followingId,
      });
      return null;
    } catch (e) {
      return ExceptionMapper.map(e);
    }
  }

  /// Unfollow user
  Future<Failure?> unfollow({
    required String followerId,
    required String followingId,
  }) async {
    try {
      await _client
          .from('follows')
          .delete()
          .eq('follower_id', followerId)
          .eq('following_id', followingId);
      return null;
    } catch (e) {
      return ExceptionMapper.map(e);
    }
  }

  /// Kiểm tra đã follow chưa
  Future<bool> isFollowing({
    required String followerId,
    required String followingId,
  }) async {
    try {
      final data = await _client
          .from('follows')
          .select('id')
          .eq('follower_id', followerId)
          .eq('following_id', followingId)
          .maybeSingle();
      return data != null;
    } catch (_) {
      return false;
    }
  }

  /// Danh sách followers
  Future<(List<Map<String, dynamic>>, Failure?)> getFollowers(
      String userId) async {
    try {
      final data = await _client
          .from('follows')
          .select('''
            follower:profiles!follower_id(id, display_name, avatar_url)
          ''')
          .eq('following_id', userId);

      final followers = (data as List)
          .map((e) => e['follower'] as Map<String, dynamic>)
          .toList();
      return (followers, null);
    } catch (e) {
      return (<Map<String, dynamic>>[], ExceptionMapper.map(e));
    }
  }

  /// Danh sách following
  Future<(List<Map<String, dynamic>>, Failure?)> getFollowing(
      String userId) async {
    try {
      final data = await _client
          .from('follows')
          .select('''
            following:profiles!following_id(id, display_name, avatar_url)
          ''')
          .eq('follower_id', userId);

      final following = (data as List)
          .map((e) => e['following'] as Map<String, dynamic>)
          .toList();
      return (following, null);
    } catch (e) {
      return (<Map<String, dynamic>>[], ExceptionMapper.map(e));
    }
  }

  // ═══════════════════════════════════════════════════
  // LEADERBOARD
  // ═══════════════════════════════════════════════════

  /// Top contributors (theo số review + itinerary)
  Future<(List<Map<String, dynamic>>, Failure?)> getLeaderboard({
    int limit = 20,
  }) async {
    try {
      // Lấy profiles sắp xếp theo reviewer_score (denormalized)
      final data = await _client
          .from('profiles')
          .select('id, display_name, avatar_url, reviewer_score, level')
          .order('reviewer_score', ascending: false)
          .limit(limit);

      return (List<Map<String, dynamic>>.from(data as List), null);
    } catch (e) {
      return (<Map<String, dynamic>>[], ExceptionMapper.map(e));
    }
  }
}

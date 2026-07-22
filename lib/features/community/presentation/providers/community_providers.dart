import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../features/auth/presentation/providers/auth_notifier.dart';
import '../../data/datasources/supabase_community_datasource.dart';

/// ═══════════════════════════════════════════════════════
/// Community Providers
/// ═══════════════════════════════════════════════════════

final communityDatasourceProvider = Provider<SupabaseCommunityDataSource>((
  ref,
) {
  return SupabaseCommunityDataSource();
});

/// Leaderboard — top contributors
final leaderboardProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final ds = ref.watch(communityDatasourceProvider);
  final (list, failure) = await ds.getLeaderboard();
  if (failure != null) throw failure;
  return list;
});

/// Followers cho user hiện tại
final myFollowersProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final profile = ref.watch(currentProfileProvider);
  if (profile == null) return [];
  final ds = ref.watch(communityDatasourceProvider);
  final (list, failure) = await ds.getFollowers(profile.id);
  if (failure != null) return [];
  return list;
});

/// Following cho user hiện tại
final myFollowingProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final profile = ref.watch(currentProfileProvider);
  if (profile == null) return [];
  final ds = ref.watch(communityDatasourceProvider);
  final (list, failure) = await ds.getFollowing(profile.id);
  if (failure != null) return [];
  return list;
});

/// Kiểm tra đã follow user nào chưa (family provider by targetUserId)
final isFollowingProvider = FutureProvider.family<bool, String>((
  ref,
  targetUserId,
) async {
  final profile = ref.watch(currentProfileProvider);
  if (profile == null) return false;
  final ds = ref.watch(communityDatasourceProvider);
  return ds.isFollowing(followerId: profile.id, followingId: targetUserId);
});

/// ═══════════════════════════════════════════════════════
/// FollowNotifier — toggle follow/unfollow
/// ═══════════════════════════════════════════════════════
class FollowNotifier extends StateNotifier<bool> {
  FollowNotifier(this._ref) : super(false);
  final Ref _ref;

  Future<void> toggle(String targetUserId) async {
    final profile = _ref.read(currentProfileProvider);
    if (profile == null) return;

    state = true; // isLoading
    final ds = _ref.read(communityDatasourceProvider);
    final alreadyFollowing = await ds.isFollowing(
      followerId: profile.id,
      followingId: targetUserId,
    );

    if (alreadyFollowing) {
      await ds.unfollow(followerId: profile.id, followingId: targetUserId);
    } else {
      await ds.follow(followerId: profile.id, followingId: targetUserId);
    }

    // Refresh
    _ref.invalidate(isFollowingProvider(targetUserId));
    _ref.invalidate(myFollowersProvider);
    _ref.invalidate(myFollowingProvider);

    state = false;
  }
}

final followNotifierProvider = StateNotifierProvider<FollowNotifier, bool>((
  ref,
) {
  return FollowNotifier(ref);
});

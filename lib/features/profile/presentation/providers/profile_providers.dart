import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../features/auth/data/datasources/supabase_auth_datasource.dart';
import '../../../../features/auth/domain/models/user_profile.dart';
import '../../../../features/auth/presentation/providers/auth_notifier.dart';
import '../../../../features/place/data/datasources/supabase_place_datasource.dart';
import '../../../../features/place/domain/models/place.dart';
import '../../../../features/community/presentation/providers/community_providers.dart';

/// ═══════════════════════════════════════════════════════
/// Profile Providers
/// ═══════════════════════════════════════════════════════

/// Profile chi tiết cho user khác (public profile)
final userProfileProvider = FutureProvider.family<UserProfile?, String>((
  ref,
  userId,
) async {
  final ds = SupabaseAuthDataSource();
  final (profile, failure) = await ds.fetchProfile(userId);
  if (failure != null) throw failure;
  return profile;
});

/// Saved places cho tab "Đã lưu" trong ProfileScreen
final savedPlacesListProvider = FutureProvider<List<Place>>((ref) async {
  final profile = ref.watch(currentProfileProvider);
  if (profile == null) return [];

  final placeDs = SupabasePlaceDataSource();
  final (ids, failure) = await placeDs.getSavedPlaceIds(profile.id);
  if (failure != null || ids.isEmpty) return [];

  final (places, placeFailure) = await placeDs.getPlacesByIds(ids);
  if (placeFailure != null) return [];
  return places;
});

// Alias dùng trong SavedPlacesScreen
final savedPlacesProvider = savedPlacesListProvider;

/// ═══════════════════════════════════════════════════════
/// EditProfileNotifier — cập nhật thông tin cá nhân
/// ═══════════════════════════════════════════════════════

class EditProfileState {
  const EditProfileState({
    this.isLoading = false,
    this.success = false,
    this.error,
  });
  final bool isLoading;
  final bool success;
  final String? error;
}

class EditProfileNotifier extends StateNotifier<EditProfileState> {
  EditProfileNotifier(this._ref) : super(const EditProfileState());
  final Ref _ref;

  Future<void> updateProfile({
    String? displayName,
    String? bio,
    String? phone,
    List<String>? travelStyle,
    String? vipStatus,
    String? preferredTransport,
    String? travelWith,
    String? homeCity,
  }) async {
    final profile = _ref.read(currentProfileProvider);
    if (profile == null) {
      state = const EditProfileState(error: 'Chưa đăng nhập');
      return;
    }

    state = const EditProfileState(isLoading: true);

    final ds = SupabaseAuthDataSource();
    final updates = <String, dynamic>{};
    if (displayName != null) updates['display_name'] = displayName;
    if (bio != null) updates['bio'] = bio;
    if (phone != null) updates['phone'] = phone;
    if (travelStyle != null) updates['travel_style'] = travelStyle;
    if (vipStatus != null) updates['vip_status'] = vipStatus;
    if (preferredTransport != null) {
      updates['preferred_transport'] = preferredTransport;
    }
    if (travelWith != null) updates['travel_with'] = travelWith;
    if (homeCity != null) updates['home_city'] = homeCity;

    final (updated, failure) = await ds.updateProfile(
      userId: profile.id,
      data: updates,
    );

    if (failure != null || updated == null) {
      state = EditProfileState(error: failure?.message ?? 'Không thể cập nhật');
      return;
    }

    // Refresh profile
    _ref.read(authNotifierProvider.notifier).reloadProfile();

    state = const EditProfileState(success: true);
  }

  void reset() => state = const EditProfileState();
}

final editProfileProvider =
    StateNotifierProvider<EditProfileNotifier, EditProfileState>((ref) {
      return EditProfileNotifier(ref);
    });

/// Follower + following counts
final followerCountProvider = FutureProvider<int>((ref) async {
  final followers = ref.watch(myFollowersProvider).valueOrNull ?? [];
  return followers.length;
});

final followingCountProvider = FutureProvider<int>((ref) async {
  final following = ref.watch(myFollowingProvider).valueOrNull ?? [];
  return following.length;
});

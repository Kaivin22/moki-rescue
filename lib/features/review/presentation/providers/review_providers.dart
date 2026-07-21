import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../features/auth/presentation/providers/auth_notifier.dart';
import '../../data/datasources/supabase_review_datasource.dart';
import '../../domain/models/review.dart';

/// ═══════════════════════════════════════════════════════
/// Review Providers
/// ═══════════════════════════════════════════════════════

final reviewDatasourceProvider = Provider<SupabaseReviewDataSource>((ref) {
  return SupabaseReviewDataSource();
});

/// Reviews cho 1 địa điểm (family provider by placeId)
final reviewsByPlaceProvider =
    FutureProvider.family<List<Review>, String>((ref, placeId) async {
  final ds = ref.watch(reviewDatasourceProvider);
  final (reviews, failure) = await ds.getReviewsByPlace(placeId: placeId);
  if (failure != null) throw failure;
  return reviews;
});

/// Rating distribution cho 1 place
final ratingDistributionProvider =
    FutureProvider.family<Map<int, int>, String>((ref, placeId) async {
  final ds = ref.watch(reviewDatasourceProvider);
  final (dist, failure) = await ds.getRatingDistribution(placeId);
  if (failure != null) throw failure;
  return dist;
});

/// ═══════════════════════════════════════════════════════
/// WriteReviewNotifier — tạo review mới
/// ═══════════════════════════════════════════════════════

class WriteReviewState {
  const WriteReviewState({
    this.isLoading = false,
    this.success = false,
    this.error,
  });
  final bool isLoading;
  final bool success;
  final String? error;
}

class WriteReviewNotifier extends StateNotifier<WriteReviewState> {
  WriteReviewNotifier(this._ref) : super(const WriteReviewState());
  final Ref _ref;

  Future<void> submit({
    required String placeId,
    required int rating,
    String? title,
    String? content,
    List<String> imageUrls = const [],
    DateTime? visitDate,
  }) async {
    final profile = _ref.read(currentProfileProvider);
    if (profile == null) {
      state = const WriteReviewState(error: 'Chưa đăng nhập');
      return;
    }

    state = const WriteReviewState(isLoading: true);

    final review = Review(
      id: '', // auto-gen by Supabase
      userId: profile.id,
      placeId: placeId,
      rating: rating,
      title: title,
      content: content,
      imageUrls: imageUrls,
      visitDate: visitDate,
      createdAt: DateTime.now(),
    );

    final ds = _ref.read(reviewDatasourceProvider);
    final (created, failure) = await ds.createReview(review);

    if (failure != null) {
      state = WriteReviewState(error: failure.message);
      return;
    }

    // Invalidate reviews list
    _ref.invalidate(reviewsByPlaceProvider(placeId));
    _ref.invalidate(ratingDistributionProvider(placeId));

    state = WriteReviewState(success: created != null);
  }

  void reset() => state = const WriteReviewState();
}

final writeReviewProvider =
    StateNotifierProvider<WriteReviewNotifier, WriteReviewState>((ref) {
  return WriteReviewNotifier(ref);
});

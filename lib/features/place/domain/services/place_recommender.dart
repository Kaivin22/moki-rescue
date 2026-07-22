library;

// PlaceRecommender — thuật toán gợi ý địa điểm dựa trên weighted scoring
// score = styleMatch×40 + ratingScore×25 + budgetScore×20 + popularityScore×15

import '../models/place.dart';

/// Tham số đầu vào cho bộ gợi ý
class RecommendInput {
  const RecommendInput({
    required this.travelStyle,
    required this.budgetPerPerson,
    this.travelWith,
    this.visitedPlaceIds = const [],
    this.region,
  });

  /// Tags phong cách: ['beach', 'culture', 'food', ...]
  final List<String> travelStyle;

  /// Ngân sách mỗi người (VND)
  final int budgetPerPerson;

  /// 'solo' | 'couple' | 'family' | 'friends'
  final String? travelWith;

  /// Danh sách ID đã ghé thăm — loại khỏi kết quả
  final List<String> visitedPlaceIds;

  /// Lọc theo vùng: 'danang' | 'hoian' | null (tất cả)
  final String? region;
}

/// Kết quả gợi ý có điểm số
class ScoredPlace {
  const ScoredPlace({
    required this.place,
    required this.score,
    required this.breakdown,
  });

  final Place place;

  /// Điểm tổng [0.0 – 100.0]
  final double score;

  /// Chi tiết từng thành phần
  final ScoreBreakdown breakdown;
}

class ScoreBreakdown {
  const ScoreBreakdown({
    required this.styleMatch,
    required this.ratingScore,
    required this.budgetScore,
    required this.popularityScore,
  });

  final double styleMatch; // [0.0 – 1.0]
  final double ratingScore; // [0.0 – 1.0]
  final double budgetScore; // 0.0 | 0.5 | 1.0
  final double popularityScore; // [0.0 – 1.0]

  double get total =>
      styleMatch * 40 +
      ratingScore * 25 +
      budgetScore * 20 +
      popularityScore * 15;
}

/// ═══════════════════════════════════════════════════════
/// PlaceRecommender — Weighted Scoring Algorithm
///
/// Công thức:
///   score = styleMatch×40 + ratingScore×25 +
///           budgetScore×20 + popularityScore×15
///
/// Filter trước khi score:
///   1. Bỏ visited places
///   2. Bỏ đóng cửa tháng hiện tại (best_months check)
///   3. Bỏ không phù hợp suitable_for
///   4. Lọc region (nếu có)
/// ═══════════════════════════════════════════════════════
abstract final class PlaceRecommender {
  /// Trả về danh sách địa điểm gợi ý, sắp xếp theo score giảm dần
  static List<ScoredPlace> recommend({
    required List<Place> candidates,
    required RecommendInput input,
    int topK = 10,
  }) {
    final currentMonth = DateTime.now().month;

    // ── STEP 1: Filter ─────────────────────────────────
    final eligible = candidates.where((p) {
      // Bỏ visited
      if (input.visitedPlaceIds.contains(p.id)) return false;

      // Bỏ đóng cửa tháng này
      if (p.bestMonths.isNotEmpty && !p.bestMonths.contains(currentMonth)) {
        return false;
      }

      // Bỏ không phù hợp suitable_for
      if (input.travelWith != null &&
          p.suitableFor.isNotEmpty &&
          !p.suitableFor.contains(input.travelWith)) {
        return false;
      }

      // Lọc region
      if (input.region != null && p.region != input.region) {
        return false;
      }

      return true;
    }).toList();

    // ── STEP 2: Score ──────────────────────────────────
    final scored = eligible.map((p) {
      final breakdown = _score(p, input);
      return ScoredPlace(
        place: p,
        score: breakdown.total,
        breakdown: breakdown,
      );
    }).toList();

    // ── STEP 3: Sort + TopK ────────────────────────────
    scored.sort((a, b) => b.score.compareTo(a.score));
    return scored.take(topK).toList();
  }

  // ── Tính điểm cho 1 địa điểm ──────────────────────
  static ScoreBreakdown _score(Place p, RecommendInput input) {
    // styleMatch: tỉ lệ tags trùng với travel_style
    final styleMatch = input.travelStyle.isEmpty
        ? 0.5 // neutral nếu user không chọn style
        : () {
            final matches = input.travelStyle
                .where((s) => p.tags.contains(s))
                .length;
            return matches / input.travelStyle.length;
          }();

    // ratingScore: rating_avg / 5.0
    final ratingScore = (p.ratingAvg / 5.0).clamp(0.0, 1.0);

    // budgetScore: so sánh entry_fee_max với budget
    final double budgetScore;
    final budget = input.budgetPerPerson;
    if (budget <= 0 || p.entryFeeMax <= budget) {
      budgetScore = 1.0; // Trong ngân sách
    } else if (p.entryFeeMax <= budget * 1.5) {
      budgetScore = 0.5; // Vượt 50%
    } else {
      budgetScore = 0.0; // Vượt >50%
    }

    // popularityScore: min(rating_count / 100, 1.0)
    final popularityScore = (p.ratingCount / 100).clamp(0.0, 1.0);

    return ScoreBreakdown(
      styleMatch: styleMatch,
      ratingScore: ratingScore,
      budgetScore: budgetScore,
      popularityScore: popularityScore,
    );
  }
}

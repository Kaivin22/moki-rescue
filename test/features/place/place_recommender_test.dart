import 'package:flutter_test/flutter_test.dart';
import 'package:danang_itinerary/features/place/domain/models/place.dart';
import 'package:danang_itinerary/features/place/domain/services/place_recommender.dart';

// ═══════════════════════════════════════════════════════
// Test fixtures — tập địa điểm mẫu
// ═══════════════════════════════════════════════════════

Place _makePlace({
  String id = 'p1',
  String name = 'Test Place',
  String category = 'beach',
  List<String> tags = const ['beach'],
  double ratingAvg = 4.0,
  int ratingCount = 50,
  int entryFeeMax = 0,
  List<String> suitableFor = const [],
  List<int> bestMonths = const [],
  String region = 'danang',
}) => Place(
  id: id,
  name: name,
  nameEn: name,
  category: category,
  region: region,
  lat: 16.047,
  lng: 108.206,
  address: 'Test Address',
  tags: tags,
  ratingAvg: ratingAvg,
  ratingCount: ratingCount,
  entryFeeMax: entryFeeMax,
  suitableFor: suitableFor,
  bestMonths: bestMonths,
);

void main() {
  group('PlaceRecommender', () {
    // ────────────────────────────────────────────────
    test('User thích biển — beach places xếp hạng cao hơn museum', () {
      final beach = _makePlace(
        id: 'beach1',
        name: 'Mỹ Khê',
        category: 'beach',
        tags: ['beach'],
        ratingAvg: 4.5,
        ratingCount: 80,
      );
      final museum = _makePlace(
        id: 'museum1',
        name: 'Bảo tàng',
        category: 'museum',
        tags: ['museum', 'culture'],
        ratingAvg: 4.5,
        ratingCount: 80,
      );

      final input = RecommendInput(
        travelStyle: ['beach'],
        budgetPerPerson: 500000,
      );
      final result = PlaceRecommender.recommend(
        candidates: [museum, beach],
        input: input,
      );

      expect(result.length, 2);
      expect(
        result.first.place.id,
        'beach1',
        reason: 'Beach place phải đứng trên museum khi user thích biển',
      );
    });

    // ────────────────────────────────────────────────
    test('Budget 200k — place giá 300k nhận budgetScore = 0.5', () {
      final expensivePlace = _makePlace(
        id: 'p_expensive',
        entryFeeMax: 300000, // 300k > 200k budget nhưng ≤ 300k (150%)
      );

      final input = RecommendInput(travelStyle: [], budgetPerPerson: 200000);
      final result = PlaceRecommender.recommend(
        candidates: [expensivePlace],
        input: input,
      );

      expect(result.length, 1);
      expect(
        result.first.breakdown.budgetScore,
        0.5,
        reason: 'Giá 300k vượt 200k budget nhưng ≤ 150%, budgetScore = 0.5',
      );
    });

    // ────────────────────────────────────────────────
    test('Visited places không xuất hiện trong kết quả', () {
      final visited = _makePlace(id: 'visited1');
      final unvisited = _makePlace(id: 'new1');

      final input = RecommendInput(
        travelStyle: [],
        budgetPerPerson: 500000,
        visitedPlaceIds: ['visited1'],
      );
      final result = PlaceRecommender.recommend(
        candidates: [visited, unvisited],
        input: input,
      );

      expect(
        result.any((r) => r.place.id == 'visited1'),
        false,
        reason: 'Visited place phải bị loại khỏi kết quả',
      );
      expect(result.length, 1);
    });

    // ────────────────────────────────────────────────
    test('Địa điểm đóng cửa tháng hiện tại không xuất hiện', () {
      final currentMonth = DateTime.now().month;
      // Tháng nào cũng trừ tháng hiện tại
      final closedThisMonth = _makePlace(
        id: 'closed1',
        bestMonths: List.generate(
          12,
          (i) => i + 1,
        ).where((m) => m != currentMonth).toList(),
      );
      final openAllYear = _makePlace(id: 'open1', bestMonths: []);

      final input = RecommendInput(travelStyle: [], budgetPerPerson: 500000);
      final result = PlaceRecommender.recommend(
        candidates: [closedThisMonth, openAllYear],
        input: input,
      );

      expect(
        result.any((r) => r.place.id == 'closed1'),
        false,
        reason: 'Địa điểm đóng cửa tháng hiện tại phải bị lọc',
      );
    });

    // ────────────────────────────────────────────────
    test('suitable_for: family place không gợi ý cho solo trip', () {
      final familyPlace = _makePlace(
        id: 'family1',
        suitableFor: ['family', 'couple'],
      );
      final soloPlace = _makePlace(
        id: 'solo1',
        suitableFor: ['solo', 'couple'],
      );

      final input = RecommendInput(
        travelStyle: [],
        budgetPerPerson: 500000,
        travelWith: 'solo',
      );
      final result = PlaceRecommender.recommend(
        candidates: [familyPlace, soloPlace],
        input: input,
      );

      expect(
        result.any((r) => r.place.id == 'family1'),
        false,
        reason: 'Family-only place không nên gợi ý cho solo traveler',
      );
      expect(result.any((r) => r.place.id == 'solo1'), true);
    });

    // ────────────────────────────────────────────────
    test('Place giá vượt 150% budget nhận budgetScore = 0.0', () {
      final veryExpensive = _makePlace(
        id: 'expensive',
        entryFeeMax: 400000, // 200% của 200k budget
      );

      final input = RecommendInput(travelStyle: [], budgetPerPerson: 200000);
      final result = PlaceRecommender.recommend(
        candidates: [veryExpensive],
        input: input,
      );

      expect(
        result.first.breakdown.budgetScore,
        0.0,
        reason: 'Giá 400k vượt 150% budget 200k → budgetScore = 0.0',
      );
    });

    // ────────────────────────────────────────────────
    test('Score tổng được tính đúng công thức', () {
      final place = _makePlace(
        tags: ['beach'],
        ratingAvg: 5.0,
        ratingCount: 100,
        entryFeeMax: 0,
      );

      final input = RecommendInput(
        travelStyle: ['beach'],
        budgetPerPerson: 500000,
      );
      final result = PlaceRecommender.recommend(
        candidates: [place],
        input: input,
      );

      // styleMatch=1.0, ratingScore=1.0, budgetScore=1.0, popularityScore=1.0
      // score = 1×40 + 1×25 + 1×20 + 1×15 = 100.0
      expect(result.first.score, closeTo(100.0, 0.01));
    });

    // ────────────────────────────────────────────────
    test('Danh sách trống → không crash', () {
      final input = RecommendInput(
        travelStyle: ['beach'],
        budgetPerPerson: 500000,
      );
      final result = PlaceRecommender.recommend(candidates: [], input: input);
      expect(result, isEmpty);
    });

    // ────────────────────────────────────────────────
    test('topK giới hạn kết quả đúng số lượng', () {
      final places = List.generate(
        20,
        (i) => _makePlace(id: 'p$i', ratingAvg: 4.0 + i * 0.01),
      );

      final input = RecommendInput(travelStyle: [], budgetPerPerson: 500000);
      final result = PlaceRecommender.recommend(
        candidates: places,
        input: input,
        topK: 5,
      );
      expect(result.length, 5);
    });
  });
}

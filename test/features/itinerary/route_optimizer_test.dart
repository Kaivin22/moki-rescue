import 'package:flutter_test/flutter_test.dart';
import 'package:danang_itinerary/features/itinerary/domain/services/route_optimizer.dart';

void main() {
  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  RouteWaypoint makeWp({
    required String id,
    required double lat,
    required double lng,
    int durationMin = 60,
  }) =>
      RouteWaypoint(
        id: id,
        name: 'Place $id',
        lat: lat,
        lng: lng,
        durationMin: durationMin,
      );

  group('RouteOptimizer', () {
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    test('Danh sÃ¡ch rá»—ng â†’ tráº£ vá» rá»—ng', () {
      final result = RouteOptimizer.optimize(waypoints: []);
      expect(result, isEmpty);
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    test('1 waypoint â†’ travelTime = 0, startTime = 08:00', () {
      final result = RouteOptimizer.optimize(
        waypoints: [makeWp(id: 'p1', lat: 16.0, lng: 108.0)],
        startTimeHHmm: '08:00',
      );
      expect(result.length, 1);
      expect(result.first.travelTimeFromPrev, 0);
      expect(result.first.startTime, '08:00');
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    test('Nearest Neighbor: sáº¯p xáº¿p theo khoáº£ng cÃ¡ch gáº§n nháº¥t', () {
      // A(0,0) â†’ B(0,0.1) â†’ C(0,5.0)
      // Thá»© tá»± tá»‘i Æ°u: A â†’ B â†’ C (khÃ´ng pháº£i A â†’ C â†’ B)
      final a = makeWp(id: 'A', lat: 16.0, lng: 108.0);
      final c = makeWp(id: 'C', lat: 16.0, lng: 113.0); // ráº¥t xa
      final b = makeWp(id: 'B', lat: 16.0, lng: 108.1); // gáº§n A

      // Äáº·t A Ä‘áº§u tiÃªn Ä‘á»ƒ báº¯t Ä‘áº§u tá»« Ä‘Ã³
      final result = RouteOptimizer.optimize(
        waypoints: [a, c, b],
        startTimeHHmm: '08:00',
        breakMinutes: 0,
      );

      expect(result[0].waypoint.id, 'A');
      expect(result[1].waypoint.id, 'B',
          reason: 'B gáº§n A hÆ¡n C, pháº£i Ä‘Æ°á»£c chá»n trÆ°á»›c');
      expect(result[2].waypoint.id, 'C');
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    test('startTime tÃ­ch lÅ©y Ä‘Ãºng: durationMin + travelTime + break', () {
      // A táº¡i (16.0, 108.0) vÃ  B táº¡i (16.0, 108.01) (ráº¥t gáº§n, ~1km)
      final a = makeWp(id: 'A', lat: 16.0, lng: 108.0, durationMin: 60);
      final b = makeWp(id: 'B', lat: 16.0, lng: 108.01, durationMin: 90);

      final result = RouteOptimizer.optimize(
        waypoints: [a, b],
        startTimeHHmm: '08:00',
        breakMinutes: 15,
      );

      expect(result[0].startTime, '08:00');

      // startTime[B] = 08:00 + 60 (A duration) + travelTime + 15 (break)
      final travelB = result[1].travelTimeFromPrev;
      final expectedStartMin = 8 * 60 + 60 + travelB + 15;
      final expectedH = expectedStartMin ~/ 60;
      final expectedM = expectedStartMin % 60;
      final expectedStr =
          '${expectedH.toString().padLeft(2, '0')}:${expectedM.toString().padLeft(2, '0')}';

      expect(result[1].startTime, expectedStr);
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    test('Transport mode: walking náº¿u â‰¤1km, driving náº¿u >1km', () {
      // Hai Ä‘iá»ƒm cÃ¡ch nhau ~0.5km (walking)
      final near1 = makeWp(id: 'near1', lat: 16.0, lng: 108.0);
      final near2 = makeWp(id: 'near2', lat: 16.005, lng: 108.0);

      // Hai Ä‘iá»ƒm cÃ¡ch nhau ~5km (driving)
      final far1 = makeWp(id: 'far1', lat: 16.0, lng: 108.0);
      final far2 = makeWp(id: 'far2', lat: 16.05, lng: 108.0);

      final nearResult = RouteOptimizer.optimize(
        waypoints: [near1, near2],
        breakMinutes: 0,
      );
      final farResult = RouteOptimizer.optimize(
        waypoints: [far1, far2],
        breakMinutes: 0,
      );

      expect(nearResult[1].transportMode, 'walking',
          reason: '~0.5km pháº£i lÃ  walking');
      expect(farResult[1].transportMode, 'driving',
          reason: '~5km pháº£i lÃ  driving');
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    test('routeStats: tá»•ng km vÃ  tá»•ng phÃºt tÃ­nh Ä‘Ãºng', () {
      final a = makeWp(id: 'A', lat: 16.0, lng: 108.0, durationMin: 60);
      final b = makeWp(id: 'B', lat: 16.01, lng: 108.0, durationMin: 90);

      final result = RouteOptimizer.optimize(
        waypoints: [a, b],
        breakMinutes: 0,
      );
      final stats = RouteOptimizer.routeStats(result);

      expect(stats.totalKm, greaterThan(0));
      expect(stats.totalMin, greaterThan(150),
          reason: '60 + 90 + travel â‰¥ 150');
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    test('orderIndex Ä‘Ãºng tá»« 0 tá»›i n-1', () {
      final wps = List.generate(
        5,
        (i) => makeWp(id: 'p$i', lat: 16.0 + i * 0.01, lng: 108.0),
      );
      final result = RouteOptimizer.optimize(waypoints: wps);
      for (int i = 0; i < result.length; i++) {
        expect(result[i].orderIndex, i);
      }
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    test('Giá» báº¯t Ä‘áº§u tÃ¹y chá»‰nh: 09:30', () {
      final result = RouteOptimizer.optimize(
        waypoints: [makeWp(id: 'A', lat: 16.0, lng: 108.0)],
        startTimeHHmm: '09:30',
      );
      expect(result.first.startTime, '09:30');
    });
  });
}

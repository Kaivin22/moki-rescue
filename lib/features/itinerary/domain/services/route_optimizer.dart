library;

// RouteOptimizer — tối ưu hóa lộ trình dùng Nearest Neighbor heuristic
// O(n²) — phù hợp với n ≤ 20 địa điểm/ngày (thực tế 5-10)
//
// Thuật toán: Nearest Neighbor TSP
//   1. Bắt đầu từ điểm đầu tiên
//   2. Liên tục chọn điểm gần nhất chưa ghé
//   3. Tính thời gian di chuyển Haversine giữa các điểm

import '../../../../core/utils/geo_utils.dart';

/// Đầu vào cho route optimizer
class RouteWaypoint {
  const RouteWaypoint({
    required this.id,
    required this.name,
    required this.lat,
    required this.lng,
    required this.durationMin,
    this.openTime,
    this.closeTime,
  });

  final String id;
  final String name;
  final double lat;
  final double lng;

  /// Thời gian tham quan (phút)
  final int durationMin;

  /// Giờ mở cửa "HH:mm" (optional)
  final String? openTime;

  /// Giờ đóng cửa "HH:mm" (optional)
  final String? closeTime;
}

/// Kết quả 1 điểm trong lộ trình tối ưu
class OptimizedWaypoint {
  const OptimizedWaypoint({
    required this.waypoint,
    required this.orderIndex,
    required this.startTime,
    required this.travelTimeFromPrev,
    required this.distanceFromPrevKm,
    required this.transportMode,
  });

  final RouteWaypoint waypoint;
  final int orderIndex;

  /// Giờ bắt đầu "HH:mm"
  final String startTime;

  /// Thời gian di chuyển từ điểm trước (phút)
  final int travelTimeFromPrev;

  /// Khoảng cách từ điểm trước (km)
  final double distanceFromPrevKm;

  /// 'walking' | 'driving'
  final String transportMode;

  String get endTime {
    final parts = startTime.split(':');
    final startMin = int.parse(parts[0]) * 60 + int.parse(parts[1]);
    final endMin = startMin + waypoint.durationMin;
    return '${(endMin ~/ 60).toString().padLeft(2, '0')}:${(endMin % 60).toString().padLeft(2, '0')}';
  }
}

/// ═══════════════════════════════════════════════════════
/// RouteOptimizer — Nearest Neighbor TSP Heuristic
///
/// Độ phức tạp: O(n²) — phù hợp với ≤20 điểm/ngày
///
/// Logic:
///   1. Bắt đầu từ waypoint đầu tiên (không di chuyển)
///   2. Chọn waypoint gần nhất chưa ghé
///   3. Tính travel time + transport mode
///   4. Tính giờ bắt đầu tham quan (startTime)
///   5. Lặp lại đến khi hết waypoints
/// ═══════════════════════════════════════════════════════
abstract final class RouteOptimizer {
  /// Tối ưu thứ tự và tính toán thời gian cho danh sách waypoints
  ///
  /// [waypoints]       — danh sách địa điểm cần sắp xếp
  /// [startTimeHHmm]   — giờ khởi hành (mặc định "08:00")
  /// [breakMinutes]    — thời gian nghỉ/ăn giữa các điểm (mặc định 15 phút)
  static List<OptimizedWaypoint> optimize({
    required List<RouteWaypoint> waypoints,
    String startTimeHHmm = '08:00',
    int breakMinutes = 15,
  }) {
    if (waypoints.isEmpty) return [];
    if (waypoints.length == 1) {
      return [
        OptimizedWaypoint(
          waypoint: waypoints.first,
          orderIndex: 0,
          startTime: startTimeHHmm,
          travelTimeFromPrev: 0,
          distanceFromPrevKm: 0,
          transportMode: 'walking',
        ),
      ];
    }

    // ── Nearest Neighbor ────────────────────────────────
    final remaining = [...waypoints];
    final ordered = <RouteWaypoint>[];

    // Bắt đầu từ waypoint đầu tiên
    ordered.add(remaining.removeAt(0));

    while (remaining.isNotEmpty) {
      final last = ordered.last;
      double minDist = double.infinity;
      int nearestIdx = 0;

      for (int i = 0; i < remaining.length; i++) {
        final dist = GeoUtils.haversine(
          lat1: last.lat,
          lng1: last.lng,
          lat2: remaining[i].lat,
          lng2: remaining[i].lng,
        );
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }

      ordered.add(remaining.removeAt(nearestIdx));
    }

    // ── Tính thời gian ──────────────────────────────────
    final result = <OptimizedWaypoint>[];
    int currentMinutes = _parseTime(startTimeHHmm);

    for (int i = 0; i < ordered.length; i++) {
      final wp = ordered[i];
      int travelMin = 0;
      double distKm = 0;
      String mode = 'walking';

      if (i > 0) {
        final prev = ordered[i - 1];
        distKm = GeoUtils.haversine(
          lat1: prev.lat,
          lng1: prev.lng,
          lat2: wp.lat,
          lng2: wp.lng,
        );
        mode = distKm <= 1.0 ? 'walking' : 'driving';
        final geoTransport = distKm <= 1.0 ? 'walk' : 'motorbike';
        travelMin = GeoUtils.estimateTravelMinutes(
          distanceKm: distKm,
          transport: geoTransport,
        );

        // Cộng travel time + break
        currentMinutes += travelMin + breakMinutes;
      }

      result.add(OptimizedWaypoint(
        waypoint: wp,
        orderIndex: i,
        startTime: _formatTime(currentMinutes),
        travelTimeFromPrev: travelMin,
        distanceFromPrevKm: distKm,
        transportMode: mode,
      ));

      // Cộng thời gian tham quan
      currentMinutes += wp.durationMin;
    }

    return result;
  }

  /// Tính tổng quãng đường (km) và thời gian (phút) của route
  static ({double totalKm, int totalMin}) routeStats(
      List<OptimizedWaypoint> route) {
    final totalKm =
        route.fold(0.0, (sum, wp) => sum + wp.distanceFromPrevKm);
    final totalMin = route.fold(
        0,
        (sum, wp) =>
            sum + wp.waypoint.durationMin + wp.travelTimeFromPrev);
    return (totalKm: totalKm, totalMin: totalMin);
  }

  // ── Helpers ──────────────────────────────────────────
  static int _parseTime(String hhmm) {
    final parts = hhmm.split(':');
    return int.parse(parts[0]) * 60 + int.parse(parts[1]);
  }

  static String _formatTime(int totalMinutes) {
    // Clamp đến 23:59 nếu vượt ngày
    final clamped = totalMinutes.clamp(0, 23 * 60 + 59);
    final h = clamped ~/ 60;
    final m = clamped % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
  }
}

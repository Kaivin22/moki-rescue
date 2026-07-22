import 'dart:math';

/// ═══════════════════════════════════════════════════════
/// GeoUtils — tính toán khoảng cách địa lý
///
/// Dùng trong RouteOptimizer như fallback khi không có
/// dữ liệu tính trước trong bảng distances.
/// ═══════════════════════════════════════════════════════

abstract final class GeoUtils {
  static const double _earthRadiusKm = 6371.0;

  /// Tính khoảng cách Haversine giữa 2 điểm GPS (đơn vị km)
  ///
  /// Độ chính xác: sai số < 0.5% so với đường thực tế.
  /// Thích hợp làm fallback khi không có distance trong DB.
  static double haversine({
    required double lat1,
    required double lng1,
    required double lat2,
    required double lng2,
  }) {
    final dLat = _toRad(lat2 - lat1);
    final dLng = _toRad(lng2 - lng1);
    final sinDLat = sin(dLat / 2);
    final sinDLng = sin(dLng / 2);

    final a =
        sinDLat * sinDLat +
        cos(_toRad(lat1)) * cos(_toRad(lat2)) * sinDLng * sinDLng;
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));

    return _earthRadiusKm * c;
  }

  /// Ước tính thời gian di chuyển (phút) dựa trên khoảng cách và phương tiện.
  ///
  /// Tốc độ trung bình Đà Nẵng (có kẹt xe, đèn đường):
  ///   xe máy  : 25 km/h
  ///   ô tô    : 20 km/h (kẹt xe nhiều hơn)
  ///   đi bộ   : 4 km/h
  ///   xe đạp  : 12 km/h
  static int estimateTravelMinutes({
    required double distanceKm,
    required String transport, // 'motorbike' | 'car' | 'walk' | 'bicycle'
  }) {
    const speeds = {
      'motorbike': 25.0,
      'car': 20.0,
      'walk': 4.0,
      'bicycle': 12.0,
    };
    final speed = speeds[transport] ?? 25.0;
    // Thêm 5 phút buffer cho dừng đèn / tìm chỗ đậu
    return (distanceKm / speed * 60).ceil() + 5;
  }

  /// Tìm centroid (tâm địa lý) của tập hợp toạ độ
  static ({double lat, double lng}) centroid(
    List<({double lat, double lng})> points,
  ) {
    if (points.isEmpty) return (lat: 16.047, lng: 108.206); // Trung tâm Đà Nẵng
    final avgLat =
        points.map((p) => p.lat).reduce((a, b) => a + b) / points.length;
    final avgLng =
        points.map((p) => p.lng).reduce((a, b) => a + b) / points.length;
    return (lat: avgLat, lng: avgLng);
  }

  static double _toRad(double deg) => deg * pi / 180;
}

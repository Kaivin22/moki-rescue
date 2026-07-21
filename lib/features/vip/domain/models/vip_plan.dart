// VIP Plan domain model
class VipPlan {
  const VipPlan({
    required this.id,
    required this.name,
    required this.price,
    required this.durationDays,
    required this.features,
  });

  final String id;
  final String name;
  final int price; // VND
  final int durationDays;
  final List<String> features;

  String get priceFormatted {
    if (price >= 1000000) {
      return '${(price / 1000000).toStringAsFixed(price % 1000000 == 0 ? 0 : 1)}tr đ';
    }
    return '${price ~/ 1000}k đ';
  }

  String get durationLabel {
    if (durationDays == 30) return '1 tháng';
    if (durationDays == 90) return '3 tháng';
    if (durationDays == 365) return '1 năm';
    return '$durationDays ngày';
  }

  // Các gói VIP chuẩn
  static const monthly = VipPlan(
    id: 'vip_monthly',
    name: 'VIP Tháng',
    price: 49000,
    durationDays: 30,
    features: [
      'AI chat không giới hạn',
      'Xuất PDF lịch trình',
      'Không quảng cáo',
      'Ưu tiên hỗ trợ',
    ],
  );

  static const quarterly = VipPlan(
    id: 'vip_quarterly',
    name: 'VIP Quý',
    price: 119000,
    durationDays: 90,
    features: [
      'AI chat không giới hạn',
      'Xuất PDF lịch trình',
      'Không quảng cáo',
      'Ưu tiên hỗ trợ',
      'Tiết kiệm 19% so với tháng',
    ],
  );

  static const yearly = VipPlan(
    id: 'vip_yearly',
    name: 'VIP Năm',
    price: 399000,
    durationDays: 365,
    features: [
      'AI chat không giới hạn',
      'Xuất PDF lịch trình',
      'Không quảng cáo',
      'Ưu tiên hỗ trợ',
      'Tiết kiệm 32% so với tháng',
      'Badge VIP đặc biệt',
    ],
  );

  static const plans = [monthly, quarterly, yearly];
}

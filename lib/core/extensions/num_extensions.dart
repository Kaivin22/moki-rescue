library;

// int / double / num extensions cho dự án DaNang Itinerary



extension IntX on int {
  /// Format VND: "150.000 ₫" hoặc "1.200.000 ₫"
  String get vnd {
    if (this == 0) return 'Miễn phí';
    final s = abs().toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
      buf.write(s[i]);
    }
    return '${this < 0 ? '-' : ''}${buf.toString()} ₫';
  }

  /// Format phút thành "2 giờ 30 phút" hoặc "45 phút"
  String get toHourMin {
    if (this < 60) return '$this phút';
    final h = this ~/ 60;
    final m = this % 60;
    return m == 0 ? '$h giờ' : '$h giờ $m phút';
  }

  /// Kiểm tra số nằm trong khoảng [min, max]
  bool between(int min, int max) => this >= min && this <= max;
}

extension DoubleX on double {
  /// Làm tròn đến [decimals] chữ số thập phân
  double roundTo(int decimals) {
    final factor = pow(10, decimals);
    return (this * factor).round() / factor;
  }

  /// Format điểm rating: "4.5" hoặc "5.0"
  String get ratingStr => toStringAsFixed(1);

  /// Chuyển km ra chuỗi: "1.2 km" hoặc "850 m"
  String get distanceStr {
    if (this >= 1.0) return '${toStringAsFixed(1)} km';
    return '${(this * 1000).round()} m';
  }
}

double pow(int base, int exp) {
  double result = 1;
  for (var i = 0; i < exp; i++) {
    result *= base;
  }
  return result;
}

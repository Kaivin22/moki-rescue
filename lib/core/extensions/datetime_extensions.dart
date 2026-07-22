library;

// DateTime extensions cho dự án DaNang Itinerary

extension DateTimeX on DateTime {
  /// Format hiển thị ngắn: "07/07/2025"
  String get ddMMyyyy =>
      '${day.toString().padLeft(2, '0')}/${month.toString().padLeft(2, '0')}/$year';

  /// Format hiển thị dài: "Thứ Hai, 07 tháng 7 năm 2025"
  String get fullVietnamese {
    const weekdays = [
      '',
      'Thứ Hai',
      'Thứ Ba',
      'Thứ Tư',
      'Thứ Năm',
      'Thứ Sáu',
      'Thứ Bảy',
      'Chủ Nhật',
    ];
    return '${weekdays[weekday]}, $day tháng $month năm $year';
  }

  /// Format ngắn cho card: "7 tháng 7"
  String get shortMonthDay => '$day tháng $month';

  /// Format giờ: "08:30"
  String get hhmm =>
      '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';

  /// Kiểm tra có phải hôm nay không
  bool get isToday {
    final now = DateTime.now();
    return year == now.year && month == now.month && day == now.day;
  }

  /// Kiểm tra có phải hôm qua không
  bool get isYesterday {
    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    return year == yesterday.year &&
        month == yesterday.month &&
        day == yesterday.day;
  }

  /// Thời gian tương đối: "2 giờ trước", "3 ngày trước"...
  String get timeAgo {
    final diff = DateTime.now().difference(this);
    if (diff.inSeconds < 60) return 'Vừa xong';
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours < 24) return '${diff.inHours} giờ trước';
    if (diff.inDays == 1) return 'Hôm qua';
    if (diff.inDays < 30) return '${diff.inDays} ngày trước';
    if (diff.inDays < 365) return '${(diff.inDays / 30).floor()} tháng trước';
    return '${(diff.inDays / 365).floor()} năm trước';
  }

  /// Lấy ngày đầu tuần (thứ Hai)
  DateTime get startOfWeek => subtract(Duration(days: weekday - 1));

  /// Lấy ngày cuối tuần (Chủ Nhật)
  DateTime get endOfWeek => add(Duration(days: 7 - weekday));

  /// Lấy ngày đầu tháng
  DateTime get startOfMonth => DateTime(year, month, 1);

  /// Lấy ngày cuối tháng
  DateTime get endOfMonth => DateTime(year, month + 1, 0);

  /// Chuyển về đầu ngày (00:00:00)
  DateTime get startOfDay => DateTime(year, month, day);
}

/// ═══════════════════════════════════════════════════════
/// Nullable DateTime Extensions
/// ═══════════════════════════════════════════════════════

extension NullableDateTimeX on DateTime? {
  /// Trả về chuỗi nếu có giá trị, rỗng nếu null
  String get ddMMyyyyOrEmpty => this == null ? '' : this!.ddMMyyyy;
}

library;

// String extensions cho dự án DaNang Itinerary


extension StringX on String {
  /// Viết hoa chữ cái đầu mỗi từ (title case)
  String toTitleCase() => split(' ')
      .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}')
      .join(' ');

  /// Rút gọn chuỗi nếu vượt [maxLength], thêm '...' cuối
  String truncate(int maxLength) =>
      length > maxLength ? '${substring(0, maxLength)}...' : this;

  /// Kiểm tra chuỗi có phải email hợp lệ không
  bool get isValidEmail =>
      RegExp(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')
          .hasMatch(this);

  /// Kiểm tra mật khẩu hợp lệ (ít nhất 6 ký tự)
  bool get isValidPassword => length >= 6;

  /// Loại bỏ khoảng trắng thừa đầu/cuối và giữa các từ
  String get trimAll => trim().replaceAll(RegExp(r'\s+'), ' ');

  /// Xóa dấu tiếng Việt (đơn giản, không dùng unaccent SQL)
  String get removeDiacritics {
    const map = {
      'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
      'ă': 'a', 'ắ': 'a', 'ặ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a',
      'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
      'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
      'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
      'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
      'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
      'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
      'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
      'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
      'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
      'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
      'đ': 'd',
      'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
      'Đ': 'D',
    };
    return splitMapJoin('', onNonMatch: (s) => map[s] ?? s);
  }

  /// Format số điện thoại Việt Nam: 0xxx-xxx-xxx
  String get formatPhone {
    final digits = replaceAll(RegExp(r'\D'), '');
    if (digits.length == 10) {
      return '${digits.substring(0, 4)}-${digits.substring(4, 7)}-${digits.substring(7)}';
    }
    return this;
  }
}

/// ═══════════════════════════════════════════════════════
/// Nullable String Extensions
/// ═══════════════════════════════════════════════════════

extension NullableStringX on String? {
  /// Trả về chuỗi rỗng nếu null
  String get orEmpty => this ?? '';

  /// Kiểm tra null hoặc rỗng
  bool get isNullOrEmpty => this == null || this!.isEmpty;

  /// Kiểm tra có giá trị và không rỗng
  bool get hasValue => !isNullOrEmpty;
}

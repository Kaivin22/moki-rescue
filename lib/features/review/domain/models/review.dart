library;

// Review — domain model cho đánh giá địa điểm

/// Đánh giá của user cho một địa điểm
class Review {
  const Review({
    required this.id,
    required this.userId,
    required this.placeId,
    required this.rating,
    this.title,
    this.content,
    this.imageUrls = const [],
    this.visitDate,
    this.helpfulCount = 0,
    this.isHelpful = false,
    required this.createdAt,
    this.authorName,
    this.authorAvatarUrl,
  });

  final String id;
  final String userId;
  final String placeId;

  /// 1–5 sao
  final int rating;
  final String? title;
  final String? content;
  final List<String> imageUrls;
  final DateTime? visitDate;
  final int helpfulCount;

  /// User hiện tại đã vote helpful chưa
  final bool isHelpful;
  final DateTime createdAt;

  /// Denormalized author info
  final String? authorName;
  final String? authorAvatarUrl;

  // ── Derived ─────────────────────────────────────────
  bool get hasImages => imageUrls.isNotEmpty;
  String get ratingEmoji => switch (rating) {
        5 => '🤩',
        4 => '😊',
        3 => '😐',
        2 => '😕',
        _ => '😞',
      };

  factory Review.fromJson(Map<String, dynamic> json) {
    final authorData = json['author'] as Map<String, dynamic>?;
    return Review(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      placeId: json['place_id'] as String,
      rating: json['rating'] as int,
      title: json['title'] as String?,
      content: json['content'] as String?,
      imageUrls: (json['image_urls'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      visitDate: json['visit_date'] != null
          ? DateTime.tryParse(json['visit_date'] as String)
          : null,
      helpfulCount: json['helpful_count'] as int? ?? 0,
      isHelpful: json['is_helpful'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
      authorName: authorData?['display_name'] as String? ??
          json['author_name'] as String?,
      authorAvatarUrl: authorData?['avatar_url'] as String? ??
          json['author_avatar_url'] as String?,
    );
  }

  Map<String, dynamic> toCreateJson() => {
        'user_id': userId,
        'place_id': placeId,
        'rating': rating,
        if (title != null) 'title': title,
        if (content != null) 'content': content,
        'image_urls': imageUrls,
        if (visitDate != null)
          'visit_date': visitDate!.toIso8601String().substring(0, 10),
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is Review && other.id == id);

  @override
  int get hashCode => id.hashCode;
}

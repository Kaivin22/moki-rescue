library;

// Itinerary — domain models cho lịch trình du lịch
// Itinerary → ItineraryDay[] → ItinerarySlot[]

/// Một ô thời gian trong ngày (địa điểm + giờ cụ thể)
class ItinerarySlot {
  const ItinerarySlot({
    required this.id,
    required this.placeId,
    required this.placeName,
    this.placeImageUrl,
    this.placeCategory,
    required this.orderIndex,
    required this.startTime,
    required this.durationMin,
    this.transportMode,
    this.travelTimeMin,
    this.note,
  });

  final String id;
  final String placeId;
  final String placeName;
  final String? placeImageUrl;
  final String? placeCategory;

  /// Thứ tự trong ngày (0-based)
  final int orderIndex;

  /// Giờ bắt đầu tham quan (TimeOfDay → lưu dưới dạng "HH:mm")
  final String startTime;

  /// Thời gian tham quan (phút)
  final int durationMin;

  /// 'walking' | 'driving' | 'transit' | null
  final String? transportMode;

  /// Thời gian di chuyển đến slot này từ slot trước (phút)
  final int? travelTimeMin;

  /// Ghi chú tùy chỉnh của user
  final String? note;

  // ── Derived ─────────────────────────────────────────
  String get endTime {
    final parts = startTime.split(':');
    final startMinutes =
        int.parse(parts[0]) * 60 + int.parse(parts[1]);
    final endMinutes = startMinutes + durationMin;
    final h = endMinutes ~/ 60;
    final m = endMinutes % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
  }

  factory ItinerarySlot.fromJson(Map<String, dynamic> json) => ItinerarySlot(
        id: json['id'] as String,
        placeId: json['place_id'] as String,
        placeName: json['place_name'] as String? ?? '',
        placeImageUrl: json['place_image_url'] as String?,
        placeCategory: json['place_category'] as String?,
        orderIndex: json['order_index'] as int? ?? 0,
        startTime: json['start_time'] as String? ?? '08:00',
        durationMin: json['duration_min'] as int? ?? 60,
        transportMode: json['transport_mode'] as String?,
        travelTimeMin: json['travel_time_min'] as int?,
        note: json['note'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'place_id': placeId,
        'place_name': placeName,
        if (placeImageUrl != null) 'place_image_url': placeImageUrl,
        if (placeCategory != null) 'place_category': placeCategory,
        'order_index': orderIndex,
        'start_time': startTime,
        'duration_min': durationMin,
        if (transportMode != null) 'transport_mode': transportMode,
        if (travelTimeMin != null) 'travel_time_min': travelTimeMin,
        if (note != null) 'note': note,
      };

  ItinerarySlot copyWith({
    String? startTime,
    int? durationMin,
    String? transportMode,
    int? travelTimeMin,
    String? note,
    int? orderIndex,
  }) =>
      ItinerarySlot(
        id: id,
        placeId: placeId,
        placeName: placeName,
        placeImageUrl: placeImageUrl,
        placeCategory: placeCategory,
        orderIndex: orderIndex ?? this.orderIndex,
        startTime: startTime ?? this.startTime,
        durationMin: durationMin ?? this.durationMin,
        transportMode: transportMode ?? this.transportMode,
        travelTimeMin: travelTimeMin ?? this.travelTimeMin,
        note: note ?? this.note,
      );
}

/// Một ngày trong lịch trình
class ItineraryDay {
  const ItineraryDay({
    required this.id,
    required this.dayIndex,
    required this.date,
    this.title,
    this.slots = const [],
  });

  final String id;

  /// 0-based index (ngày 1 = 0, ngày 2 = 1, ...)
  final int dayIndex;
  final DateTime date;

  /// Tiêu đề tùy chọn: "Ngày 1: Đà Nẵng"
  final String? title;

  final List<ItinerarySlot> slots;

  // ── Derived ─────────────────────────────────────────
  int get totalDurationMin =>
      slots.fold(0, (sum, s) => sum + s.durationMin);

  int get totalTravelMin =>
      slots.fold(0, (sum, s) => sum + (s.travelTimeMin ?? 0));

  String get dayLabel => 'Ngày ${dayIndex + 1}';

  factory ItineraryDay.fromJson(Map<String, dynamic> json) {
    final slotsList = (json['slots'] as List<dynamic>?)
        ?.map((e) => ItinerarySlot.fromJson(e as Map<String, dynamic>))
        .toList() ??
        [];
    slotsList.sort((a, b) => a.orderIndex.compareTo(b.orderIndex));

    return ItineraryDay(
      id: json['id'] as String,
      dayIndex: json['day_index'] as int? ?? 0,
      date: DateTime.parse(json['date'] as String),
      title: json['title'] as String?,
      slots: slotsList,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'day_index': dayIndex,
        'date': date.toIso8601String().substring(0, 10),
        if (title != null) 'title': title,
        'slots': slots.map((s) => s.toJson()).toList(),
      };

  ItineraryDay copyWith({
    String? title,
    List<ItinerarySlot>? slots,
  }) =>
      ItineraryDay(
        id: id,
        dayIndex: dayIndex,
        date: date,
        title: title ?? this.title,
        slots: slots ?? this.slots,
      );
}

/// Lịch trình du lịch chính
class Itinerary {
  const Itinerary({
    required this.id,
    required this.userId,
    required this.title,
    required this.startDate,
    required this.endDate,
    this.coverImageUrl,
    this.description,
    this.companion,
    this.budgetTier,
    required this.visibility,
    required this.days,
    this.likeCount = 0,
    this.cloneCount = 0,
    this.isLiked = false,
    required this.createdAt,
    required this.updatedAt,
    this.authorName,
    this.authorAvatarUrl,
  });

  final String id;
  final String userId;
  final String title;
  final DateTime startDate;
  final DateTime endDate;
  final String? coverImageUrl;
  final String? description;

  /// 'solo' | 'couple' | 'family' | 'group'
  final String? companion;

  /// 'budget' | 'mid' | 'luxury'
  final String? budgetTier;

  /// 'private' | 'friends' | 'public'
  final String visibility;

  final List<ItineraryDay> days;

  final int likeCount;
  final int cloneCount;
  final bool isLiked;
  final DateTime createdAt;
  final DateTime updatedAt;

  /// Thông tin tác giả (denormalized khi load từ community feed)
  final String? authorName;
  final String? authorAvatarUrl;

  // ── Derived ─────────────────────────────────────────
  int get numDays => endDate.difference(startDate).inDays + 1;

  int get totalPlaces =>
      days.fold(0, (sum, d) => sum + d.slots.length);

  bool get isPublic => visibility == 'public';

  String? get thumbnailUrl =>
      coverImageUrl ??
      days.expand((d) => d.slots).firstOrNull?.placeImageUrl;

  factory Itinerary.fromJson(Map<String, dynamic> json) {
    final daysList = (json['days'] as List<dynamic>?)
        ?.map((e) => ItineraryDay.fromJson(e as Map<String, dynamic>))
        .toList() ??
        [];
    daysList.sort((a, b) => a.dayIndex.compareTo(b.dayIndex));

    return Itinerary(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      title: json['title'] as String,
      startDate: DateTime.parse(json['start_date'] as String),
      endDate: DateTime.parse(json['end_date'] as String),
      coverImageUrl: json['cover_image_url'] as String?,
      description: json['description'] as String?,
      companion: json['companion'] as String?,
      budgetTier: json['budget_tier'] as String?,
      visibility: json['visibility'] as String? ?? 'private',
      days: daysList,
      likeCount: json['like_count'] as int? ?? 0,
      cloneCount: json['clone_count'] as int? ?? 0,
      isLiked: json['is_liked'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      authorName: json['author_name'] as String?,
      authorAvatarUrl: json['author_avatar_url'] as String?,
    );
  }

  Map<String, dynamic> toCreateJson() => {
        'user_id': userId,
        'title': title,
        'start_date': startDate.toIso8601String().substring(0, 10),
        'end_date': endDate.toIso8601String().substring(0, 10),
        if (coverImageUrl != null) 'cover_image_url': coverImageUrl,
        if (description != null) 'description': description,
        if (companion != null) 'companion': companion,
        if (budgetTier != null) 'budget_tier': budgetTier,
        'visibility': visibility,
      };

  Itinerary copyWith({
    String? title,
    String? coverImageUrl,
    String? description,
    String? visibility,
    String? companion,
    String? budgetTier,
    List<ItineraryDay>? days,
    int? likeCount,
    bool? isLiked,
  }) =>
      Itinerary(
        id: id,
        userId: userId,
        title: title ?? this.title,
        startDate: startDate,
        endDate: endDate,
        coverImageUrl: coverImageUrl ?? this.coverImageUrl,
        description: description ?? this.description,
        companion: companion ?? this.companion,
        budgetTier: budgetTier ?? this.budgetTier,
        visibility: visibility ?? this.visibility,
        days: days ?? this.days,
        likeCount: likeCount ?? this.likeCount,
        cloneCount: cloneCount,
        isLiked: isLiked ?? this.isLiked,
        createdAt: createdAt,
        updatedAt: DateTime.now(),
        authorName: authorName,
        authorAvatarUrl: authorAvatarUrl,
      );
}

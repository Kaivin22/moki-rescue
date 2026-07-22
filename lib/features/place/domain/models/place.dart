library;

// Place — domain model cho địa điểm du lịch
// Map 1:1 với bảng public.places trong Supabase

/// Model địa điểm du lịch
class Place {
  const Place({
    required this.id,
    required this.name,
    required this.nameEn,
    required this.category,
    required this.region,
    required this.lat,
    required this.lng,
    required this.address,
    this.addressEn,
    this.description,
    this.descriptionEn,
    this.imageUrls = const [],
    this.tags = const [],
    this.openingHours,
    this.entryFeeMin = 0,
    this.entryFeeMax = 0,
    this.durationMin = 60,
    this.ratingAvg = 0.0,
    this.ratingCount = 0,
    this.bestMonths = const [],
    this.suitableFor = const [],
    this.isActive = true,
    this.createdAt,
  });

  final String id;
  final String name;
  final String nameEn;

  /// 'beach' | 'mountain' | 'temple' | 'museum' | 'food' |
  /// 'market' | 'entertainment' | 'nature' | 'historical' |
  /// 'viewpoint' | 'park'
  final String category;

  /// 'danang' | 'hoian'
  final String region;

  final double lat;
  final double lng;
  final String address;
  final String? addressEn;
  final String? description;
  final String? descriptionEn;

  /// Danh sách URL ảnh (index 0 là ảnh đại diện)
  final List<String> imageUrls;

  /// Tags tìm kiếm & lọc
  final List<String> tags;

  /// Giờ mở cửa dạng JSON: {'mon': '08:00-22:00', 'tue': '08:00-22:00', ...}
  final Map<String, dynamic>? openingHours;

  /// Giá vé tối thiểu (VND, 0 = miễn phí)
  final int entryFeeMin;

  /// Giá vé tối đa (VND)
  final int entryFeeMax;

  /// Thời gian tham quan trung bình (phút)
  final int durationMin;

  final double ratingAvg;
  final int ratingCount;

  /// Tháng lý tưởng để tham quan: [1,2,3,...] (1-indexed)
  final List<int> bestMonths;

  /// Phù hợp với loại du lịch: ['solo','couple','family','friends']
  final List<String> suitableFor;

  final bool isActive;
  final DateTime? createdAt;

  // ── Derived getters ─────────────────────────────────────
  /// Ảnh đại diện
  String? get thumbnailUrl => imageUrls.isNotEmpty ? imageUrls.first : null;

  /// Địa điểm miễn phí
  bool get isFree => entryFeeMin == 0 && entryFeeMax == 0;

  /// Thuộc Đà Nẵng
  bool get isDaNang => region == 'danang';

  /// Thuộc Hội An
  bool get isHoiAn => region == 'hoian';

  /// Tháng hiện tại có phù hợp không
  bool get isInSeason =>
      bestMonths.isEmpty || bestMonths.contains(DateTime.now().month);

  // ── fromJson ────────────────────────────────────────────
  factory Place.fromJson(Map<String, dynamic> json) => Place(
    id: json['id'] as String,
    name: json['name'] as String,
    nameEn: json['name_en'] as String? ?? '',
    category: json['category'] as String? ?? 'viewpoint',
    region: json['region'] as String? ?? 'danang',
    lat: (json['lat'] as num).toDouble(),
    lng: (json['lng'] as num).toDouble(),
    address: json['address'] as String? ?? '',
    addressEn: json['address_en'] as String?,
    description: json['description'] as String?,
    descriptionEn: json['description_en'] as String?,
    imageUrls:
        (json['image_urls'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        [],
    tags:
        (json['tags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
        [],
    openingHours: json['opening_hours'] as Map<String, dynamic>?,
    entryFeeMin: json['entry_fee_min'] as int? ?? 0,
    entryFeeMax: json['entry_fee_max'] as int? ?? 0,
    durationMin: json['duration_min'] as int? ?? 60,
    ratingAvg: (json['rating_avg'] as num?)?.toDouble() ?? 0.0,
    ratingCount: json['rating_count'] as int? ?? 0,
    bestMonths:
        (json['best_months'] as List<dynamic>?)
            ?.map((e) => e as int)
            .toList() ??
        [],
    suitableFor:
        (json['suitable_for'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        [],
    isActive: json['is_active'] as bool? ?? true,
    createdAt: json['created_at'] != null
        ? DateTime.parse(json['created_at'] as String)
        : null,
  );

  @override
  String toString() => 'Place(id: $id, name: $name, category: $category)';

  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is Place && other.id == id);

  @override
  int get hashCode => id.hashCode;
}

/// Filter options khi lọc danh sách địa điểm
class PlaceFilter {
  const PlaceFilter({
    this.category,
    this.region,
    this.minRating,
    this.maxFee,
    this.tags = const [],
    this.suitableFor,
    this.onlyFree = false,
    this.onlyInSeason = false,
  });

  final String? category;
  final String? region;
  final double? minRating;
  final int? maxFee;
  final List<String> tags;
  final String? suitableFor;
  final bool onlyFree;
  final bool onlyInSeason;

  bool get isEmpty =>
      category == null &&
      region == null &&
      minRating == null &&
      maxFee == null &&
      tags.isEmpty &&
      suitableFor == null &&
      !onlyFree &&
      !onlyInSeason;

  PlaceFilter copyWith({
    String? category,
    String? region,
    double? minRating,
    int? maxFee,
    List<String>? tags,
    String? suitableFor,
    bool? onlyFree,
    bool? onlyInSeason,
  }) => PlaceFilter(
    category: category ?? this.category,
    region: region ?? this.region,
    minRating: minRating ?? this.minRating,
    maxFee: maxFee ?? this.maxFee,
    tags: tags ?? this.tags,
    suitableFor: suitableFor ?? this.suitableFor,
    onlyFree: onlyFree ?? this.onlyFree,
    onlyInSeason: onlyInSeason ?? this.onlyInSeason,
  );

  PlaceFilter clear() => const PlaceFilter();
}

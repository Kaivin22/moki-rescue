library;

// UserProfile — domain model cho thông tin người dùng

class UserProfile {
  const UserProfile({
    required this.id,
    required this.displayName,
    this.avatarUrl,
    this.bio,
    this.phoneNumber,
    required this.role,
    required this.vipStatus,
    this.vipGrantedUntil,
    this.travelStyle,
    this.travelWith,
    this.preferredRegions,
    required this.followersCount,
    required this.followingCount,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String displayName;
  final String? avatarUrl;
  final String? bio;
  final String? phoneNumber;

  /// 'user' | 'editor' | 'admin'
  final String role;

  /// 'free' | 'vip'
  final String vipStatus;
  final DateTime? vipGrantedUntil;

  /// Tags phong cách du lịch: ['beach', 'culture', 'food', ...]
  final List<String>? travelStyle;

  /// 'solo' | 'couple' | 'family' | 'friends' | 'business'
  final String? travelWith;

  /// ['danang', 'hoian', 'both']
  final List<String>? preferredRegions;

  final int followersCount;
  final int followingCount;
  final DateTime createdAt;
  final DateTime updatedAt;

  // ── Derived getters ─────────────────────────────────
  bool get isVip => vipStatus == 'vip';
  bool get isAdmin => role == 'admin';
  bool get isEditor => role == 'editor' || role == 'admin';
  bool get hasAvatar => avatarUrl != null && avatarUrl!.isNotEmpty;

  /// VIP còn hạn không
  bool get isVipActive =>
      isVip &&
      (vipGrantedUntil == null || vipGrantedUntil!.isAfter(DateTime.now()));

  // ── fromJson (từ Supabase response) ─────────────────
  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    id: json['id'] as String,
    displayName: json['display_name'] as String? ?? 'Du khách',
    avatarUrl: json['avatar_url'] as String?,
    bio: json['bio'] as String?,
    phoneNumber: json['phone_number'] as String?,
    role: json['role'] as String? ?? 'user',
    vipStatus: json['vip_status'] as String? ?? 'free',
    vipGrantedUntil: json['vip_granted_until'] != null
        ? DateTime.parse(json['vip_granted_until'] as String)
        : null,
    travelStyle: (json['travel_style'] as List<dynamic>?)
        ?.map((e) => e.toString())
        .toList(),
    travelWith: json['travel_with'] as String?,
    preferredRegions: (json['preferred_regions'] as List<dynamic>?)
        ?.map((e) => e.toString())
        .toList(),
    followersCount: json['followers_count'] as int? ?? 0,
    followingCount: json['following_count'] as int? ?? 0,
    createdAt: DateTime.parse(json['created_at'] as String),
    updatedAt: DateTime.parse(json['updated_at'] as String),
  );

  // ── toJson (khi UPDATE profile) ─────────────────────
  Map<String, dynamic> toUpdateJson() => {
    'display_name': displayName,
    if (avatarUrl != null) 'avatar_url': avatarUrl,
    if (bio != null) 'bio': bio,
    if (phoneNumber != null) 'phone_number': phoneNumber,
    if (travelStyle != null) 'travel_style': travelStyle,
    if (travelWith != null) 'travel_with': travelWith,
    if (preferredRegions != null) 'preferred_regions': preferredRegions,
    'updated_at': DateTime.now().toIso8601String(),
  };

  // ── copyWith ─────────────────────────────────────────
  UserProfile copyWith({
    String? displayName,
    String? avatarUrl,
    String? bio,
    String? phoneNumber,
    String? vipStatus,
    DateTime? vipGrantedUntil,
    List<String>? travelStyle,
    String? travelWith,
    List<String>? preferredRegions,
    int? followersCount,
    int? followingCount,
  }) => UserProfile(
    id: id,
    displayName: displayName ?? this.displayName,
    avatarUrl: avatarUrl ?? this.avatarUrl,
    bio: bio ?? this.bio,
    phoneNumber: phoneNumber ?? this.phoneNumber,
    role: role,
    vipStatus: vipStatus ?? this.vipStatus,
    vipGrantedUntil: vipGrantedUntil ?? this.vipGrantedUntil,
    travelStyle: travelStyle ?? this.travelStyle,
    travelWith: travelWith ?? this.travelWith,
    preferredRegions: preferredRegions ?? this.preferredRegions,
    followersCount: followersCount ?? this.followersCount,
    followingCount: followingCount ?? this.followingCount,
    createdAt: createdAt,
    updatedAt: DateTime.now(),
  );

  @override
  String toString() =>
      'UserProfile(id: $id, displayName: $displayName, role: $role, vip: $vipStatus)';
}

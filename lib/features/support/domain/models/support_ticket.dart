// SupportTicket domain model
class SupportTicket {
  const SupportTicket({
    required this.id,
    required this.userId,
    required this.title,
    required this.description,
    required this.category,
    required this.status,
    required this.createdAt,
    this.resolvedAt,
    this.adminReply,
  });

  final String id;
  final String userId;
  final String title;
  final String description;
  final String category; // bug | payment | account | feature | other
  final String status; // open | in_progress | resolved | closed
  final DateTime createdAt;
  final DateTime? resolvedAt;
  final String? adminReply;

  bool get isOpen => status == 'open' || status == 'in_progress';
  bool get isResolved => status == 'resolved' || status == 'closed';

  String get statusLabel {
    switch (status) {
      case 'open': return 'Chờ xử lý';
      case 'in_progress': return 'Đang xử lý';
      case 'resolved': return 'Đã giải quyết';
      case 'closed': return 'Đã đóng';
      default: return status;
    }
  }

  String get categoryLabel {
    switch (category) {
      case 'bug': return '🐛 Lỗi kỹ thuật';
      case 'payment': return '💳 Thanh toán';
      case 'account': return '👤 Tài khoản';
      case 'feature': return '💡 Góp ý tính năng';
      case 'other': return '📝 Khác';
      default: return category;
    }
  }

  factory SupportTicket.fromJson(Map<String, dynamic> json) => SupportTicket(
        id: json['id'] as String,
        userId: json['user_id'] as String,
        title: json['title'] as String,
        description: json['description'] as String,
        category: json['category'] as String? ?? 'other',
        status: json['status'] as String? ?? 'open',
        createdAt: DateTime.parse(json['created_at'] as String),
        resolvedAt: json['resolved_at'] != null
            ? DateTime.parse(json['resolved_at'] as String)
            : null,
        adminReply: json['admin_reply'] as String?,
      );

  Map<String, dynamic> toInsert() => {
        'user_id': userId,
        'title': title,
        'description': description,
        'category': category,
        'status': 'open',
      };
}

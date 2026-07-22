// ═══════════════════════════════════════════════════════
// AiTravelService — Rule-based AI travel assistant
// Không dùng API bên ngoài, dùng keyword matching + templates
// ═══════════════════════════════════════════════════════

class AiTravelService {
  const AiTravelService();

  /// Sinh response từ user prompt
  Future<String> generateResponse(String input) async {
    // Giả lập delay mạng/AI
    await Future.delayed(const Duration(milliseconds: 800));

    final lower = input.toLowerCase();

    // ── Beach ──
    if (_matchesAny(lower, ['bãi biển', 'beach', 'biển', 'tắm'])) {
      return 'Đà Nẵng có nhiều bãi biển tuyệt vời:\n\n'
          '🏖 **Mỹ Khê** — dài 9km, nước trong, phù hợp tắm biển\n'
          '🌊 **Non Nước** — yên tĩnh hơn, ít khách\n'
          '🌅 **Nam Ô** — hoang sơ, đẹp khi bình minh\n\n'
          'Thời gian tốt nhất: tháng 3–8. Bạn muốn biết thêm về bãi biển nào?';
    }

    // ── Food ──
    if (_matchesAny(lower, ['ăn', 'đặc sản', 'món', 'quán', 'ẩm thực'])) {
      return 'Đặc sản không thể bỏ qua ở Đà Nẵng:\n\n'
          '🍜 Mì Quảng — đặc trưng miền Trung\n'
          '🦐 Bánh tráng cuốn thịt heo\n'
          '🐟 Bún chả cá\n'
          '🦀 Hải sản tươi sống tại Phước Mỹ\n\n'
          'Bạn thích ăn sáng, trưa hay tối? Tôi có thể gợi ý quán cụ thể!';
    }

    // ── Itinerary planning ──
    if (_matchesAny(lower, ['lịch', 'ngày', 'plan', 'lên kế hoạch'])) {
      return '🗓 Đây là gợi ý lịch trình 3 ngày:\n\n'
          '**Ngày 1**: Bãi biển Mỹ Khê → Ngũ Hành Sơn → Ẩm thực tối\n'
          '**Ngày 2**: Bà Nà Hills + Cầu Vàng (cả ngày)\n'
          '**Ngày 3**: Phố cổ Hội An → Chùa Cầu → Đèn lồng\n\n'
          'Tôi có thể tạo lịch trình chi tiết này cho bạn. Bạn có muốn không?';
    }

    // ── Budget ──
    if (_matchesAny(lower, ['tiết kiệm', 'budget', 'ngân sách', 'rẻ'])) {
      return '💰 Tips tiết kiệm khi du lịch Đà Nẵng:\n\n'
          '• Ở hostel/homestay: 100–200k/đêm\n'
          '• Thuê xe máy: 80–120k/ngày\n'
          '• Ăn quán địa phương: 30–50k/bữa\n'
          '• Ngũ Hành Sơn: 40k/vé, bãi biển miễn phí\n\n'
          'Budget tối thiểu: ~500k/ngày/người. Bạn muốn tôi lên lịch trình tiết kiệm không?';
    }

    // ── Weather ──
    if (_matchesAny(lower, ['thời tiết', 'weather', 'mưa', 'nắng'])) {
      return '🌤 Thời tiết Đà Nẵng theo mùa:\n\n'
          '• **Tháng 3–8**: Mùa khô, nắng đẹp, 28–35°C\n'
          '• **Tháng 9–12**: Mùa mưa, có thể bão\n'
          '• **Tháng 1–2**: Mát mẻ, 20–25°C\n\n'
          'Thời điểm lý tưởng nhất: tháng 3–5 (ít mưa, chưa quá nóng).';
    }

    // ── Transport ──
    if (_matchesAny(lower, ['xe', 'di chuyển', 'grab', 'taxi', 'thuê'])) {
      return '🚗 Phương tiện di chuyển tại Đà Nẵng:\n\n'
          '• **Xe máy thuê**: 80–120k/ngày (phổ biến nhất)\n'
          '• **Grab/GoViet**: Tiện, giá rõ ràng\n'
          '• **Taxi**: Mai Linh, Tiên Sa\n'
          '• **Bus**: Tuyến sân bay – trung tâm 8k/lượt\n\n'
          'Tip: Thuê xe máy để linh hoạt hơn khi khám phá!';
    }

    // ── Hoi An ──
    if (_matchesAny(lower, ['hội an', 'phố cổ', 'đèn lồng'])) {
      return '🏮 Hội An — Phố cổ di sản:\n\n'
          '• Vé tham quan phố cổ: 120k/người\n'
          '• Đèn lồng rực rỡ nhất: 14 âm lịch\n'
          '• Phải thử: Cao lầu, Cơm gà, Bánh mì Phượng\n'
          '• Đi thuyền sông Thu Bồn: 50k/người\n\n'
          'Nên dành ít nhất 1.5–2 ngày cho Hội An!';
    }

    // ── Default ──
    return 'Cảm ơn bạn đã hỏi về "$input"! '
        'Đà Nẵng và Hội An có rất nhiều điều thú vị để khám phá. '
        'Tôi có thể giúp bạn với:\n\n'
        '🗺 Lên lịch trình\n'
        '🏖 Gợi ý địa điểm\n'
        '🍜 Thông tin ẩm thực\n'
        '💰 Tính ngân sách\n'
        '🌤 Thời tiết\n\n'
        'Bạn muốn tìm hiểu gì?';
  }

  bool _matchesAny(String text, List<String> keywords) {
    return keywords.any((k) => text.contains(k));
  }

  /// Tính ngân sách ước tính
  BudgetEstimate estimateBudget({
    required int numDays,
    required int numPeople,
    required String accommodation,
    required String transport,
    required String foodStyle,
    bool includeActivities = true,
  }) {
    const accommodationCosts = {
      'budget': 150000,
      'mid': 450000,
      'luxury': 1200000,
    };
    const transportCosts = {
      'walk': 0,
      'motorbike': 80000,
      'car': 300000,
      'taxi': 200000,
    };
    const foodCosts = {
      'street': 80000,
      'local': 150000,
      'mid': 300000,
      'upscale': 600000,
    };
    const activityCostPerDay = 200000;

    final accomTotal = (accommodationCosts[accommodation] ?? 0) * numDays;
    final transportTotal =
        (transportCosts[transport] ?? 0) * numDays * numPeople;
    final foodTotal = (foodCosts[foodStyle] ?? 0) * numDays * numPeople;
    final activityTotal = includeActivities
        ? activityCostPerDay * numDays * numPeople
        : 0;

    return BudgetEstimate(
      accommodation: accomTotal,
      transport: transportTotal,
      food: foodTotal,
      activities: activityTotal,
      total: accomTotal + transportTotal + foodTotal + activityTotal,
    );
  }
}

class BudgetEstimate {
  const BudgetEstimate({
    required this.accommodation,
    required this.transport,
    required this.food,
    required this.activities,
    required this.total,
  });

  final int accommodation;
  final int transport;
  final int food;
  final int activities;
  final int total;

  Map<String, int> get breakdown => {
    'Lưu trú': accommodation,
    'Di chuyển': transport,
    'Ăn uống': food,
    if (activities > 0) 'Tham quan': activities,
  };
}

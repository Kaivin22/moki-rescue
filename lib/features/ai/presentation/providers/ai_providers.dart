import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/services/ai_travel_service.dart';
import '../../domain/services/weather_service.dart';

/// ═══════════════════════════════════════════════════════
/// AI Providers — ChatNotifier + BudgetNotifier
/// ═══════════════════════════════════════════════════════

// ── Service singleton ──
final aiTravelServiceProvider = Provider<AiTravelService>((_) {
  return const AiTravelService();
});

// ── Chat state ──
class ChatMessage {
  const ChatMessage({required this.text, required this.isUser});
  final String text;
  final bool isUser;
}

class AiChatState {
  const AiChatState({this.messages = const [], this.isTyping = false});

  final List<ChatMessage> messages;
  final bool isTyping;

  AiChatState copyWith({List<ChatMessage>? messages, bool? isTyping}) =>
      AiChatState(
        messages: messages ?? this.messages,
        isTyping: isTyping ?? this.isTyping,
      );
}

class AiChatNotifier extends StateNotifier<AiChatState> {
  AiChatNotifier(this._service)
    : super(
        AiChatState(
          messages: [
            const ChatMessage(
              text:
                  'Xin chào! Tôi là trợ lý AI du lịch của bạn. '
                  'Tôi có thể giúp bạn lên lịch trình, gợi ý địa điểm '
                  'và ẩm thực cho Đà Nẵng và Hội An. '
                  'Bạn muốn khám phá gì hôm nay? 🌊',
              isUser: false,
            ),
          ],
        ),
      );

  final AiTravelService _service;

  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty) return;

    // Add user message
    state = state.copyWith(
      messages: [
        ...state.messages,
        ChatMessage(text: text.trim(), isUser: true),
      ],
      isTyping: true,
    );

    // Get AI response
    final response = await _service.generateResponse(text);

    state = state.copyWith(
      messages: [
        ...state.messages,
        ChatMessage(text: response, isUser: false),
      ],
      isTyping: false,
    );
  }

  void clearChat() {
    state = const AiChatState(
      messages: [
        ChatMessage(
          text: 'Đã xóa lịch sử. Bạn muốn hỏi gì tiếp? 🌊',
          isUser: false,
        ),
      ],
    );
  }
}

final aiChatProvider = StateNotifierProvider<AiChatNotifier, AiChatState>((
  ref,
) {
  final service = ref.watch(aiTravelServiceProvider);
  return AiChatNotifier(service);
});

// ── Budget state ──
class BudgetState {
  const BudgetState({
    this.numDays = 3,
    this.numPeople = 2,
    this.accommodation = 'budget',
    this.transport = 'motorbike',
    this.foodStyle = 'local',
    this.includeActivities = true,
    this.estimate,
  });

  final int numDays;
  final int numPeople;
  final String accommodation;
  final String transport;
  final String foodStyle;
  final bool includeActivities;
  final BudgetEstimate? estimate;

  BudgetState copyWith({
    int? numDays,
    int? numPeople,
    String? accommodation,
    String? transport,
    String? foodStyle,
    bool? includeActivities,
    BudgetEstimate? estimate,
  }) => BudgetState(
    numDays: numDays ?? this.numDays,
    numPeople: numPeople ?? this.numPeople,
    accommodation: accommodation ?? this.accommodation,
    transport: transport ?? this.transport,
    foodStyle: foodStyle ?? this.foodStyle,
    includeActivities: includeActivities ?? this.includeActivities,
    estimate: estimate ?? this.estimate,
  );
}

class BudgetNotifier extends StateNotifier<BudgetState> {
  BudgetNotifier(this._service) : super(const BudgetState()) {
    _recalculate();
  }

  final AiTravelService _service;

  void setDays(int days) {
    state = state.copyWith(numDays: days.clamp(1, 14));
    _recalculate();
  }

  void setPeople(int people) {
    state = state.copyWith(numPeople: people.clamp(1, 20));
    _recalculate();
  }

  void setAccommodation(String value) {
    state = state.copyWith(accommodation: value);
    _recalculate();
  }

  void setTransport(String value) {
    state = state.copyWith(transport: value);
    _recalculate();
  }

  void setFoodStyle(String value) {
    state = state.copyWith(foodStyle: value);
    _recalculate();
  }

  void setIncludeActivities(bool value) {
    state = state.copyWith(includeActivities: value);
    _recalculate();
  }

  void _recalculate() {
    final estimate = _service.estimateBudget(
      numDays: state.numDays,
      numPeople: state.numPeople,
      accommodation: state.accommodation,
      transport: state.transport,
      foodStyle: state.foodStyle,
      includeActivities: state.includeActivities,
    );
    state = state.copyWith(estimate: estimate);
  }
}

final budgetProvider = StateNotifierProvider<BudgetNotifier, BudgetState>((
  ref,
) {
  final service = ref.watch(aiTravelServiceProvider);
  return BudgetNotifier(service);
});

// ── Weather ──

final weatherServiceProvider = Provider<WeatherService>((_) {
  return const WeatherService();
});

final weatherProvider = FutureProvider.family<CityWeather, String>((
  ref,
  cityId,
) {
  final service = ref.watch(weatherServiceProvider);
  return service.getWeather(cityId);
});

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/models/vip_plan.dart';
import '../../../auth/presentation/providers/auth_notifier.dart';
import '../../../profile/presentation/providers/profile_providers.dart';

// ── VIP status ──
final isVipProvider = Provider<bool>((ref) {
  final profile = ref.watch(currentProfileProvider);
  return profile?.isVip ?? false;
});

// ── Selected plan for payment ──
final selectedPlanProvider = StateProvider<VipPlan?>((ref) => null);

// ── Payment state ──
enum PaymentStatus { idle, loading, success, failed }

class PaymentState {
  const PaymentState({
    this.status = PaymentStatus.idle,
    this.errorMessage,
    this.plan,
  });

  final PaymentStatus status;
  final String? errorMessage;
  final VipPlan? plan;

  bool get isLoading => status == PaymentStatus.loading;
  bool get isSuccess => status == PaymentStatus.success;
  bool get isFailed => status == PaymentStatus.failed;

  PaymentState copyWith({
    PaymentStatus? status,
    String? errorMessage,
    VipPlan? plan,
  }) => PaymentState(
    status: status ?? this.status,
    errorMessage: errorMessage ?? this.errorMessage,
    plan: plan ?? this.plan,
  );
}

class PaymentNotifier extends StateNotifier<PaymentState> {
  PaymentNotifier(this._ref) : super(const PaymentState());

  final Ref _ref;

  /// Giả lập thanh toán VNPay (thực tế: gọi VNPay SDK)
  Future<void> processPayment(VipPlan plan, String method) async {
    state = state.copyWith(status: PaymentStatus.loading, plan: plan);

    // Mock payment delay
    await Future.delayed(const Duration(seconds: 2));

    // Mock: luôn thành công trong demo
    // Thực tế: gọi VNPay SDK → nhận callback → update Supabase
    try {
      await _ref
          .read(editProfileProvider.notifier)
          .updateProfile(vipStatus: 'vip');
      state = state.copyWith(status: PaymentStatus.success);
    } catch (e) {
      state = state.copyWith(
        status: PaymentStatus.failed,
        errorMessage: e.toString(),
      );
    }
  }

  void reset() => state = const PaymentState();
}

final paymentProvider = StateNotifierProvider<PaymentNotifier, PaymentState>((
  ref,
) {
  return PaymentNotifier(ref);
});

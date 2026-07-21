import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../providers/vip_providers.dart';

/// SCREEN-PAYMENT: PaymentScreen — Chọn phương thức thanh toán
class PaymentScreen extends ConsumerStatefulWidget {
  const PaymentScreen({super.key});

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  String _selectedMethod = 'vnpay';

  static const _methods = [
    (id: 'vnpay', label: 'VNPay', icon: '🏦', desc: 'Ví điện tử & ATM nội địa'),
    (id: 'momo', label: 'MoMo', icon: '💜', desc: 'Ví MoMo'),
    (id: 'card', label: 'Thẻ quốc tế', icon: '💳', desc: 'Visa / Mastercard'),
  ];

  @override
  Widget build(BuildContext context) {
    final plan = ref.watch(selectedPlanProvider);
    final paymentState = ref.watch(paymentProvider);

    // Navigate khi thành công/thất bại
    ref.listen(paymentProvider, (_, next) {
      if (next.isSuccess) {
        context.go(AppRoutes.paymentSuccess);
      } else if (next.isFailed) {
        context.go(AppRoutes.paymentFailed);
      }
    });

    if (plan == null) {
      return const Scaffold(body: Center(child: Text('Không có gói nào được chọn')));
    }

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text('Thanh toán',
            style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700)),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.layoutMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Order summary ──
            Container(
              padding: const EdgeInsets.all(AppSpacing.layoutMd),
              decoration: BoxDecoration(
                color: AppColors.backgroundCard,
                borderRadius: AppRadius.cardBorder,
                border: Border.all(color: AppColors.borderDefault),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Đơn hàng',
                      style: AppTextStyles.h4
                          .copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: AppSpacing.space3),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('👑 ${plan.name}',
                          style: AppTextStyles.bodyMd),
                      Text(plan.priceFormatted,
                          style: AppTextStyles.bodyMd.copyWith(
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFFFFA500))),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Tổng cộng',
                          style: AppTextStyles.bodyMd.copyWith(
                              fontWeight: FontWeight.w700)),
                      Text(plan.priceFormatted,
                          style: AppTextStyles.h4.copyWith(
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFFFFA500))),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.layoutMd),

            // ── Payment method ──
            Text('Phương thức thanh toán',
                style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: AppSpacing.space3),

            ..._methods.map((m) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.space2),
                  child: GestureDetector(
                    onTap: () =>
                        setState(() => _selectedMethod = m.id),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.all(AppSpacing.space4),
                      decoration: BoxDecoration(
                        color: _selectedMethod == m.id
                            ? AppColors.actionPrimary.withValues(alpha: 0.05)
                            : AppColors.backgroundCard,
                        borderRadius: AppRadius.cardBorder,
                        border: Border.all(
                          color: _selectedMethod == m.id
                              ? AppColors.actionPrimary
                              : AppColors.borderDefault,
                          width: _selectedMethod == m.id ? 2 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Text(m.icon,
                              style: const TextStyle(fontSize: 24)),
                          const SizedBox(width: AppSpacing.space3),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(m.label,
                                    style: AppTextStyles.bodyMd.copyWith(
                                        fontWeight: FontWeight.w600)),
                                Text(m.desc,
                                    style: AppTextStyles.caption.copyWith(
                                        color: AppColors.textSecondary)),
                              ],
                            ),
                          ),
                          if (_selectedMethod == m.id)
                            Icon(Icons.check_circle_rounded,
                                color: AppColors.actionPrimary),
                        ],
                      ),
                    ),
                  ),
                )),

            const SizedBox(height: AppSpacing.layoutXl),

            AppButton(
              label: paymentState.isLoading
                  ? 'Đang xử lý...'
                  : 'Xác nhận thanh toán ${plan.priceFormatted}',
              onPressed: paymentState.isLoading
                  ? null
                  : () => ref
                      .read(paymentProvider.notifier)
                      .processPayment(plan, _selectedMethod),
            ),

            const SizedBox(height: AppSpacing.space3),
            Text(
              '🔒 Thanh toán an toàn. Thông tin của bạn được mã hóa SSL.',
              textAlign: TextAlign.center,
              style: AppTextStyles.caption
                  .copyWith(color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}

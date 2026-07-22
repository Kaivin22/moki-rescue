import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../../../../shared/widgets/atoms/app_button.dart';
import '../providers/itinerary_providers.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-24: CreateItineraryScreen — Step 1 of 3
/// Stepper header + form: name, dates, companion, budget, visibility
/// ═══════════════════════════════════════════════════════

class CreateItineraryScreen extends ConsumerStatefulWidget {
  const CreateItineraryScreen({super.key});

  @override
  ConsumerState<CreateItineraryScreen> createState() =>
      _CreateItineraryScreenState();
}

class _CreateItineraryScreenState extends ConsumerState<CreateItineraryScreen> {
  final _nameController = TextEditingController();
  DateTimeRange? _dateRange;
  String? _companion;
  String? _budget;
  String _visibility = 'private';

  static const _companions = [
    ('🧑', 'Một mình'),
    ('💑', 'Cặp đôi'),
    ('👨‍👩‍👧', 'Gia đình'),
    ('👥', 'Nhóm bạn'),
  ];

  static const _budgets = [
    ('💰', 'Tiết kiệm', '< 500k/ngày'),
    ('💳', 'Trung bình', '500k-2tr/ngày'),
    ('💎', 'Cao cấp', '> 2tr/ngày'),
  ];

  bool get _canProceed =>
      _nameController.text.trim().isNotEmpty && _dateRange != null;

  Future<void> _pickDateRange() async {
    final now = DateTime.now();
    final range = await showDateRangePicker(
      context: context,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      initialDateRange: _dateRange,
      locale: const Locale('vi'),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: ColorScheme.light(
            primary: AppColors.actionPrimary,
            onPrimary: AppColors.textOnPrimary,
          ),
        ),
        child: child!,
      ),
    );
    if (range != null) setState(() => _dateRange = range);
  }

  String get _dateRangeText {
    if (_dateRange == null) return 'Chọn ngày';
    final start = _dateRange!.start;
    final end = _dateRange!.end;
    final days = end.difference(start).inDays + 1;
    return '${start.day}/${start.month} → ${end.day}/${end.month}/${end.year} ($days ngày)';
  }

  Future<void> _onCreate() async {
    if (!_canProceed) return;
    await ref
        .read(createItineraryProvider.notifier)
        .create(
          title: _nameController.text.trim(),
          startDate: _dateRange!.start,
          endDate: _dateRange!.end,
          companion: _companion,
          budgetTier: _budget == 'Tiết kiệm'
              ? 'budget'
              : _budget == 'Cao cấp'
              ? 'luxury'
              : 'mid',
          visibility: _visibility,
        );
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<CreateItineraryState>(createItineraryProvider, (prev, next) {
      if (!mounted) return;
      if (next.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.error!),
            backgroundColor: AppColors.statusError,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      if (next.isSuccess) {
        ref.read(createItineraryProvider.notifier).reset();
        context.push(AppRoutes.addPlaces, extra: next.createdId);
      }
    });

    final isLoading = ref.watch(createItineraryProvider).isLoading;

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Tạo lịch trình',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
      ),
      body: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: const EdgeInsets.all(AppSpacing.layoutMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Step indicator ──
            _StepIndicator(currentStep: 1, totalSteps: 3),

            const SizedBox(height: AppSpacing.layoutMd),

            // ── Tên lịch trình ──
            _SectionLabel('Tên lịch trình *'),
            const SizedBox(height: AppSpacing.space3),
            TextField(
              controller: _nameController,
              onChanged: (_) => setState(() {}),
              maxLength: 60,
              decoration: InputDecoration(
                hintText: 'VD: 3 ngày Đà Nẵng - Hội An',
                hintStyle: AppTextStyles.bodyMd.copyWith(
                  color: AppColors.textPlaceholder,
                ),
                filled: true,
                fillColor: AppColors.backgroundSecondary,
                border: OutlineInputBorder(
                  borderRadius: AppRadius.inputBorder,
                  borderSide: BorderSide(color: AppColors.borderDefault),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: AppRadius.inputBorder,
                  borderSide: BorderSide(color: AppColors.borderDefault),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: AppRadius.inputBorder,
                  borderSide: BorderSide(
                    color: AppColors.borderFocus,
                    width: 1.5,
                  ),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.space4,
                  vertical: AppSpacing.space3,
                ),
              ),
              style: AppTextStyles.bodyMd.copyWith(
                color: AppColors.textPrimary,
              ),
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            // ── Ngày đi ──
            _SectionLabel('Ngày đi *'),
            const SizedBox(height: AppSpacing.space3),
            InkWell(
              onTap: _pickDateRange,
              borderRadius: AppRadius.inputBorder,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.space4),
                decoration: BoxDecoration(
                  color: AppColors.backgroundSecondary,
                  borderRadius: AppRadius.inputBorder,
                  border: Border.all(
                    color: _dateRange != null
                        ? AppColors.actionPrimary
                        : AppColors.borderDefault,
                    width: _dateRange != null ? 1.5 : 1.0,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.calendar_today_rounded,
                      size: 18,
                      color: _dateRange != null
                          ? AppColors.actionPrimary
                          : AppColors.textSecondary,
                    ),
                    const SizedBox(width: AppSpacing.space3),
                    Expanded(
                      child: Text(
                        _dateRangeText,
                        style: AppTextStyles.bodyMd.copyWith(
                          color: _dateRange != null
                              ? AppColors.textPrimary
                              : AppColors.textPlaceholder,
                        ),
                      ),
                    ),
                    Icon(
                      Icons.chevron_right_rounded,
                      color: AppColors.textSecondary,
                      size: 20,
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            // ── Đi cùng ai ──
            _SectionLabel('Đi cùng ai?'),
            const SizedBox(height: AppSpacing.space3),
            Row(
              children: _companions.map((c) {
                final (emoji, label) = c;
                final isSelected = _companion == label;
                return Expanded(
                  child: GestureDetector(
                    onTap: () =>
                        setState(() => _companion = isSelected ? null : label),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      margin: const EdgeInsets.only(right: AppSpacing.space2),
                      padding: const EdgeInsets.symmetric(
                        vertical: AppSpacing.space3,
                      ),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.actionPrimary.withValues(alpha: 0.1)
                            : AppColors.backgroundSecondary,
                        borderRadius: AppRadius.cardBorder,
                        border: Border.all(
                          color: isSelected
                              ? AppColors.actionPrimary
                              : AppColors.borderDefault,
                          width: isSelected ? 1.5 : 1.0,
                        ),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(emoji, style: const TextStyle(fontSize: 22)),
                          const SizedBox(height: 4),
                          Text(
                            label,
                            style: AppTextStyles.caption.copyWith(
                              color: isSelected
                                  ? AppColors.actionPrimary
                                  : AppColors.textSecondary,
                              fontWeight: FontWeight.w500,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: AppSpacing.layoutSm),

            // ── Ngân sách ──
            _SectionLabel('Ngân sách'),
            const SizedBox(height: AppSpacing.space3),
            ...(_budgets.map((b) {
              final (emoji, label, sub) = b;
              final isSelected = _budget == label;
              return GestureDetector(
                onTap: () =>
                    setState(() => _budget = isSelected ? null : label),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  margin: const EdgeInsets.only(bottom: AppSpacing.space2),
                  padding: const EdgeInsets.all(AppSpacing.space4),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.actionPrimary.withValues(alpha: 0.08)
                        : AppColors.backgroundSecondary,
                    borderRadius: AppRadius.cardBorder,
                    border: Border.all(
                      color: isSelected
                          ? AppColors.actionPrimary
                          : AppColors.borderDefault,
                      width: isSelected ? 1.5 : 1.0,
                    ),
                  ),
                  child: Row(
                    children: [
                      Text(emoji, style: const TextStyle(fontSize: 20)),
                      const SizedBox(width: AppSpacing.space3),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              label,
                              style: AppTextStyles.bodyMd.copyWith(
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            Text(
                              sub,
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (isSelected)
                        Icon(
                          Icons.check_circle_rounded,
                          color: AppColors.actionPrimary,
                          size: 20,
                        ),
                    ],
                  ),
                ),
              );
            })),

            const SizedBox(height: AppSpacing.layoutSm),

            // ── Visibility ──
            _SectionLabel('Chia sẻ lịch trình'),
            const SizedBox(height: AppSpacing.space3),
            _VisibilitySelector(
              value: _visibility,
              onChanged: (v) => setState(() => _visibility = v),
            ),

            const SizedBox(height: AppSpacing.layoutXl),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.layoutMd,
            0,
            AppSpacing.layoutMd,
            AppSpacing.layoutSm,
          ),
          child: AppButton(
            label: 'Tiếp tục →',
            onPressed: (_canProceed && !isLoading) ? _onCreate : null,
            isLoading: isLoading,
          ),
        ),
      ),
    );
  }
}

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.currentStep, required this.totalSteps});
  final int currentStep;
  final int totalSteps;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Bước $currentStep / $totalSteps',
          style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.space2),
        Row(
          children: List.generate(totalSteps, (i) {
            final isActive = i < currentStep;
            return Expanded(
              child: Container(
                height: 4,
                margin: EdgeInsets.only(right: i < totalSteps - 1 ? 4 : 0),
                decoration: BoxDecoration(
                  color: isActive
                      ? AppColors.actionPrimary
                      : SagePalette.sage200,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            );
          }),
        ),
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: AppTextStyles.h4.copyWith(
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    ),
  );
}

class _VisibilitySelector extends StatelessWidget {
  const _VisibilitySelector({required this.value, required this.onChanged});
  final String value;
  final ValueChanged<String> onChanged;

  static const _options = [
    (
      value: 'private',
      icon: Icons.lock_rounded,
      label: 'Riêng tư',
      sub: 'Chỉ bạn thấy',
    ),
    (
      value: 'friends',
      icon: Icons.people_rounded,
      label: 'Bạn bè',
      sub: 'Chia sẻ với người theo dõi',
    ),
    (
      value: 'public',
      icon: Icons.public_rounded,
      label: 'Công khai',
      sub: 'Mọi người đều thấy',
    ),
  ];

  @override
  Widget build(BuildContext context) => Column(
    children: _options.map((opt) {
      final isSelected = value == opt.value;
      return GestureDetector(
        onTap: () => onChanged(opt.value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          margin: const EdgeInsets.only(bottom: AppSpacing.space2),
          padding: const EdgeInsets.all(AppSpacing.space4),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.actionPrimary.withValues(alpha: 0.08)
                : AppColors.backgroundSecondary,
            borderRadius: AppRadius.cardBorder,
            border: Border.all(
              color: isSelected
                  ? AppColors.actionPrimary
                  : AppColors.borderDefault,
              width: isSelected ? 1.5 : 1.0,
            ),
          ),
          child: Row(
            children: [
              Icon(
                opt.icon,
                color: isSelected
                    ? AppColors.actionPrimary
                    : AppColors.textSecondary,
                size: 22,
              ),
              const SizedBox(width: AppSpacing.space3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      opt.label,
                      style: AppTextStyles.bodyMd.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      opt.sub,
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                Icon(
                  Icons.check_circle_rounded,
                  color: AppColors.actionPrimary,
                  size: 20,
                ),
            ],
          ),
        ),
      );
    }).toList(),
  );
}

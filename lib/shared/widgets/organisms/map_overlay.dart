import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';
import '../../../core/theme/tokens/app_shadows.dart';
import '../../../core/theme/tokens/app_borders.dart';
import 'category_filter_row.dart';

/// ═══════════════════════════════════════════════════════
/// C-25: MapOverlay
/// Floating elements on top of Google Maps
/// Top: location chip + CategoryFilterRow
/// Bottom-right: my location FAB
/// ═══════════════════════════════════════════════════════

class MapOverlay extends StatelessWidget {
  const MapOverlay({
    super.key,
    required this.selectedCategories,
    required this.onCategoryToggled,
    this.locationLabel = 'Đà Nẵng & Hội An',
    this.onMyLocationTap,
    this.onLocationChipTap,
  });

  /// Các category đang được chọn
  final Set<String> selectedCategories;

  /// Callback khi toggle category filter
  final ValueChanged<String> onCategoryToggled;

  /// Label vị trí hiện tại
  final String locationLabel;

  /// Callback khi tap nút "Vị trí của tôi"
  final VoidCallback? onMyLocationTap;

  /// Callback khi tap location chip
  final VoidCallback? onLocationChipTap;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // ── Top floating elements ──
        Positioned(
          top: MediaQuery.of(context).padding.top + AppSpacing.space2,
          left: 0,
          right: 0,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Location chip
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.layoutSm,
                ),
                child: GestureDetector(
                  onTap: onLocationChipTap,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.space3,
                      vertical: AppSpacing.space2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.backgroundSecondary.withValues(alpha: 0.95),
                      borderRadius: AppRadius.chipBorder,
                      boxShadow: AppShadows.sm,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.location_on_rounded,
                          size: 16,
                          color: AppColors.actionSecondary,
                        ),
                        const SizedBox(width: AppSpacing.space1),
                        Text(
                          locationLabel,
                          style: AppTextStyles.bodySm.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.space2),

              // Category filter row
              CategoryFilterRow(
                selectedCategories: selectedCategories,
                onCategoryToggled: onCategoryToggled,
              ),
            ],
          ),
        ),

        // ── My location FAB (bottom-right) ──
        if (onMyLocationTap != null)
          Positioned(
            bottom: AppSpacing.layoutMd,
            right: AppSpacing.layoutSm,
            child: GestureDetector(
              onTap: onMyLocationTap,
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.backgroundCard,
                  shape: BoxShape.circle,
                  boxShadow: AppShadows.md,
                ),
                child: const Icon(
                  Icons.my_location_rounded,
                  size: 22,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

import 'package:flutter/material.dart';

import '../../../core/theme/tokens/app_colors.dart';
import '../../../core/theme/tokens/app_typography.dart';
import '../../../core/theme/tokens/app_spacing.dart';

/// ChatBubble — Hiển thị tin nhắn trong AI Chat
///
/// [isUser] = true → bubble bên phải (màu primary)
/// [isUser] = false → bubble bên trái (màu card, icon AI)
class ChatBubble extends StatelessWidget {
  const ChatBubble({
    super.key,
    required this.message,
    required this.isUser,
    this.isLoading = false,
    this.timestamp,
  });

  /// Nội dung tin nhắn
  final String message;

  /// True nếu là tin nhắn của user, false nếu là AI
  final bool isUser;

  /// Hiển thị loading dots thay vì message (khi AI đang trả lời)
  final bool isLoading;

  /// Thời gian gửi
  final DateTime? timestamp;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: isUser ? 48 : 0,
        right: isUser ? 0 : 48,
        bottom: AppSpacing.space2,
      ),
      child: Row(
        mainAxisAlignment: isUser
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // AI Avatar
          if (!isUser) ...[
            _AiAvatar(),
            const SizedBox(width: AppSpacing.space2),
          ],

          // Bubble
          Flexible(
            child: Column(
              crossAxisAlignment: isUser
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.space4,
                    vertical: AppSpacing.space3,
                  ),
                  decoration: BoxDecoration(
                    color: isUser
                        ? AppColors.actionPrimary
                        : AppColors.backgroundCard,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isUser ? 16 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 16),
                    ),
                    border: isUser
                        ? null
                        : Border.all(color: AppColors.borderDefault),
                  ),
                  child: isLoading
                      ? const _LoadingDots()
                      : Text(
                          message,
                          style: AppTextStyles.bodyMd.copyWith(
                            color: isUser
                                ? Colors.white
                                : AppColors.textPrimary,
                            height: 1.5,
                          ),
                        ),
                ),
                if (timestamp != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    _formatTime(timestamp!),
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),

          // User Avatar placeholder
          if (isUser) ...[
            const SizedBox(width: AppSpacing.space2),
            _UserAvatar(),
          ],
        ],
      ),
    );
  }

  String _formatTime(DateTime dt) =>
      '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
}

class _AiAvatar extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    width: 28,
    height: 28,
    decoration: BoxDecoration(
      color: AppColors.actionPrimary.withValues(alpha: 0.15),
      shape: BoxShape.circle,
    ),
    child: const Center(child: Text('🤖', style: TextStyle(fontSize: 14))),
  );
}

class _UserAvatar extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    width: 28,
    height: 28,
    decoration: const BoxDecoration(
      color: AppColors.actionPrimary,
      shape: BoxShape.circle,
    ),
    child: const Icon(Icons.person_rounded, color: Colors.white, size: 16),
  );
}

/// Hiển thị 3 chấm nhảy khi AI đang xử lý
class _LoadingDots extends StatefulWidget {
  const _LoadingDots();

  @override
  State<_LoadingDots> createState() => _LoadingDotsState();
}

class _LoadingDotsState extends State<_LoadingDots>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _controller,
    builder: (ctx, child) {
      final phase = (_controller.value * 3).floor();
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(3, (i) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: i == phase
                    ? AppColors.textPrimary
                    : AppColors.textSecondary,
                shape: BoxShape.circle,
              ),
            ),
          );
        }),
      );
    },
  );
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../providers/ai_providers.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-31: AIChatScreen
/// Full-screen chat UI: message bubbles + suggestion chips + input bar
/// ═══════════════════════════════════════════════════════

class AIChatScreen extends ConsumerStatefulWidget {
  const AIChatScreen({super.key, this.initialPrompt});
  final String? initialPrompt;

  @override
  ConsumerState<AIChatScreen> createState() => _AIChatScreenState();
}

class _AIChatScreenState extends ConsumerState<AIChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  static const _suggestions = [
    '🗺 Lên lịch 3 ngày Đà Nẵng',
    '🏖 Bãi biển đẹp nhất',
    '🍜 Đặc sản phải thử',
    '💰 Du lịch tiết kiệm',
    '🚗 Thuê xe tự lái',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.initialPrompt != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _sendMessage(widget.initialPrompt!);
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage(String text) async {
    if (text.trim().isEmpty) return;
    _controller.clear();
    await ref.read(aiChatProvider.notifier).sendMessage(text);
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final chatState = ref.watch(aiChatProvider);
    final messages = chatState.messages;
    final isTyping = chatState.isTyping;

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.actionPrimary, AppColors.actionSecondary],
                ),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.smart_toy_rounded, color: Colors.white, size: 20),
            ),
            const SizedBox(width: AppSpacing.space2),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('AI Du lịch', style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700)),
                Row(
                  children: [
                    Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppColors.statusSuccess, shape: BoxShape.circle)),
                    const SizedBox(width: 4),
                    Text('Trực tuyến', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                  ],
                ),
              ],
            ),
          ],
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded),
            tooltip: 'Xóa lịch sử',
            onPressed: () => ref.read(aiChatProvider.notifier).clearChat(),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Messages list ──
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(AppSpacing.layoutSm),
              itemCount: messages.length + (isTyping ? 1 : 0),
              itemBuilder: (_, i) {
                if (isTyping && i == messages.length) {
                  return const _TypingIndicator();
                }
                return _MessageBubble(message: messages[i]);
              },
            ),
          ),

          // ── Suggestion chips (shown when last message is AI) ──
          if (!isTyping && (messages.isEmpty || !messages.last.isUser))
            SizedBox(
              height: 44,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutSm),
                itemCount: _suggestions.length,
                itemBuilder: (_, i) => GestureDetector(
                  onTap: () => _sendMessage(_suggestions[i]),
                  child: Container(
                    margin: const EdgeInsets.only(right: AppSpacing.space2),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.actionPrimary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.actionPrimary.withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      _suggestions[i],
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.actionPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              ),
            ),

          const SizedBox(height: AppSpacing.space2),

          // ── Input bar ──
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.layoutSm, 0, AppSpacing.layoutSm, AppSpacing.space2),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppColors.backgroundSecondary,
                        borderRadius: AppRadius.chipBorder,
                        border: Border.all(color: AppColors.borderDefault),
                      ),
                      child: TextField(
                        controller: _controller,
                        maxLines: 4,
                        minLines: 1,
                        onSubmitted: _sendMessage,
                        decoration: InputDecoration(
                          hintText: 'Hỏi về địa điểm, lịch trình...',
                          hintStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.textPlaceholder),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.space3, vertical: AppSpacing.space3),
                        ),
                        style: AppTextStyles.bodyMd.copyWith(color: AppColors.textPrimary),
                        textInputAction: TextInputAction.send,
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.space2),
                  GestureDetector(
                    onTap: () => _sendMessage(_controller.text),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.actionPrimary,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});
  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.space3),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            Container(
              width: 28, height: 28,
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: [AppColors.actionPrimary, AppColors.actionSecondary]),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.smart_toy_rounded, color: Colors.white, size: 14),
            ),
            const SizedBox(width: AppSpacing.space2),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(AppSpacing.space3),
              decoration: BoxDecoration(
                color: isUser ? AppColors.actionPrimary : AppColors.backgroundCard,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isUser ? 16 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 16),
                ),
                border: isUser ? null : Border.all(color: AppColors.borderDefault),
              ),
              child: Text(
                message.text,
                style: AppTextStyles.bodyMd.copyWith(
                  color: isUser ? AppColors.textOnPrimary : AppColors.textPrimary,
                  height: 1.5,
                ),
              ),
            ),
          ),
          if (isUser) const SizedBox(width: AppSpacing.space2),
        ],
      ),
    );
  }
}

class _TypingIndicator extends StatelessWidget {
  const _TypingIndicator();

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.space3),
        child: Row(
          children: [
            Container(
              width: 28, height: 28,
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: [AppColors.actionPrimary, AppColors.actionSecondary]),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.smart_toy_rounded, color: Colors.white, size: 14),
            ),
            const SizedBox(width: AppSpacing.space2),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.backgroundCard,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                  bottomLeft: Radius.circular(4),
                ),
                border: Border.all(color: AppColors.borderDefault),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: List.generate(3, (i) => _Dot(delay: i * 200)),
              ),
            ),
          ],
        ),
      );
}

class _Dot extends StatefulWidget {
  const _Dot({required this.delay});
  final int delay;

  @override
  State<_Dot> createState() => _DotState();
}

class _DotState extends State<_Dot> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    Future.delayed(Duration(milliseconds: widget.delay), () {
      if (mounted) _ctrl.repeat(reverse: true);
    });
    _anim = Tween(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2),
        child: FadeTransition(
          opacity: _anim,
          child: Container(
            width: 7, height: 7,
            decoration: BoxDecoration(
              color: SagePalette.sage400,
              shape: BoxShape.circle,
            ),
          ),
        ),
      );
}

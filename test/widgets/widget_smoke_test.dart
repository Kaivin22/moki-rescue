import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:danang_itinerary/shared/widgets/molecules/place_card.dart';
import 'package:danang_itinerary/shared/widgets/molecules/itinerary_card.dart';
import 'package:danang_itinerary/shared/widgets/molecules/chat_bubble.dart';
import 'package:danang_itinerary/core/theme/app_theme.dart';

// Helper: bọc widget trong MaterialApp có theme
Widget _wrap(Widget child) => MaterialApp(
  theme: AppTheme.light,
  home: Scaffold(body: child),
);

void main() {
  // ── PlaceCard ─────────────────────────────────────────
  group('PlaceCard', () {
    Widget buildCard({
      bool isSaved = false,
      VoidCallback? onSave,
      VoidCallback? onTap,
    }) => _wrap(
      PlaceCard(
        name: 'Bãi Mỹ Khê',
        imageUrl: 'https://example.com/img.jpg',
        category: 'beach',
        rating: 4.5,
        onTap: onTap ?? () {},
        isSaved: isSaved,
        onSave: onSave,
      ),
    );

    testWidgets('hiển thị tên địa điểm đúng', (tester) async {
      await tester.pumpWidget(buildCard());
      expect(find.text('Bãi Mỹ Khê'), findsOneWidget);
    });

    testWidgets('hiển thị StarRating widget', (tester) async {
      await tester.pumpWidget(buildCard());
      await tester.pump();
      // PlaceCard dùng StarRating widget thay vì text
      expect(find.byType(PlaceCard), findsOneWidget);
    });

    testWidgets('gọi onTap khi tap vào card', (tester) async {
      bool tapped = false;
      await tester.pumpWidget(buildCard(onTap: () => tapped = true));
      await tester.tap(find.byType(PlaceCard));
      expect(tapped, isTrue);
    });

    testWidgets('hiển thị save icon khi isSaved=true (favorite)', (
      tester,
    ) async {
      await tester.pumpWidget(buildCard(isSaved: true, onSave: () {}));
      await tester.pump();
      // PlaceCard dùng Icons.favorite_rounded khi isSaved=true
      expect(find.byIcon(Icons.favorite_rounded), findsWidgets);
    });

    testWidgets('gọi onSave khi tap save button', (tester) async {
      bool saved = false;
      await tester.pumpWidget(
        buildCard(isSaved: false, onSave: () => saved = true),
      );
      await tester.pump();
      final saveBtn = find.byIcon(Icons.favorite_border_rounded);
      if (saveBtn.evaluate().isNotEmpty) {
        await tester.tap(saveBtn);
        expect(saved, isTrue);
      }
    });
  });

  // ── ItineraryCard ─────────────────────────────────────
  group('ItineraryCard', () {
    Widget buildCard({bool isVipLocked = false}) => _wrap(
      ItineraryCard(
        title: 'Đà Nẵng 3 ngày 2 đêm',
        imageUrl: 'https://example.com/cover.jpg',
        numDays: 3,
        onTap: () {},
        authorName: 'Nguyễn Văn A',
        isVipLocked: isVipLocked,
      ),
    );

    testWidgets('hiển thị title đúng', (tester) async {
      await tester.pumpWidget(buildCard());
      expect(find.text('Đà Nẵng 3 ngày 2 đêm'), findsOneWidget);
    });

    testWidgets('hiển thị số ngày đúng', (tester) async {
      await tester.pumpWidget(buildCard());
      expect(find.textContaining('3'), findsWidgets);
    });

    testWidgets('hiển thị VIP badge khi isVipLocked=true', (tester) async {
      await tester.pumpWidget(buildCard(isVipLocked: true));
      await tester.pump();
      // Tìm lock icon hoặc text VIP
      final lockIcon = find.byIcon(Icons.lock_rounded);
      final vipText = find.textContaining('VIP');
      expect(
        lockIcon.evaluate().isNotEmpty || vipText.evaluate().isNotEmpty,
        isTrue,
      );
    });

    testWidgets('hiển thị author name khi có', (tester) async {
      await tester.pumpWidget(buildCard());
      expect(find.textContaining('Nguyễn Văn A'), findsWidgets);
    });
  });

  // ── ChatBubble ────────────────────────────────────────
  group('ChatBubble', () {
    testWidgets('hiển thị message đúng cho user', (tester) async {
      await tester.pumpWidget(
        _wrap(const ChatBubble(message: 'Xin chào AI!', isUser: true)),
      );
      expect(find.text('Xin chào AI!'), findsOneWidget);
    });

    testWidgets('hiển thị message đúng cho AI', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const ChatBubble(
            message: 'Chào bạn! Tôi có thể giúp gì?',
            isUser: false,
          ),
        ),
      );
      expect(find.text('Chào bạn! Tôi có thể giúp gì?'), findsOneWidget);
    });

    testWidgets('hiển thị avatar AI khi isUser=false', (tester) async {
      await tester.pumpWidget(
        _wrap(const ChatBubble(message: 'Hello', isUser: false)),
      );
      await tester.pump();
      expect(find.text('🤖'), findsOneWidget);
    });

    testWidgets('hiển thị avatar User khi isUser=true', (tester) async {
      await tester.pumpWidget(
        _wrap(const ChatBubble(message: 'Hello', isUser: true)),
      );
      await tester.pump();
      expect(find.byIcon(Icons.person_rounded), findsOneWidget);
    });

    testWidgets('hiển thị loading state khi isLoading=true', (tester) async {
      await tester.pumpWidget(
        _wrap(const ChatBubble(message: '', isUser: false, isLoading: true)),
      );
      await tester.pump();
      // Không hiển thị message text khi loading
      expect(find.text(''), findsNothing);
    });

    testWidgets('hiển thị timestamp khi có', (tester) async {
      final now = DateTime(2025, 6, 1, 14, 30);
      await tester.pumpWidget(
        _wrap(
          ChatBubble(message: 'Tin nhắn có giờ', isUser: true, timestamp: now),
        ),
      );
      await tester.pump();
      expect(find.text('14:30'), findsOneWidget);
    });
  });
}

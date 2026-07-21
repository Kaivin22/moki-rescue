import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:danang_itinerary/core/theme/app_theme.dart';

/// Smoke test cho app shell — không cần Supabase init.
/// Integration test thực sự sẽ được chạy trên thiết bị thật.
void main() {
  testWidgets('AppTheme render MaterialApp không crash', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: Center(child: Text('DaNang Itinerary')),
        ),
      ),
    );
    expect(find.byType(MaterialApp), findsOneWidget);
    expect(find.text('DaNang Itinerary'), findsOneWidget);
  });

  testWidgets('Scaffold với theme không crash', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          appBar: AppBar(title: const Text('Test')),
          body: const Center(child: CircularProgressIndicator()),
        ),
      ),
    );
    expect(find.byType(AppBar), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
